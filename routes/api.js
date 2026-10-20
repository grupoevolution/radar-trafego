// routes/api.js — tudo que as telas do Radar (e o Claude) pedem
const express = require('express');
const db = require('../db');
const T = require('../lib/time');
const settings = require('../lib/settings');
const metrics = require('../lib/metrics');
const actions = require('../lib/actions');
const notify = require('../lib/notify');
const meta = require('../lib/meta');
const collector = require('../lib/collector');
const andromeda = require('../lib/andromeda');
const appdb = require('../appdb');
const { encrypt, safeEqual } = require('../lib/crypto');
const { COOKIE, sign, requireAdmin, requireClaude } = require('../lib/auth');
const reports = require('../lib/reports');

const router = express.Router();
const wrap = fn => (req, res) => fn(req, res).catch(err => {
  console.error('[api]', req.method, req.path, err.message);
  res.status(err.status || 400).json({ error: err.message });
});
const bad = msg => Object.assign(new Error(msg), { status: 400 });
const dayParam = (v, def) => (T.isDay(v) ? v : def);
const DEMO = () => process.env.DEMO_MODE === '1';

// ── login ────────────────────────────────────────────────────────────────
const tries = new Map();
router.post('/login', wrap(async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.ip;
  const t = tries.get(ip) || { n: 0, at: Date.now() };
  if (Date.now() - t.at > 15 * 60000) { t.n = 0; t.at = Date.now(); }
  if (t.n >= 10) throw bad('Muitas tentativas. Espere 15 minutos.');
  if (!process.env.ADMIN_PASSWORD || !safeEqual(req.body.password, process.env.ADMIN_PASSWORD)) {
    t.n++; tries.set(ip, t);
    throw bad('Senha incorreta');
  }
  tries.delete(ip);
  res.cookie(COOKIE, sign(), { httpOnly: true, sameSite: 'lax', secure: req.secure || req.headers['x-forwarded-proto'] === 'https', maxAge: 60 * 86400000 });
  res.json({ ok: true });
}));
router.post('/logout', (req, res) => { res.clearCookie(COOKIE); res.json({ ok: true }); });

// relatório do Claude entra com a chave dele (antes do requireAdmin geral)
router.get('/claude/snapshot', requireClaude, wrap(async (req, res) => {
  res.json(await reports.snapshot(dayParam(req.query.day, T.yesterday())));
}));
router.post('/reports', requireClaude, wrap(async (req, res) => {
  res.json(await reports.create(req.body));
}));
router.get('/claude/guide', requireClaude, (req, res) => res.type('text/plain').send(reports.GUIDE));

router.use(requireAdmin);

router.get('/me', wrap(async (req, res) => {
  const s = await settings.all();
  res.json({
    ok: true, demo: DEMO(), app_connected: appdb.enabled(), today: T.today(), now: T.parts(),
    targets: s.targets, guards: s.guards, vapid: notify.publicKey(), meta_version: meta.VERSION,
    demo_data: !!s.demo
  });
}));

// ── VISÃO GERAL ──────────────────────────────────────────────────────────
router.get('/overview', wrap(async (req, res) => {
  const today = T.today();
  const day = dayParam(req.query.day, today);
  const isToday = day === today;
  const hour = isToday ? T.parts().hour : 23;
  const [cur] = await metrics.daySeries(day, day);
  const prevDay = T.addDays(day, -1);
  const prev = isToday ? await metrics.dayUntil(prevDay, hour) : (await metrics.daySeries(prevDay, prevDay))[0];
  const hourly = await metrics.hourly(day);
  const camps = (await metrics.objectRows('campaign', day, day)).filter(c => c.spend > 0).sort((a, b) => (b.revenue - b.spend) - (a.revenue - a.spend));
  const { rows: alerts } = await db.query(`SELECT * FROM alerts WHERE created_at > NOW() - INTERVAL '36 hours' ORDER BY (severity='bad') DESC, created_at DESC LIMIT 6`);
  const { rows: accs } = await db.query(`
    SELECT a.id, a.name, a.account_status, a.is_reserve, b.name AS bm, COALESCE(f.spend,0)::float spend
    FROM ad_accounts a LEFT JOIN bms b ON b.id = a.bm_id
    LEFT JOIN fb_daily f ON f.level='account' AND f.object_id = a.id AND f.day = $1`, [day]);
  const byBm = {};
  for (const a of accs) byBm[a.bm || 'Sem BM'] = (byBm[a.bm || 'Sem BM'] || 0) + a.spend;
  const { rows: and } = await db.query('SELECT * FROM andromeda_log ORDER BY sent_at DESC LIMIT 1');
  const { rows: pend } = await db.query(`SELECT COUNT(*)::int n FROM actions WHERE status='pending'`);
  const { rows: sync } = await db.query(`SELECT * FROM sync_log ORDER BY created_at DESC LIMIT 1`);
  const s = await settings.all();
  res.json({
    day, is_today: isToday, hour, prev_label: isToday ? `ontem até ${hour}h` : 'dia anterior',
    cur, prev, hourly, top: camps.slice(0, 5),
    alerts, pending: pend[0].n,
    accounts: {
      running: accs.filter(a => a.account_status === 1 && !a.is_reserve).length,
      review: accs.filter(a => [3, 7, 8, 9].includes(a.account_status)).length,
      down: accs.filter(a => [2, 100, 101, 201, 202].includes(a.account_status)).length,
      reserve: accs.filter(a => a.is_reserve && a.account_status === 1).length,
      by_bm: Object.entries(byBm).map(([name, spend]) => ({ name, spend })).filter(x => x.spend > 0).sort((a, b) => b.spend - a.spend)
    },
    andromeda: and[0] || null, andromeda_on: !!(s.andromeda && s.andromeda.enabled),
    last_sync: sync[0] || null, targets: s.targets
  });
}));

// ── O QUE MUDOU ──────────────────────────────────────────────────────────
router.get('/diagnose', wrap(async (req, res) => {
  const b = dayParam(req.query.b, T.yesterday());
  const a = dayParam(req.query.a, T.addDays(b, -1));
  const [A] = await metrics.daySeries(a, a);
  const [B] = await metrics.daySeries(b, b);
  const parts = metrics.decompose(A, B);
  const from14 = T.addDays(b, -13);
  const series = await metrics.daySeries(from14, b);
  const { rows: notes } = await db.query(`SELECT id, to_char(day,'YYYY-MM-DD') AS day, title, detail, kind FROM notes WHERE day BETWEEN $1 AND $2 ORDER BY day DESC, id DESC`, [T.addDays(b, -30), T.today()]);
  const placements = await metrics.placements(b, b);
  res.json({ a, b, A, B, parts, verdict: verdict(A, B, parts), series, notes, placements });
}));

function verdict(A, B, parts) {
  const pct = (x, y) => (x ? (y - x) / x * 100 : 0);
  const p = v => `${v > 0 ? '+' : ''}${Math.round(v)}%`;
  const fmt = v => (Math.round(v * 10) / 10).toString().replace('.', ',') + '%';
  const up = B.roi >= A.roi;
  const sorted = [...parts].sort((x, y) => up ? y.effect - x.effect : x.effect - y.effect);
  const main = sorted[0];
  const roiTxt = `ROI foi de ${A.roi.toFixed(2).replace('.', ',')} para ${B.roi.toFixed(2).replace('.', ',')}`;
  if (!A.spend || !B.spend) return { tone: 'info', title: 'Sem gasto suficiente pra comparar esses dias', text: roiTxt };
  if (Math.abs(B.roi - A.roi) < 0.08) return { tone: 'good', title: 'Dias parecidos. Nada importante mudou.', text: roiTxt + '. Todos os elos ficaram perto do normal.' };
  const stage = [['Abriram conversa', A.chat_rate, B.chat_rate], ['Clicaram em comprar', A.checkout_rate, B.checkout_rate], ['Geraram Pix', A.pix_rate, B.pix_rate], ['Pagaram o Pix', A.pay_rate, B.pay_rate]]
    .map(([n, x, y]) => ({ n, x, y, d: pct(x, y) })).sort((s1, s2) => up ? s2.d - s1.d : s1.d - s2.d)[0];
  const face = ['CPM', 'CTR'].includes(main.name);
  let title, text;
  if (main.name === 'Conversão') {
    if (stage.n === 'Pagaram o Pix') {
      title = up ? 'Mais gente pagou o Pix.' : 'O Face entregou normal. A queda foi no pagamento do Pix.';
      text = `${roiTxt}. A mesma proporção de gente gerou Pix, mas ${fmt(B.pay_rate)} pagaram (antes ${fmt(A.pay_rate)}). ${up ? '' : 'Isso aponta pro checkout ou pro Pix, não pros anúncios.'}`;
    } else {
      title = up ? `Dentro do app foi melhor: "${stage.n.toLowerCase()}" subiu.` : `A queda foi dentro do app: menos gente ${stage.n === 'Abriram conversa' ? 'abriu conversa' : stage.n === 'Clicaram em comprar' ? 'clicou em comprar' : 'gerou Pix'}.`;
      text = `${roiTxt}. ${stage.n}: ${fmt(stage.x)} → ${fmt(stage.y)} (${p(stage.d)}). ${up ? '' : 'O Face entregou parecido; olhe oferta, preço e o público que chegou.'}`;
    }
  } else if (main.name === 'CPM') {
    title = up ? 'O Face ficou mais barato.' : 'O Face ficou mais caro pra aparecer.';
    text = `${roiTxt}. CPM: R$ ${A.cpm.toFixed(2).replace('.', ',')} → R$ ${B.cpm.toFixed(2).replace('.', ',')} (${p(main.change_pct)}). Com o mesmo dinheiro, menos gente viu o anúncio.`;
  } else if (main.name === 'CTR') {
    title = up ? 'Mais gente clicou nos anúncios.' : 'Menos gente clicou nos anúncios.';
    text = `${roiTxt}. CTR: ${fmt(A.ctr)} → ${fmt(B.ctr)} (${p(main.change_pct)}). ${up ? '' : 'Pode ser imagem cansando: confira a aba Criativos.'}`;
  } else if (main.name === 'Chegada') {
    title = up ? 'Mais cliques chegaram no app.' : 'Muita gente clicou e não chegou no app.';
    text = `${roiTxt}. Chegada: ${fmt(A.arrival)} → ${fmt(B.arrival)}. ${up ? '' : 'Confira se a página/app abriu rápido e se o link está certo.'}`;
  } else {
    title = up ? 'O ticket médio subiu.' : 'O ticket médio caiu.';
    text = `${roiTxt}. Ticket: R$ ${A.ticket.toFixed(2).replace('.', ',')} → R$ ${B.ticket.toFixed(2).replace('.', ',')}.`;
  }
  return { tone: up ? 'good' : 'bad', title, text, main: main.name, face };
}

// ── CAMPANHAS ────────────────────────────────────────────────────────────
router.get('/campaigns', wrap(async (req, res) => {
  const to = dayParam(req.query.to, T.today());
  const from = dayParam(req.query.from, to);
  const level = req.query.level === 'ad' ? 'ad' : 'campaign';
  const rows = await metrics.objectRows(level, from, to);
  const series = await metrics.objectSeries(level, rows.map(r => r.id), T.addDays(to, -6), to);
  for (const r of rows) r.series = (series[r.id] || []).map(s => Math.round(s.roi * 100) / 100);
  const s = await settings.all();
  res.json({ from, to, level, rows: rows.sort((a, b) => b.spend - a.spend), guards: s.guards, targets: s.targets });
}));
router.post('/objects/:level/:id/status', wrap(async (req, res) => {
  const level = ['campaign', 'ad'].includes(req.params.level) ? req.params.level : 'campaign';
  const act = req.body.action === 'activate' ? 'activate' : 'pause';
  res.json(await actions.direct(level, req.params.id, act, {}));
}));
router.post('/objects/campaign/:id/budget', wrap(async (req, res) => {
  const v = Number(req.body.value);
  if (!(v > 0)) throw bad('Valor inválido');
  res.json(await actions.direct('campaign', req.params.id, 'budget', { value: v }));
}));

// ── CRIATIVOS ────────────────────────────────────────────────────────────
router.get('/creatives', wrap(async (req, res) => {
  const to = T.today();
  const from7 = T.addDays(to, -6), from30 = T.addDays(to, -29);
  const ads = (await metrics.objectRows('ad', from7, to)).filter(a => a.spend > 0 || a.status === 'ACTIVE');
  const series = await metrics.objectSeries('ad', ads.map(a => a.id), from7, to);
  const tg = await settings.get('targets');
  for (const a of ads) {
    const s = series[a.id] || [];
    a.ctr_series = s.map(x => Math.round(x.ctr * 100) / 100);
    a.fatigue = metrics.fatigue(s);
    a.state = a.status !== 'ACTIVE' ? 'off' : a.fatigue.score >= 75 ? 'saturated' : a.fatigue.score >= 55 ? 'tiring' : (a.days_on != null && a.days_on <= 2) ? 'new' : a.roi >= tg.roi_goal ? 'champion' : 'healthy';
  }
  ads.sort((a, b) => b.roi - a.roi);
  let rank = 0;
  for (const a of ads) if (a.state === 'champion' && rank < 3) a.rank = ++rank;
  // padrões (30 dias): nº de imagens por campanha, modelo, vida útil
  const camps30 = await metrics.objectRows('campaign', from30, to);
  const byCount = {}, byModel = {};
  const cnt = await db.query(`SELECT campaign_id, COUNT(*)::int n FROM ads GROUP BY 1`);
  const cmap = Object.fromEntries(cnt.rows.map(r => [r.campaign_id, r.n]));
  const modelOf = name => { const p = String(name || '').toUpperCase().split(/[-_|\s]+/); const i = p.findIndex(x => x === 'IMG' || x === 'VID'); return i >= 0 && p[i + 1] ? p[i + 1] : null; };
  for (const c of camps30) {
    if (!c.spend) continue;
    const n = cmap[c.id] || 0;
    const k = n <= 1 ? '1' : n <= 3 ? '2–3' : n <= 5 ? '4–5' : '6+';
    const b = byCount[k] = byCount[k] || { spend: 0, revenue: 0, campaigns: 0 };
    b.spend += c.spend; b.revenue += c.revenue; b.campaigns++;
    const m = modelOf(c.name) || 'Outros';
    const bm = byModel[m] = byModel[m] || { spend: 0, revenue: 0, campaigns: 0 };
    bm.spend += c.spend; bm.revenue += c.revenue; bm.campaigns++;
  }
  // vida útil: dias do início até o 1º dia com cansaço ≥ 55
  const all = await metrics.objectRows('ad', T.addDays(to, -59), to);
  const s60 = await metrics.objectSeries('ad', all.map(a => a.id), T.addDays(to, -59), to);
  const life = { '1–3': 0, '4–6': 0, '7–9': 0, '10+': 0 };
  for (const a of all) {
    const s = s60[a.id] || [];
    for (let i = 3; i < s.length; i++) {
      if (metrics.fatigue(s.slice(Math.max(0, i - 5), i + 1)).score >= 55) {
        const d = i + 1;
        life[d <= 3 ? '1–3' : d <= 6 ? '4–6' : d <= 9 ? '7–9' : '10+']++;
        break;
      }
    }
  }
  const fmt = o => Object.entries(o).map(([k, v]) => ({ key: k, roi: metrics.div(v.revenue, v.spend), campaigns: v.campaigns, spend: v.spend }));
  const order = ['1', '2–3', '4–5', '6+'];
  res.json({
    ads,
    patterns: {
      by_count: fmt(byCount).sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key)),
      by_model: fmt(byModel).sort((a, b) => b.roi - a.roi),
      life: Object.entries(life).map(([key, n]) => ({ key, n }))
    }
  });
}));

// ── ESCALA ───────────────────────────────────────────────────────────────
router.get('/scale', wrap(async (req, res) => {
  const to = T.yesterday();
  const from = T.addDays(to, -59);
  const days = (await metrics.daySeries(from, to)).filter(d => d.spend > 0 && d.has_app);
  const tg = await settings.get('targets');
  // faixas de R$ 500: ROI médio em cada uma
  const bins = {};
  for (const d of days) {
    const k = Math.floor(d.spend / 500) * 500;
    const b = bins[k] = bins[k] || { from: k, to: k + 500, days: 0, spend: 0, revenue: 0 };
    b.days++; b.spend += d.spend; b.revenue += d.revenue;
  }
  const bands = Object.values(bins).sort((a, b) => a.from - b.from).map(b => ({ ...b, roi: metrics.div(b.revenue, b.spend) }));
  const okBands = bands.filter(b => b.roi >= tg.roi_goal && b.days >= 2);
  const ideal = okBands.length ? { from: Math.min(...okBands.map(b => b.from)), to: Math.max(...okBands.map(b => b.to)) } : null;
  const above = ideal ? days.filter(d => d.spend > ideal.to) : [];
  // custo por venda pelo tamanho da campanha (gasto diário de cada campanha)
  const { rows: cd } = await db.query(`
    SELECT f.spend::float spend, COALESCE(ai.sales, an.sales, 0)::float sales
    FROM fb_daily f LEFT JOIN campaigns c ON c.id = f.object_id
    LEFT JOIN app_attrib ai ON ai.day = f.day AND ai.kind='campaign' AND ai.key = f.object_id
    LEFT JOIN app_attrib an ON ai.key IS NULL AND an.day = f.day AND an.kind='campaign' AND LOWER(an.key) = LOWER(c.name)
    WHERE f.level='campaign' AND f.day BETWEEN $1 AND $2 AND f.spend > 5`, [T.addDays(to, -29), to]);
  const bk = [['até 50', 0, 50], ['50–100', 50, 100], ['100–200', 100, 200], ['200+', 200, 1e9]].map(([label, lo, hi]) => {
    const r = cd.filter(x => x.spend > lo && x.spend <= hi);
    const sp = r.reduce((s, x) => s + x.spend, 0), sl = r.reduce((s, x) => s + x.sales, 0);
    return { label, cpa: sl ? sp / sl : null, n: r.length };
  });
  const { rows: coh } = await db.query(`
    SELECT to_char(c.day,'YYYY-MM-DD') AS day, c.rev_d0::float d0, c.rev_d7::float d7, c.rev_d30::float d30,
           (SELECT COALESCE(SUM(spend),0) FROM fb_daily f WHERE f.level='account' AND f.day = c.day)::float spend
    FROM app_cohort c WHERE c.day BETWEEN $1 AND $2 ORDER BY c.day`, [T.addDays(to, -44), to]);
  const today = T.today();
  res.json({
    days: days.map(d => ({ day: d.day, spend: d.spend, roi: d.roi })),
    bands, ideal, goal: tg.roi_goal,
    above: { n: above.length, roi: metrics.div(above.reduce((s, d) => s + d.revenue, 0), above.reduce((s, d) => s + d.spend, 0)) },
    buckets: bk,
    cohort: coh.filter(c => c.spend > 0).map(c => ({
      day: c.day, d0: c.d0 / c.spend, d7: T.daysBetween(c.day, today) > 7 ? c.d7 / c.spend : null, d30: T.daysBetween(c.day, today) > 30 ? c.d30 / c.spend : null
    }))
  });
}));

// ── CONTAS E PERFIS ──────────────────────────────────────────────────────
router.get('/structure', wrap(async (req, res) => {
  const day = T.today();
  const [{ rows: profiles }, { rows: bms }, { rows: accs }, { rows: domains }] = await Promise.all([
    db.query('SELECT * FROM profiles ORDER BY (role = \'cofre\') DESC, id'),
    db.query(`SELECT id, meta_id, name, profile_id, token_ok, last_error, last_sync_at, (token_enc IS NOT NULL OR meta_id LIKE 'demo_%') AS has_token FROM bms ORDER BY id`),
    db.query(`SELECT a.*, COALESCE(f.spend,0)::float spend_today,
                (SELECT COALESCE(SUM(COALESCE(c.daily_budget,0)),0) FROM campaigns c WHERE c.account_id = a.id AND c.status='ACTIVE')::float
                + (SELECT COALESCE(SUM(s.daily_budget),0) FROM adsets s JOIN campaigns c ON c.id = s.campaign_id WHERE s.account_id = a.id AND s.status='ACTIVE' AND c.status='ACTIVE' AND c.daily_budget IS NULL)::float AS budget
              FROM ad_accounts a LEFT JOIN fb_daily f ON f.level='account' AND f.object_id = a.id AND f.day = $1 ORDER BY a.name`, [day]),
    db.query(`SELECT d.*, (SELECT COUNT(*) FROM ad_accounts a WHERE a.domain_id = d.id)::int AS accounts FROM domains d ORDER BY d.id`)
  ]);
  const total = accs.reduce((s, a) => s + a.spend_today, 0);
  for (const a of accs) a.share = total ? a.spend_today / total * 100 : 0;
  const tg = await settings.get('targets');
  const vault = profiles.find(p => p.role === 'cofre');
  const checks = [];
  if (vault) {
    const idle = vault.last_used_at ? T.daysBetween(new Date(vault.last_used_at).toISOString().slice(0, 10), day) : null;
    checks.push({ ok: idle === null || idle >= 3, title: 'Perfil cofre não anuncia', detail: idle === null ? 'Sem registro de uso' : `Último uso há ${idle} dias` });
  } else checks.push({ ok: false, title: 'Falta o perfil cofre', detail: 'Um perfil admin de todas as BMs que nunca anuncia' });
  const top = [...accs].sort((a, b) => b.share - a.share)[0];
  if (top && total) checks.push({ ok: top.share <= tg.max_account_share, title: `${top.name} tem ${Math.round(top.share)}% do gasto do dia`, detail: `O ideal é nenhuma conta passar de ${tg.max_account_share}%` });
  const cards = new Set(accs.map(a => a.card_label || a.funding_label).filter(Boolean));
  const bmCount = new Set(accs.map(a => a.bm_id)).size;
  checks.push({ ok: cards.size >= bmCount, title: cards.size >= bmCount ? 'Cada BM com cartão próprio' : 'Cartões repetidos entre BMs', detail: `${cards.size} cartões para ${bmCount} BMs` });
  const reserves = accs.filter(a => a.is_reserve && a.account_status === 1).length;
  checks.push({ ok: reserves >= 2, title: `${reserves} conta${reserves === 1 ? '' : 's'} reserva pronta${reserves === 1 ? '' : 's'}`, detail: 'Ter 2 evita parar a operação se duas caírem no mesmo dia' });
  res.json({ profiles, bms, accounts: accs, domains, checks });
}));

router.post('/profiles', wrap(async (req, res) => {
  const { name, role = 'operador' } = req.body;
  if (!name) throw bad('Dê um nome ao perfil');
  const { rows } = await db.query('INSERT INTO profiles (name, role) VALUES ($1,$2) RETURNING *', [String(name).slice(0, 80), role === 'cofre' ? 'cofre' : 'operador']);
  res.json(rows[0]);
}));
router.patch('/profiles/:id', wrap(async (req, res) => {
  const f = pickFields(req.body, ['name', 'role', 'status', 'notes', 'last_used_at']);
  res.json(await patch('profiles', req.params.id, f));
}));
router.delete('/profiles/:id', wrap(async (req, res) => {
  await db.query('DELETE FROM profiles WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
}));
router.patch('/bms/:id', wrap(async (req, res) => {
  const f = pickFields(req.body, ['name', 'profile_id']);
  res.json(await patch('bms', req.params.id, f));
}));
router.delete('/bms/:id', wrap(async (req, res) => {
  await db.query('UPDATE ad_accounts SET bm_id = NULL WHERE bm_id = $1', [req.params.id]);
  await db.query('DELETE FROM bms WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
}));
router.patch('/accounts/:id', wrap(async (req, res) => {
  const f = pickFields(req.body, ['card_label', 'is_reserve', 'domain_id', 'notes']);
  res.json(await patch('ad_accounts', req.params.id, f));
}));
router.post('/domains', wrap(async (req, res) => {
  const d = String(req.body.domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!d) throw bad('Informe o domínio');
  const { rows } = await db.query('INSERT INTO domains (domain, status) VALUES ($1,$2) ON CONFLICT (domain) DO UPDATE SET status = $2 RETURNING *', [d, req.body.status || 'ok']);
  res.json(rows[0]);
}));
router.patch('/domains/:id', wrap(async (req, res) => res.json(await patch('domains', req.params.id, pickFields(req.body, ['status', 'notes'])))));
router.delete('/domains/:id', wrap(async (req, res) => { await db.query('DELETE FROM domains WHERE id = $1', [req.params.id]); res.json({ ok: true }); }));

// conta caiu → pra onde vai o orçamento
router.get('/redistribute/:account', wrap(async (req, res) => {
  const { rows } = await db.query(`
    SELECT a.id, a.name, a.account_status, a.is_reserve, a.spend_cap::float,
      (SELECT COALESCE(SUM(COALESCE(c.daily_budget,0)),0) FROM campaigns c WHERE c.account_id = a.id AND c.status='ACTIVE')::float
      + (SELECT COALESCE(SUM(s.daily_budget),0) FROM adsets s JOIN campaigns c ON c.id = s.campaign_id WHERE s.account_id = a.id AND s.status='ACTIVE' AND c.status='ACTIVE' AND c.daily_budget IS NULL)::float AS budget
    FROM ad_accounts a`);
  const down = rows.find(r => r.id === req.params.account);
  if (!down) throw bad('Conta não encontrada');
  const from = T.addDays(T.today(), -7), to = T.yesterday();
  const camps = await metrics.objectRows('campaign', from, to);
  const accRoi = {};
  for (const c of camps) { const x = accRoi[c.account_id] = accRoi[c.account_id] || { s: 0, r: 0 }; x.s += c.spend; x.r += c.revenue; }
  const tg = await settings.get('targets');
  const cands = rows.filter(r => r.id !== down.id && r.account_status === 1).map(r => {
    const roi = accRoi[r.id] ? metrics.div(accRoi[r.id].r, accRoi[r.id].s) : null;
    const room = r.spend_cap ? Math.max(0, r.spend_cap - r.budget) : 500;
    return { ...r, roi, room };
  }).filter(r => r.is_reserve || (r.roi !== null && r.roi >= tg.roi_goal * 0.9)).sort((a, b) => (b.is_reserve - a.is_reserve) || ((b.roi || 0) - (a.roi || 0)));
  let left = down.budget || 0;
  const plan = [];
  for (const c of cands) {
    if (left <= 0) break;
    const maxAdd = c.is_reserve ? Math.min(left, 150) : Math.min(left, Math.round(c.budget * tg.max_change_pct / 100) || 60, c.room);
    if (maxAdd <= 0) continue;
    plan.push({ id: c.id, name: c.name, add: Math.round(maxAdd), reserve: c.is_reserve, roi: c.roi });
    left -= maxAdd;
  }
  res.json({ account: down, budget: down.budget, plan, uncovered: Math.max(0, Math.round(left)) });
}));

// ── CONECTAR BM (chave do usuário do sistema) ────────────────────────────
router.post('/bms/connect', wrap(async (req, res) => {
  const token = String(req.body.token || '').trim();
  if (token.length < 20) throw bad('Cole a chave inteira (ela é bem longa)');
  let me, accs;
  try {
    me = await meta.whoAmI(token);
    accs = await meta.adAccounts(token);
  } catch (err) {
    if (err.tokenInvalid || /token/i.test(err.message)) throw bad('Essa chave não funcionou (inválida, incompleta ou expirada). Gere uma nova no usuário do sistema e cole de novo. Detalhe: ' + err.message);
    if (err.code === 200 || err.code === 10) throw bad('A chave não tem permissão pra ler as contas. Marque ads_read e business_management ao gerar. Detalhe: ' + err.message);
    throw bad('O Facebook recusou: ' + err.message);
  }
  if (!accs.length) throw bad('A chave funcionou, mas nenhuma conta de anúncio está atribuída a esse usuário do sistema. Atribua as contas a ele na BM.');
  const groups = {};
  for (const a of accs) {
    const k = a.business ? a.business.id : 'me_' + me.id;
    (groups[k] = groups[k] || { name: a.business ? a.business.name : (req.body.name || me.name), accs: [] }).accs.push(a);
  }
  const enc = encrypt(token);
  const out = [];
  for (const [metaId, g] of Object.entries(groups)) {
    const { rows } = await db.query(
      `INSERT INTO bms (meta_id, name, token_enc, token_ok, last_error, profile_id) VALUES ($1,$2,$3,true,NULL,$4)
       ON CONFLICT (meta_id) DO UPDATE SET token_enc = $3, token_ok = true, last_error = NULL, name = COALESCE(bms.name, $2) RETURNING id`,
      [metaId, g.name, enc, req.body.profile_id || null]);
    for (const a of g.accs) {
      await db.query(
        `INSERT INTO ad_accounts (id, bm_id, name, account_status, disable_reason, currency, timezone_name, spend_cap, amount_spent, funding_label, card_label, last_sync_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,NOW())
         ON CONFLICT (id) DO UPDATE SET bm_id=$2, name=$3, account_status=$4, disable_reason=$5, funding_label=COALESCE($10, ad_accounts.funding_label), last_sync_at=NOW()`,
        [a.id, rows[0].id, a.name, a.account_status, a.disable_reason, a.currency, a.timezone_name, a.spend_cap, a.amount_spent, a.funding_label]);
    }
    out.push({ bm: g.name, accounts: g.accs.map(a => a.name) });
  }
  collector.collect().catch(() => {});
  res.json({ ok: true, user: me.name, bms: out, warning: DEMO() ? 'O Radar está em modo demonstração: desligue DEMO_MODE pra ver os dados reais.' : null });
}));

// ── REGRAS E APROVAÇÕES ──────────────────────────────────────────────────
router.get('/rules', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM rules ORDER BY id');
  res.json({ rules: rows, guards: await settings.get('guards') });
}));
router.post('/rules', wrap(async (req, res) => {
  const { name, kind, params = {}, mode = 'notify' } = req.body;
  if (!['roi_low', 'roi_high', 'spend_no_sale', 'fatigue', 'day_roi_low'].includes(kind)) throw bad('Tipo de regra inválido');
  const { rows } = await db.query('INSERT INTO rules (name, kind, params, mode) VALUES ($1,$2,$3,$4) RETURNING *', [name || kind, kind, params, mode]);
  res.json(rows[0]);
}));
router.patch('/rules/:id', wrap(async (req, res) => {
  const f = pickFields(req.body, ['name', 'params', 'mode', 'enabled']);
  if (f.mode && !['notify', 'approve', 'auto'].includes(f.mode)) throw bad('Modo inválido');
  if (f.mode === 'auto' && !(await settings.get('guards')).auto_enabled) throw bad('O modo automático é liberado em Conexões, depois que você confiar nas regras');
  res.json(await patch('rules', req.params.id, f));
}));
router.delete('/rules/:id', wrap(async (req, res) => { await db.query('DELETE FROM rules WHERE id = $1', [req.params.id]); res.json({ ok: true }); }));

router.get('/actions', wrap(async (req, res) => {
  const pending = req.query.status === 'pending';
  const { rows } = await db.query(
    `SELECT a.*, r.name AS rule_name FROM actions a LEFT JOIN rules r ON r.id = a.rule_id
     WHERE ${pending ? "a.status = 'pending'" : "a.status <> 'pending'"} ORDER BY a.created_at DESC LIMIT 60`);
  res.json(rows);
}));
router.post('/actions/:id/approve', wrap(async (req, res) => res.json(await actions.execute(req.params.id))));
router.post('/actions/:id/ignore', wrap(async (req, res) => { await actions.ignore(req.params.id); res.json({ ok: true }); }));
router.post('/actions/:id/undo', wrap(async (req, res) => { await actions.undo(req.params.id); res.json({ ok: true }); }));

// ── ALERTAS E DIÁRIO ─────────────────────────────────────────────────────
router.get('/alerts', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM alerts ORDER BY created_at DESC LIMIT 50');
  res.json(rows);
}));
router.post('/alerts/seen', wrap(async (req, res) => { await db.query('UPDATE alerts SET seen = true WHERE seen = false'); res.json({ ok: true }); }));
router.post('/notes', wrap(async (req, res) => {
  const day = dayParam(req.body.day, T.today());
  if (!req.body.title) throw bad('Escreva o que mudou');
  const { rows } = await db.query('INSERT INTO notes (day, title, detail, kind) VALUES ($1,$2,$3,$4) RETURNING *', [day, String(req.body.title).slice(0, 140), req.body.detail || null, req.body.kind || 'mudanca']);
  res.json(rows[0]);
}));
router.delete('/notes/:id', wrap(async (req, res) => { await db.query('DELETE FROM notes WHERE id = $1', [req.params.id]); res.json({ ok: true }); }));

// ── RELATÓRIOS ───────────────────────────────────────────────────────────
router.get('/reports', wrap(async (req, res) => {
  const { rows } = await db.query(`SELECT id, to_char(day,'YYYY-MM-DD') AS day, title, summary, source, created_at, content->'kpis' AS kpis FROM reports ORDER BY day DESC, id DESC LIMIT 30`);
  res.json(rows);
}));
router.get('/reports/:id', wrap(async (req, res) => res.json(await reports.full(req.params.id))));
router.get('/daynums', wrap(async (req, res) => {
  const to = T.yesterday();
  res.json((await metrics.daySeries(T.addDays(to, -13), to)).reverse());
}));

// ── CONFIGURAÇÕES / CONEXÕES ─────────────────────────────────────────────
router.get('/settings', wrap(async (req, res) => {
  const s = await settings.all();
  const { rows: andLog } = await db.query('SELECT * FROM andromeda_log ORDER BY sent_at DESC LIMIT 6');
  const { rows: sync } = await db.query('SELECT * FROM sync_log ORDER BY created_at DESC LIMIT 8');
  const { rows: subs } = await db.query('SELECT COUNT(*)::int n FROM push_subs');
  const { rows: bms } = await db.query('SELECT COUNT(*)::int n, COUNT(*) FILTER (WHERE token_ok)::int ok FROM bms WHERE token_enc IS NOT NULL');
  const { rows: rep } = await db.query(`SELECT created_at FROM reports WHERE source = 'claude' ORDER BY created_at DESC LIMIT 1`);
  const { rows: tagged } = await db.query(`SELECT COALESCE(SUM(tagged_visitors),0)::int t, COALESCE(SUM(visitors),0)::int v FROM app_daily WHERE day >= $1`, [T.addDays(T.today(), -2)]);
  res.json({
    targets: s.targets, guards: s.guards, collect: s.collect, notify: s.notify,
    andromeda: { ...s.andromeda, secret: s.andromeda.secret ? '••••' + String(s.andromeda.secret).slice(-4) : '' },
    andromeda_log: andLog, sync_log: sync, push_subs: subs[0].n, bms: bms[0], last_report: rep[0] || null,
    app_connected: appdb.enabled(), demo: DEMO(), demo_data: !!s.demo, collector: collector.status(),
    tagged: tagged[0], meta_version: meta.VERSION,
    utm_template: 'utm_source=fb&utm_campaign={{campaign.id}}&utm_medium={{adset.id}}&utm_content={{ad.id}}&utm_term={{placement}}'
  });
}));
router.patch('/settings/:key', wrap(async (req, res) => {
  const key = req.params.key;
  if (!['targets', 'guards', 'collect', 'notify', 'andromeda'].includes(key)) throw bad('Configuração desconhecida');
  const body = { ...req.body };
  if (key === 'andromeda' && (body.secret === undefined || String(body.secret).startsWith('••••'))) delete body.secret;
  await settings.merge(key, body);
  res.json({ ok: true, [key]: await settings.get(key) });
}));
router.post('/andromeda/test', wrap(async (req, res) => res.json(await andromeda.sendDay(T.today(), false))));
router.post('/sync', wrap(async (req, res) => res.json(await collector.collect({ force: true }))));
router.post('/demo/clear', wrap(async (req, res) => {
  if (DEMO()) throw bad('Primeiro troque DEMO_MODE para 0 no EasyPanel e reinicie; depois apague a demonstração.');
  await require('../lib/demo').clear();
  res.json({ ok: true });
}));

// ── NOTIFICAÇÕES ─────────────────────────────────────────────────────────
router.post('/push/subscribe', wrap(async (req, res) => {
  const s = req.body || {};
  if (!s.endpoint || !s.keys) throw bad('Inscrição inválida');
  await db.query('INSERT INTO push_subs (endpoint, keys, user_agent) VALUES ($1,$2,$3) ON CONFLICT (endpoint) DO UPDATE SET keys = $2', [s.endpoint, s.keys, String(req.headers['user-agent'] || '').slice(0, 200)]);
  res.json({ ok: true });
}));
router.post('/push/test', wrap(async (req, res) => {
  const n = await notify.push(null, 'Radar conectado', 'As notificações estão funcionando neste aparelho.', '/');
  res.json({ ok: true, sent: n });
}));

// ── helpers ──────────────────────────────────────────────────────────────
function pickFields(body, allowed) {
  const out = {};
  for (const k of allowed) if (body[k] !== undefined) out[k] = body[k] === '' ? null : body[k];
  return out;
}
async function patch(table, id, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) throw bad('Nada pra mudar');
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rows } = await db.query(`UPDATE ${table} SET ${sets} WHERE id = $1 RETURNING *`, [id, ...keys.map(k => fields[k])]);
  if (!rows[0]) throw Object.assign(new Error('Não encontrado'), { status: 404 });
  if (rows[0].token_enc) delete rows[0].token_enc;
  return rows[0];
}

module.exports = router;
