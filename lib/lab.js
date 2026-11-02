// lib/lab.js — Laboratório de Criativos: campeões, banco de imagens, testes (criativos feitos no Estúdio)
// e elementos (ícones/selos em PNG que o Estúdio cola por cima da foto, ex.: o ícone oficial do WhatsApp)
// Arquivos ficam no próprio Postgres (bytea): sobrevivem a deploy e são poucos (centenas de JPGs).
const db = require('../db');
const T = require('./time');
const settings = require('./settings');
const metrics = require('./metrics');

const KINDS = ['campeao', 'imagem', 'teste', 'elemento'];
const RATINGS = ['bom', 'ok', 'ruim'];
const SUBS = { imagem: ['campeoes', 'banco'] };
const STATUS = ['pronto', 'testando', 'campeao', 'morreu'];
const PREFIX = { campeao: 'CP', imagem: 'IMG', teste: 'LAB', elemento: 'EL' };
const code = it => `${PREFIX[it.kind] || 'X'}-${String(it.id).padStart(3, '0')}`;
const r2 = v => Math.round((v || 0) * 100) / 100;
const bad = msg => Object.assign(new Error(msg), { status: 400 });

const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
function fileName(it, variant) { const n = it.title || it.headline; return `${code(it)}${n ? '_' + slug(n) : ''}_${variant}.jpg`; }

// "data:image/jpeg;base64,...." → { mime, buf }
function decode(data) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/s.exec(String(data || ''));
  if (!m) throw bad('Arquivo inválido (precisa ser JPG, PNG ou WEBP)');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 6 * 1024 * 1024) throw bad('Imagem grande demais (máx. 6 MB)');
  return { mime: m[1], buf };
}

const FIELDS = ['title', 'headline', 'term', 'period_note', 'good_from', 'good_to', 'notes', 'tags', 'status', 'rank', 'sub', 'params', 'source_id', 'used', 'live', 'rating', 'rating_tags', 'rating_note', 'star'];
function clean(b) {
  const o = {};
  for (const k of FIELDS) if (b[k] !== undefined) o[k] = b[k];
  if (o.status && !STATUS.includes(o.status)) throw bad('Situação inválida');
  if (o.tags !== undefined) o.tags = (Array.isArray(o.tags) ? o.tags : String(o.tags || '').split(',')).map(s => String(s).trim().toLowerCase()).filter(Boolean).slice(0, 30);
  for (const d of ['good_from', 'good_to']) if (o[d] !== undefined) o[d] = T.isDay(o[d]) ? o[d] : null;
  if (o.rank !== undefined) o.rank = Number(o.rank) > 0 ? Math.round(Number(o.rank)) : null;
  if (o.source_id !== undefined) o.source_id = Number(o.source_id) > 0 ? Number(o.source_id) : null;
  if (o.used !== undefined) o.used = !!o.used;
  if (o.rating !== undefined) o.rating = RATINGS.includes(o.rating) ? o.rating : null;
  if (o.rating_tags !== undefined) o.rating_tags = (Array.isArray(o.rating_tags) ? o.rating_tags : []).map(s => String(s).trim().toLowerCase().slice(0, 40)).filter(Boolean).slice(0, 12);
  if (o.star !== undefined) o.star = o.star === true || o.star === 'true';
  if (o.live !== undefined) o.live = o.live === true || o.live === 'true' || o.live === 'on';
  for (const k of ['title', 'headline', 'term', 'period_note', 'notes', 'rating_note']) if (o[k] !== undefined) o[k] = o[k] == null ? null : String(o[k]).slice(0, 500);
  return o;
}

async function saveFiles(id, files) {
  for (const f of files || []) {
    const v = String(f.variant || 'orig');
    if (!['1x1', '9x16', 'orig'].includes(v)) throw bad('Formato inválido');
    const { mime, buf } = decode(f.data);
    await db.query(`INSERT INTO lab_files (item_id, variant, mime, bytes, size) VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (item_id, variant) DO UPDATE SET mime = EXCLUDED.mime, bytes = EXCLUDED.bytes, size = EXCLUDED.size, created_at = NOW()`,
      [id, v, mime, buf, buf.length]);
  }
}

async function create(b, by) {
  const kind = b.kind;
  if (!KINDS.includes(kind)) throw bad('Tipo inválido');
  if (!b.files || !b.files.length) throw bad('Falta a imagem');
  const o = clean(b);
  if (kind === 'imagem' && !(SUBS.imagem.includes(o.sub))) o.sub = 'banco';
  if (kind === 'teste' && !o.status) o.status = 'pronto';
  const { rows } = await db.query(`INSERT INTO lab_items (kind, sub, title, headline, term, period_note, good_from, good_to, notes, tags, status, rank, params, source_id, added_by, live)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
    [kind, o.sub || null, o.title || null, o.headline || null, o.term || null, o.period_note || null, o.good_from || null, o.good_to || null, o.notes || null,
      o.tags || [], o.status || null, o.rank || null, o.params || null, o.source_id || null, by === 'claude' ? 'claude' : 'dono', !!o.live]);
  await saveFiles(rows[0].id, b.files);
  if (kind === 'teste' && o.source_id) await db.query('UPDATE lab_items SET used = true WHERE id = $1 AND kind = $2', [o.source_id, 'imagem']);
  return { ...rows[0], code: code(rows[0]) };
}

async function update(id, b) {
  const o = clean(b);
  const keys = Object.keys(o);
  if (keys.length) {
    await db.query(`UPDATE lab_items SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')}, updated_at = NOW() WHERE id = $1`, [id, ...keys.map(k => o[k])]);
  }
  if (b.files && b.files.length) await saveFiles(id, b.files);
  const { rows } = await db.query('SELECT * FROM lab_items WHERE id = $1', [id]);
  if (!rows[0]) throw bad('Não encontrado');
  return rows[0];
}

async function remove(id) {
  const { rows } = await db.query('SELECT * FROM lab_items WHERE id = $1', [id]);
  const it = rows[0];
  if (it && it.rating) {
    const src = it.source_id ? (await db.query('SELECT id, kind FROM lab_items WHERE id = $1', [it.source_id])).rows[0] : null;
    await db.query(`INSERT INTO lab_rating_log (item_code, kind, rating, rating_tags, rating_note, headline, tags, params, source_code) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [code(it), it.kind, it.rating, it.rating_tags || [], it.rating_note, it.headline, it.tags || [], it.params, src ? code(src) : null]);
  }
  await db.query('DELETE FROM lab_items WHERE id = $1', [id]);
}

async function file(id, variant) {
  const { rows } = await db.query(`SELECT f.mime, f.bytes, i.* FROM lab_files f JOIN lab_items i ON i.id = f.item_id WHERE f.item_id = $1 AND f.variant = $2`, [id, variant]);
  return rows[0] || null;
}

// resultado no Face de cada criativo de teste: anúncios cujo NOME contém o código (ex.: "LAB-012 Eliene")
async function results(items, days = 60) {
  const tests = items.filter(i => i.kind === 'campeao' || i.kind === 'teste');
  if (!tests.length) return {};
  const to = T.today(), from = T.addDays(to, -(days - 1));
  const ads = await metrics.objectRows('ad', from, to, { all: true });
  const tg = await settings.get('targets');
  const tax = tg.tax_pct / 100;
  const ids = ads.map(a => a.id);
  const series = ids.length ? await metrics.objectSeries('ad', ids, from, to) : {};
  const out = {};
  const cfg = await rules();
  for (const it of tests) {
    const c = code(it).toLowerCase();
    const re = new RegExp(`\\b${c}\\b`, 'i');
    const mine = ads.filter(a => re.test(a.name || ''));
    if (!mine.length) continue;
    const s = { ads: mine.length, active: mine.some(a => a.status === 'ACTIVE'), spend: 0, impressions: 0, clicks: 0, sales: 0, revenue: 0, fb_purchases: 0, first: null, last: null, days: {} };
    for (const a of mine) {
      for (const f of ['spend', 'impressions', 'clicks', 'sales', 'revenue', 'fb_purchases']) s[f] += a[f] || 0;
      for (const x of series[a.id] || []) {
        if (!(x.spend > 0)) continue;
        if (!s.first || x.day < s.first) s.first = x.day;
        if (!s.last || x.day > s.last) s.last = x.day;
        const d = s.days[x.day] || (s.days[x.day] = { spend: 0, sales: 0, revenue: 0 });
        d.spend += x.spend; d.sales += x.sales || 0; d.revenue += x.revenue || 0;
      }
    }
    s.days_on = s.first ? T.daysBetween(s.first, s.last || s.first) + 1 : 0;
    s.ctr = r2(metrics.div(s.clicks, s.impressions) * 100);
    s.cpa = s.sales ? r2(s.spend / s.sales) : null;
    s.roi = s.spend ? r2(metrics.div(s.revenue, s.spend * (1 + tax))) : null;
    for (const f of ['spend', 'revenue']) s[f] = r2(s[f]);
    s.series = Object.keys(s.days).sort().map(d => ({ day: d, spend: r2(s.days[d].spend), sales: s.days[d].sales, roi: r2(metrics.div(s.days[d].revenue, s.days[d].spend * (1 + tax))) }));
    delete s.days;
    // veredito (regra do teste): 3 dias no ar
    s.verdict = !s.spend ? null
      : s.spend >= cfg.kill_spend && s.sales === 0 ? 'morreu'
      : s.days_on >= cfg.min_days && s.roi >= cfg.win_roi && s.cpa != null && s.cpa <= cfg.win_cpa ? 'campeao'
      : 'testando';
    out[it.id] = s;
  }
  return out;
}

const DEF_RULES = { min_days: 3, win_roi: 1.3, win_cpa: 15, kill_spend: 45, weekly_images: 10 };
async function rules() { return { ...DEF_RULES, ...((await settings.get('lab_rules').catch(() => null)) || {}) }; }

// lista tudo (sem os bytes) + resultado dos testes; promove sozinho o teste que bateu a regra
async function list() {
  const { rows } = await db.query(`SELECT i.*, COALESCE(json_agg(json_build_object('variant', f.variant, 'size', f.size)) FILTER (WHERE f.item_id IS NOT NULL), '[]') AS files
    FROM lab_items i LEFT JOIN lab_files f ON f.item_id = i.id GROUP BY i.id ORDER BY i.created_at DESC`);
  const res = await results(rows);
  for (const it of rows) {
    it.code = code(it);
    it.result = res[it.id] || null;
    if (it.kind === 'teste' && it.result) {
      const v = it.result.verdict;
      // passou na regra → vira campeão (data de quando começou a ir bem); quem decide "morreu" é o dono/Claude
      if (v === 'campeao' && it.status !== 'campeao' && it.status !== 'morreu') {
        await db.query(`UPDATE lab_items SET status = 'campeao', good_from = COALESCE(good_from, $2), updated_at = NOW() WHERE id = $1`, [it.id, it.result.first]);
        it.status = 'campeao'; it.good_from = it.good_from || it.result.first;
      } else if (it.status === 'pronto') {
        await db.query(`UPDATE lab_items SET status = 'testando', updated_at = NOW() WHERE id = $1`, [it.id]);
        it.status = 'testando';
      }
    }
  }
  // meta da semana: imagens novas que o dono subiu no banco (seg→dom)
  const wk = T.addDays(T.today(), -((new Date(T.today() + 'T12:00:00Z').getUTCDay() + 6) % 7));
  const week = rows.filter(i => i.kind === 'imagem' && i.added_by === 'dono' && new Date(i.created_at) >= new Date(wk + 'T03:00:00Z')).length;
  const log = (await db.query('SELECT * FROM lab_rating_log ORDER BY deleted_at DESC LIMIT 200')).rows;
  return { items: rows, rules: await rules(), week: { from: wk, owner_images: week }, rating_log: log };
}

module.exports = { list, create, update, remove, file, fileName, code, rules };
