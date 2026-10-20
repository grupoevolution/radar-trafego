// lib/demo.js — dados de DEMONSTRAÇÃO (DEMO_MODE=1)
//
// Serve pra você ver o Radar inteiro funcionando antes de conectar as BMs.
// Gera 60 dias de histórico coerente (gasto, cliques, entradas no app, Pix,
// vendas reais × o que o Face diz) e, a cada coleta, atualiza o "hoje" até a
// hora atual. Tudo marcado como demonstração; o botão "Apagar demonstração"
// em Conexões limpa tudo.
const db = require('../db');
const T = require('./time');

// gerador pseudoaleatório com semente (o mesmo dia gera sempre os mesmos números)
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const seedOf = str => [...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

// curva de gasto por hora (pico à noite)
const HOURW = [3.2, 1.9, 1.1, .8, .7, .9, 2.1, 3.6, 4.4, 4.9, 5.0, 5.1, 5.2, 5.2, 5.1, 5.3, 5.6, 6.0, 6.6, 7.2, 7.6, 7.4, 6.4, 4.7];
const HSUM = HOURW.reduce((a, b) => a + b, 0);

const PROFILES = [
  ['Perfil Mestre', 'cofre', 'ativo'],
  ['Operador 1', 'operador', 'ativo'],
  ['Operador 2', 'operador', 'verificacao'],
  ['Operador 3', 'operador', 'ativo'],
];
const BMS = [['Aurora', 2], ['Boreal', 2], ['Cobalto', 3], ['Delta', 3], ['Eclipse', 4], ['Fênix', 4]];
// [id, bm, nome, cartão, limite, status, reserva]
const ACCOUNTS = [
  ['act_demo01', 0, 'CA 01', 'Nubank •• 4821', 3500, 1, false],
  ['act_demo02', 0, 'CA 02', 'Nubank •• 4821', 2000, 1, false],
  ['act_demo03', 1, 'CA 03', 'Inter •• 0193', 1500, 1, false],
  ['act_demo04', 1, 'CA 04', 'Inter •• 0193', 1500, 1, false],
  ['act_demo05', 2, 'CA 05', 'C6 •• 7740', 1200, 2, false],
  ['act_demo06', 2, 'CA 06', 'C6 •• 7740', 900, 7, false],
  ['act_demo07', 3, 'CA 07', 'Nubank •• 1102', 2500, 1, false],
  ['act_demo08', 4, 'CA 08', 'Itaú •• 5566', 2000, 1, false],
  ['act_demo10', 4, 'CA 10', 'Itaú •• 5566', 1000, 1, false],
  ['act_demo09', 5, 'CA 09', 'Inter •• 8817', 1000, 1, false],
  ['act_demo11', 5, 'CA 11', 'Inter •• 8817', 800, 1, true],
];
// campanhas: [conta, nome, orçamento, qualidade, começou há N dias, nº imagens, ligada]
const CAMPS = [
  ['act_demo01', 'ABO-3CRI-IMG-RAQUEL', 120, 1.30, 9, 3, true],
  ['act_demo01', 'ABO-3CRI-IMG-RAQUEL-C', 100, 1.10, 31, 3, true],
  ['act_demo02', 'CBO-4CRI-IMG-MIX', 200, 0.98, 14, 4, true],
  ['act_demo03', 'ABO-3CRI-IMG-CAROL', 100, 1.22, 6, 3, true],
  ['act_demo04', 'ABO-6CRI-IMG-CAROL', 150, 0.45, 4, 6, true],
  ['act_demo05', 'ABO-3CRI-IMG-LUANA-B', 130, 1.05, 22, 3, true],
  ['act_demo06', 'ABO-3CRI-IMG-MIX-B', 90, 0.95, 18, 3, true],
  ['act_demo07', 'ABO-3CRI-IMG-LUANA', 80, 1.06, 11, 3, true],
  ['act_demo08', 'ABO-3CRI-IMG-RAQUEL-B', 100, 0.90, 12, 3, true],
  ['act_demo10', 'ABO-1CRI-IMG-CAROL', 60, 0.85, 26, 1, true],
  ['act_demo09', 'CBO-6CRI-IMG-MIX', 250, 0.40, 20, 6, false],
  ['act_demo09', 'ABO-4CRI-IMG-RAQUEL', 110, 1.08, 40, 4, true],
];
const MODELS = { RAQUEL: 'Raquel', CAROL: 'Carol', LUANA: 'Luana', MIX: 'Mix' };
const PLACEMENTS = [['instagram_instagram_reels', .52, 1.15, 1.10], ['facebook_feed', .27, .93, .95], ['instagram_instagram_stories', .15, .82, .85], ['audience_network_an_classic', .06, 1.6, .14]];

const campId = i => `demo_c${String(i + 1).padStart(2, '0')}`;
const adsetId = i => `demo_s${String(i + 1).padStart(2, '0')}`;
const adId = (i, j) => `demo_a${String(i + 1).padStart(2, '0')}${j + 1}`;
function model(name) { const k = Object.keys(MODELS).find(m => name.includes(m)); return k || 'MIX'; }

// gasto total do dia (índice: 0 = hoje, 1 = ontem…)
function daySpend(ago) {
  if (ago === 1 || ago === 2) return 2000;
  const r = rng(seedOf('spend' + ago));
  const base = ago > 30 ? 2400 : 2900;
  const spike = r() < 0.18 ? 1400 + r() * 1900 : 0;
  return Math.round(base + (r() - 0.5) * 1100 + spike);
}

// gera um dia inteiro (ou até `uptoHour` no caso de hoje)
function buildDay(day, ago, uptoHour = 23) {
  const r = rng(seedOf('d' + day));
  const fullSpend = daySpend(ago);
  const frac = HOURW.slice(0, uptoHour + 1).reduce((a, b) => a + b, 0) / HSUM;
  const spend = fullSpend * frac;
  const cpm = (ago === 1 ? 23.0 : ago === 2 ? 22.1 : 21.5 + r() * 3.4) * (fullSpend > 4000 ? 1.12 : 1);
  // conversão cai quando o gasto passa do ponto ideal (público mais frio)
  const sat = fullSpend <= 3400 ? 1 : Math.max(0.5, 1 - (fullSpend - 3400) / 2600 * 0.45);
  const payRate = ago === 1 ? 0.38 : ago === 2 ? 0.62 : 0.55 + r() * 0.09;

  const active = CAMPS.map((c, i) => ({ c, i })).filter(({ c }) => c[4] >= ago && !(c[6] === false && ago < 3) && !(c[0] === 'act_demo05' && ago === 0 && uptoHour >= 19));
  const wsum = active.reduce((a, { c }) => a + c[2], 0);
  const out = { fb: [], ads: [], app: null, attrib: [], hourlyApp: [], hourlyFb: [], placement: [] };
  let tot = { impressions: 0, clicks: 0, visitors: 0, sales: 0, revenue: 0, fbp: 0 };
  const perAcc = {};

  for (const { c, i } of active) {
    const cs = spend * c[2] / wsum;
    const daysOn = c[4] - ago;
    const camp = { impressions: 0, clicks: 0, reach: 0, lpv: 0, sales: 0, revenue: 0, fbp: 0, fbr: 0, visitors: 0 };
    const n = c[5];
    for (let j = 0; j < n; j++) {
      const share = (n - j) / (n * (n + 1) / 2);
      const as = cs * share;
      const age = daysOn - (j === n - 1 && n > 2 ? 3 : 0);
      const fatigue = Math.max(0.55, 1 - Math.max(0, age - 5) * 0.045);
      const imp = as / cpm * 1000;
      const ctr = (0.088 + (r() - 0.5) * 0.01) * fatigue * (j === 0 ? 1.12 : 1);
      const clicks = imp * ctr;
      const freq = Math.min(4.2, 1.15 + age * 0.17);
      const visitors = clicks * (0.84 + r() * 0.03);
      const conv = 0.46 * 0.172 * 0.46 * payRate * sat * c[3] * (0.9 + r() * 0.2) * (ago <= 2 ? 1.33 : 1);
      const sales = visitors * conv;
      const ticket = ago === 1 ? 23.9 : 24 + r() * 1.3;
      const a = { id: adId(i, j), campaign_id: campId(i), account_id: c[0], spend: as, impressions: imp, reach: imp / freq, frequency: freq, clicks, lpv: visitors * 0.97, sales, revenue: sales * ticket, fbp: sales * 1.5, fbr: sales * 1.5 * ticket, visitors };
      out.ads.push(a);
      for (const k of ['impressions', 'clicks', 'reach', 'lpv', 'sales', 'revenue', 'fbp', 'fbr', 'visitors']) camp[k] += a[k];
    }
    out.fb.push({ level: 'campaign', object_id: campId(i), account_id: c[0], campaign_id: campId(i), spend: cs, ...camp, frequency: camp.impressions / Math.max(1, camp.reach) });
    const pa = perAcc[c[0]] || (perAcc[c[0]] = { spend: 0, impressions: 0, reach: 0, clicks: 0, lpv: 0, fbp: 0, fbr: 0 });
    pa.spend += cs; pa.impressions += camp.impressions; pa.reach += camp.reach; pa.clicks += camp.clicks; pa.lpv += camp.lpv; pa.fbp += camp.fbp; pa.fbr += camp.fbr;
    tot.impressions += camp.impressions; tot.clicks += camp.clicks; tot.visitors += camp.visitors; tot.sales += camp.sales; tot.revenue += camp.revenue; tot.fbp += camp.fbp;
    out.attrib.push({ kind: 'campaign', key: campId(i), visitors: camp.visitors * 0.92, sales: camp.sales * 0.94, revenue: camp.revenue * 0.94 });
  }
  for (const a of out.ads) out.attrib.push({ kind: 'ad', key: a.id, visitors: a.visitors * 0.92, sales: a.sales * 0.94, revenue: a.revenue * 0.94 });
  for (const [acc, a] of Object.entries(perAcc)) out.fb.push({ level: 'account', object_id: acc, account_id: acc, campaign_id: null, spend: a.spend, impressions: a.impressions, reach: a.reach, frequency: a.impressions / Math.max(1, a.reach), clicks: a.clicks, lpv: a.lpv, fbp: a.fbp, fbr: a.fbr });
  for (const a of out.ads) out.fb.push({ level: 'ad', object_id: a.id, account_id: a.account_id, campaign_id: a.campaign_id, spend: a.spend, impressions: a.impressions, reach: a.reach, frequency: a.frequency, clicks: a.clicks, lpv: a.lpv, fbp: a.fbp, fbr: a.fbr });

  // posicionamentos
  for (const [acc, a] of Object.entries(perAcc)) {
    for (const [pl, sh, ctrF] of PLACEMENTS) out.placement.push({ account_id: acc, placement: pl, spend: a.spend * sh, impressions: a.impressions * sh * (pl.startsWith('audience') ? 2.4 : 1), link_clicks: a.clicks * sh * ctrF });
  }
  for (const [pl, sh, ctrF, , ] of PLACEMENTS) {
    const convF = pl.startsWith('audience') ? 0.12 : pl.includes('reels') ? 1.12 : pl.includes('feed') ? 0.95 : 0.82;
    out.attrib.push({ kind: 'placement', key: pl.replace(/^instagram_instagram_/, 'instagram_'), visitors: tot.visitors * sh * ctrF * 0.92, sales: tot.sales * sh * convF * 0.94, revenue: tot.revenue * sh * convF * 0.94 });
  }

  // app (inclui quem entrou sem etiqueta)
  const visitors = tot.visitors / 0.93;
  const chatted = visitors * 0.46 * (0.97 + r() * 0.06);
  const checkout = chatted * 0.172 * sat;
  const pix = checkout * 0.46;
  out.app = { visitors, chatted, checkout, pix, sales: tot.sales, revenue: tot.revenue, refunds: Math.round(tot.sales * 0.015), refund_value: Math.round(tot.sales * 0.015) * 24.9, tagged_visitors: tot.visitors };
  out.spend = spend; out.fullSpend = fullSpend;

  // por hora (app e Face), proporcional à curva
  const parts = HOURW.slice(0, uptoHour + 1);
  const ps = parts.reduce((a, b) => a + b, 0);
  parts.forEach((w, h) => {
    const f = w / ps;
    const pf = (h >= 19 && h <= 23 && ago === 1) ? 0.55 : 1; // queda do Pix ontem à noite
    out.hourlyApp.push({ hour: h, visitors: visitors * f, chatted: chatted * f, checkout: checkout * f, pix: pix * f, sales: tot.sales * f * pf, revenue: tot.revenue * f * pf });
    for (const [acc, a] of Object.entries(perAcc)) out.hourlyFb.push({ account_id: acc, hour: h, spend: a.spend * f, impressions: a.impressions * f, link_clicks: a.clicks * f, fb_purchases: a.fbp * f, fb_revenue: a.fbr * f });
  });
  return out;
}

const R = Math.round;
const M = v => Math.round(v * 100) / 100;

async function writeDay(c, day, d, withHourly) {
  for (const f of d.fb) {
    await c.query(
      `INSERT INTO fb_daily (level, object_id, day, account_id, campaign_id, spend, impressions, reach, frequency, link_clicks, lpv, fb_purchases, fb_revenue, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
       ON CONFLICT (level, object_id, day) DO UPDATE SET spend=$6, impressions=$7, reach=$8, frequency=$9, link_clicks=$10, lpv=$11, fb_purchases=$12, fb_revenue=$13, updated_at=NOW()`,
      [f.level, f.object_id, day, f.account_id, f.campaign_id, M(f.spend), R(f.impressions), R(f.reach), Math.round(f.frequency * 1000) / 1000, R(f.clicks), R(f.lpv), R(f.fbp), M(f.fbr)]);
  }
  const a = d.app;
  await c.query(
    `INSERT INTO app_daily (day, visitors, chatted, checkout, pix, sales, revenue, refunds, refund_value, tagged_visitors, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
     ON CONFLICT (day) DO UPDATE SET visitors=$2, chatted=$3, checkout=$4, pix=$5, sales=$6, revenue=$7, refunds=$8, refund_value=$9, tagged_visitors=$10, updated_at=NOW()`,
    [day, R(a.visitors), R(a.chatted), R(a.checkout), R(a.pix), R(a.sales), M(a.revenue), a.refunds, M(a.refund_value), R(a.tagged_visitors)]);
  await c.query('DELETE FROM app_attrib WHERE day = $1', [day]);
  for (const x of d.attrib) {
    await c.query('INSERT INTO app_attrib (day, kind, key, visitors, sales, revenue) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', [day, x.kind, x.key, R(x.visitors), R(x.sales), M(x.revenue)]);
  }
  for (const p of d.placement) {
    await c.query(
      `INSERT INTO fb_placement (account_id, day, placement, spend, impressions, link_clicks) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (account_id, day, placement) DO UPDATE SET spend=$4, impressions=$5, link_clicks=$6`,
      [p.account_id, day, p.placement, M(p.spend), R(p.impressions), R(p.link_clicks)]);
  }
  if (withHourly) {
    for (const h of d.hourlyApp) {
      await c.query(
        `INSERT INTO app_hourly (day, hour, visitors, chatted, checkout, pix, sales, revenue) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (day, hour) DO UPDATE SET visitors=$3, chatted=$4, checkout=$5, pix=$6, sales=$7, revenue=$8`,
        [day, h.hour, R(h.visitors), R(h.chatted), R(h.checkout), R(h.pix), R(h.sales), M(h.revenue)]);
    }
    for (const h of d.hourlyFb) {
      await c.query(
        `INSERT INTO fb_hourly (account_id, day, hour, spend, impressions, link_clicks, fb_purchases, fb_revenue) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (account_id, day, hour) DO UPDATE SET spend=$4, impressions=$5, link_clicks=$6, fb_purchases=$7, fb_revenue=$8`,
        [h.account_id, day, h.hour, M(h.spend), R(h.impressions), R(h.link_clicks), R(h.fb_purchases), M(h.fb_revenue)]);
    }
  }
}

async function seedStructure(c) {
  const today = T.today();
  const pids = [];
  for (const [name, role, status] of PROFILES) {
    const { rows } = await c.query(`INSERT INTO profiles (name, role, status, last_used_at, notes) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [name, role, status, role === 'cofre' ? T.addDays(today, -9) : today, role === 'cofre' ? 'Admin de todas as BMs. Não anunciar por ele.' : null]);
    pids.push(rows[0].id);
  }
  const dom = [];
  for (const [d, st] of [['principal.com.br', 'ok'], ['reserva-1.com.br', 'ok'], ['reserva-2.com.br', 'reserva']]) {
    const { rows } = await c.query('INSERT INTO domains (domain, status) VALUES ($1,$2) ON CONFLICT (domain) DO UPDATE SET status = $2 RETURNING id', [d, st]);
    dom.push(rows[0].id);
  }
  const bmIds = [];
  for (const [i, [name, pIdx]] of BMS.entries()) {
    const { rows } = await c.query(`INSERT INTO bms (meta_id, name, profile_id, token_ok, last_sync_at) VALUES ($1,$2,$3,true,NOW()) RETURNING id`,
      ['demo_bm_' + (i + 1), 'BM ' + name, pids[pIdx - 1]]);
    bmIds.push(rows[0].id);
  }
  for (const [i, [id, bm, name, card, cap, st, reserve]] of ACCOUNTS.entries()) {
    await c.query(
      `INSERT INTO ad_accounts (id, bm_id, name, account_status, disable_reason, currency, timezone_name, spend_cap, funding_label, card_label, is_reserve, domain_id, status_changed_at, last_sync_at)
       VALUES ($1,$2,$3,$4,$5,'BRL','America/Sao_Paulo',$6,$7,$7,$8,$9,$10,NOW())`,
      [id, bmIds[bm], name, st, st === 2 ? 1 : 0, cap, card, reserve, i < 8 ? dom[0] : dom[1], st === 2 ? new Date() : null]);
  }
  for (const [i, c0] of CAMPS.entries()) {
    const [acc, name, budget, , started, n, on] = c0;
    const created = T.addDays(today, -started) + 'T08:00:00-03:00';
    await c.query(`INSERT INTO campaigns (id, account_id, name, status, effective_status, daily_budget, objective, created_time, start_time)
                   VALUES ($1,$2,$3,$4,$4,$5,'OUTCOME_SALES',$6,$6)`,
      [campId(i), acc, name, on ? 'ACTIVE' : 'PAUSED', name.startsWith('CBO') ? budget : null, created]);
    await c.query(`INSERT INTO adsets (id, campaign_id, account_id, name, status, effective_status, daily_budget, created_time) VALUES ($1,$2,$3,$4,$5,$5,$6,$7)`,
      [adsetId(i), campId(i), acc, 'CJ ' + name, on ? 'ACTIVE' : 'PAUSED', name.startsWith('CBO') ? null : budget, created]);
    const m = model(name);
    for (let j = 0; j < n; j++) {
      const num = String((i * 3 + j) % 9 + 1).padStart(2, '0');
      await c.query(`INSERT INTO ads (id, adset_id, campaign_id, account_id, name, status, effective_status, created_time) VALUES ($1,$2,$3,$4,$5,$6,$6,$7)`,
        [adId(i, j), adsetId(i), campId(i), acc, `IMG-${m}-${num}`, on ? 'ACTIVE' : 'PAUSED', created]);
    }
  }
  const notes = [[-11, 'Preço VIP de 19,90 para 24,90', 'Grupos para 19,90', 'mudanca'], [-9, 'Desconto ao desistir ligado', 'VIP 14,90 · Premium 29,90 · grupo 9,90', 'mudanca'], [-5, '3 imagens novas da Luana', 'Na CA 07', 'criativo']];
  for (const [d, t, det, k] of notes) await c.query('INSERT INTO notes (day, title, detail, kind) VALUES ($1,$2,$3,$4)', [T.addDays(today, d), t, det, k]);
}

// relatório de exemplo montado com os PRÓPRIOS números da demonstração
async function demoReport(day) {
  const metrics = require('./metrics');
  const days = await metrics.daySeries(T.addDays(day, -7), day);
  const y = days[days.length - 1], v = days[days.length - 2];
  const w = days.slice(0, -1);
  const avg = k => w.reduce((a, d) => a + d[k], 0) / w.length;
  const f2 = x => x.toFixed(2).replace('.', ',');
  const pc = x => Math.round(x) + '%';
  const brl = x => (x < 0 ? '−' : '') + 'R$ ' + Math.abs(Math.round(x)).toLocaleString('pt-BR');
  const camps = (await metrics.objectRows('campaign', day, day)).filter(c => c.spend > 0).sort((a, b) => b.roi - a.roi);
  const pick = camps.slice(0, 2).concat(camps.slice(-1));
  return {
    title: `Ontem fechou em ROI ${f2(y.roi)}. O tráfego estava normal; o Pix pago despencou.`,
    summary: `ROI ${f2(y.roi)} ontem. O Face entregou normal; o Pix pago caiu de ${pc(v.pay_rate)} pra ${pc(y.pay_rate)}.`,
    content: {
      kpis: [
        { label: 'ROI real', value: f2(y.roi), note: 'média 7d ' + f2(avg('roi')), tone: y.roi < avg('roi') ? 'bad' : 'good' },
        { label: 'Lucro no bolso', value: brl(y.profit), note: 'média 7d ' + brl(avg('profit')), tone: y.profit < 0 ? 'bad' : 'good' },
        { label: 'Vendas reais', value: String(y.sales), note: 'Face contou ' + y.fb_purchases, tone: 'face' },
        { label: 'Conversão de quem entrou', value: f2(y.conv) + '%', note: 'média 7d ' + f2(avg('conv')) + '%', tone: 'bad' }
      ],
      changes: [
        { title: 'Pix pago caiu', value: pc(y.pay_rate), note: `média 7d ${pc(avg('pay_rate'))} · véspera ${pc(v.pay_rate)}`, tone: 'bad', series: days.slice(-7).map(d => Math.round(d.pay_rate)), hint: 'Checkout ou Pix da Kirvano entre 19h e 23h' },
        { title: 'Audience Network', value: 'ROI 0,31', note: '6% do gasto · quase ninguém compra', tone: 'warn', series: [.5, .42, .38, .4, .33, .35, .31], hint: 'Tirar esse posicionamento das campanhas novas' }
      ],
      normal: [`CPM R$ ${f2(y.cpm)}`, `CTR ${f2(y.ctr)}%`, `Chegada no app ${pc(y.arrival)}`, `Conversa ${pc(y.chat_rate)}`, `Ticket R$ ${f2(y.ticket)}`],
      campaigns: pick.map((c, i) => i < 2
        ? { id: c.id, suggestion: 'Subir +15%', tone: 'good', action: { type: 'budget', pct: 15 } }
        : { id: c.id, suggestion: 'Desligar', tone: 'bad', action: { type: 'pause' } }),
      analysis: [
        `O Face entregou como na véspera e como a média da semana: CPM R$ ${f2(y.cpm)}, CTR ${f2(y.ctr)}% e ${pc(y.arrival)} de quem clicou chegou no app. Dentro do app o ritmo também foi igual (${pc(y.chat_rate)} conversaram, ${pc(y.checkout_rate)} clicaram em comprar). A quebra foi na última etapa: ${y.pix} Pix gerados e só ${y.sales} pagos (${pc(y.pay_rate)}), contra ${pc(avg('pay_rate'))} de média. A queda se concentrou entre 19h e 23h, o que aponta pro checkout ou pro Pix da Kirvano nesse horário, não pra anúncio.`,
        'Este é um relatório de EXEMPLO, montado com os dados de demonstração. O de verdade é escrito pelo Claude todo dia às 07:00.'
      ],
      todo: ['Testar um Pix na Kirvano agora e conferir se o QR code abre e confirma rápido', 'Não desligar campanhas por causa de ontem: o tráfego estava saudável', 'Ver as sugestões de campanha abaixo e aprovar as que fizerem sentido', 'Subir imagens novas no lugar das que estão cansando', 'Tirar Audience Network das campanhas novas']
    }
  };
}

// cria tudo do zero (60 dias)
async function seed() {
  const today = T.today();
  const { hour } = T.parts();
  await db.transaction(async c => {
    await seedStructure(c);
    for (let ago = 59; ago >= 0; ago--) {
      const day = T.addDays(today, -ago);
      await writeDay(c, day, buildDay(day, ago, ago === 0 ? hour : 23), ago <= 2);
    }
    // recompra
    for (let ago = 59; ago >= 1; ago--) {
      const day = T.addDays(today, -ago);
      const { rows } = await c.query('SELECT revenue FROM app_daily WHERE day = $1', [day]);
      const d0 = Number(rows[0] && rows[0].revenue || 0);
      await c.query('INSERT INTO app_cohort (day, rev_d0, rev_d7, rev_d30) VALUES ($1,$2,$3,$4) ON CONFLICT (day) DO UPDATE SET rev_d0=$2, rev_d7=$3, rev_d30=$4',
        [day, d0, d0 * (ago >= 7 ? 1.17 : 1 + 0.17 * ago / 7), d0 * (ago >= 30 ? 1.31 : 1 + 0.31 * ago / 30)]);
    }
    await c.query(`INSERT INTO alerts (kind, severity, title, detail, ref, dedupe_key) VALUES
      ('account_down','bad','CA 05 foi desativada','BM Cobalto · ficaram R$ 130/dia sem conta','act_demo05','demo-acc05')`);
  });
  const s = require('./settings');
  await s.set('demo', { seeded_day: today, seeded_at: new Date().toISOString() });
  const rep = await demoReport(T.yesterday());
  await require('./reports').create({ ...rep, day: T.yesterday(), source: 'demo' });
}

// a cada coleta: refaz o "hoje" até a hora atual (e o fechamento de ontem na virada)
async function tick() {
  const today = T.today();
  const { hour } = T.parts();
  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM ad_accounts');
  if (rows[0].n === 0) return seed();
  await db.transaction(async c => {
    const y = T.yesterday();
    const has = await c.query(`SELECT 1 FROM app_hourly WHERE day = $1 AND hour = 23`, [y]);
    if (!has.rows.length) await writeDay(c, y, buildDay(y, 1, 23), true);
    await writeDay(c, today, buildDay(today, 0, hour), true);
  });
}

async function clear() {
  await db.transaction(async c => {
    for (const t of ['fb_daily', 'fb_hourly', 'fb_placement', 'app_daily', 'app_hourly', 'app_attrib', 'app_cohort', 'actions', 'alerts', 'reports', 'notes', 'ads', 'adsets', 'campaigns', 'ad_accounts', 'bms', 'domains', 'profiles', 'andromeda_log', 'sync_log']) {
      await c.query(`DELETE FROM ${t}`);
    }
    await c.query(`DELETE FROM settings WHERE key = 'demo'`);
  });
}

module.exports = { seed, tick, clear, demoReport };
