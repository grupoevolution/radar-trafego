// lib/metrics.js — as contas do Radar (usadas pelas telas, regras e pelo Claude)
//
// "Real" = vendas que caíram de verdade (app/Kirvano), ligadas ao anúncio pela
// etiqueta do link. O link pode trazer o ID ({{campaign.id}}) ou o NOME
// ({{campaign.name}}) — o Radar casa os dois.
const db = require('../db');
const T = require('./time');
const settings = require('./settings');

const n = v => Number(v) || 0;
const div = (a, b) => (b ? a / b : 0);

// ── totais por dia ───────────────────────────────────────────────────────
// opts.bm: só as contas daquela BM. As vendas por BM só contam as que vieram
// com etiqueta (utm_campaign = id da campanha) — o resto do funil do app não
// tem como ser dividido por BM.
const BM_ACCS = p => `(${p}::int IS NULL OR account_id IN (SELECT id FROM ad_accounts WHERE bm_id = ${p}::int))`;
const BM_CAMPS = p => `(SELECT c.id FROM campaigns c JOIN ad_accounts aa ON aa.id = c.account_id WHERE aa.bm_id = ${p}::int)`;

async function daySeries(from, to, opts = {}) {
  const bm = opts.bm ? Number(opts.bm) : null;
  const app = bm
    ? `LEFT JOIN (SELECT day, SUM(visitors)::int visitors, 0 chatted, 0 checkout, 0 pix, SUM(sales)::int sales, SUM(revenue)::float revenue,
                         0 refunds, 0::float refund_value, SUM(visitors)::int tagged_visitors
                  FROM app_attrib WHERE kind = 'campaign' AND day BETWEEN $1 AND $2 AND key IN ${BM_CAMPS('$3')} GROUP BY day) a ON a.day = d.day`
    : 'LEFT JOIN app_daily a ON a.day = d.day';
  const { rows } = await db.query(`
    WITH d AS (SELECT generate_series($1::date, $2::date, '1 day')::date AS day),
    f AS (SELECT day, SUM(spend)::float spend, SUM(impressions)::float impressions, SUM(link_clicks)::float clicks,
                 SUM(lpv)::float lpv, SUM(fb_purchases)::float fb_purchases, SUM(fb_revenue)::float fb_revenue
          FROM fb_daily WHERE level = 'account' AND day BETWEEN $1 AND $2 AND ${BM_ACCS('$3')} GROUP BY day)
    SELECT to_char(d.day, 'YYYY-MM-DD') AS day, COALESCE(f.spend,0) spend, COALESCE(f.impressions,0) impressions,
           COALESCE(f.clicks,0) clicks, COALESCE(f.lpv,0) lpv, COALESCE(f.fb_purchases,0) fb_purchases, COALESCE(f.fb_revenue,0) fb_revenue,
           COALESCE(a.visitors,0) visitors, COALESCE(a.chatted,0) chatted, COALESCE(a.checkout,0) checkout, COALESCE(a.pix,0) pix,
           COALESCE(a.sales,0) sales, COALESCE(a.revenue,0)::float revenue, COALESCE(a.refunds,0) refunds, COALESCE(a.refund_value,0)::float refund_value, COALESCE(a.tagged_visitors,0) tagged_visitors,
           (a.day IS NOT NULL) AS has_app
    FROM d LEFT JOIN f ON f.day = d.day ${app} ORDER BY d.day`, [from, to, bm]);
  const tax = (await settings.get('targets')).tax_pct / 100;
  return rows.map(r => enrich(r, tax));
}

function enrich(r, tax) {
  const o = {};
  for (const [k, v] of Object.entries(r)) o[k] = typeof v === 'string' && k !== 'day' ? Number(v) : v;
  o.cpm = div(o.spend, o.impressions) * 1000;
  o.ctr = div(o.clicks, o.impressions) * 100;
  o.cpc = div(o.spend, o.clicks);
  o.arrival = div(o.visitors, o.clicks) * 100;          // clicou → entrou
  o.chat_rate = div(o.chatted, o.visitors) * 100;
  o.checkout_rate = div(o.checkout, o.chatted) * 100;
  o.pix_rate = div(o.pix, o.checkout) * 100;
  o.pay_rate = div(o.sales, o.pix) * 100;
  o.conv = div(o.sales, o.visitors) * 100;               // comprou / entrou
  o.ticket = div(o.revenue, o.sales);
  o.tax = o.spend * tax;
  o.cost = o.spend + o.tax;                              // gasto + imposto = o custo de verdade
  o.roi = div(o.revenue, o.cost);                        // ROI real (já com imposto)
  o.roi_face = div(o.fb_revenue, o.spend);               // o que o Gerenciador mostra
  o.cpa = div(o.spend, o.sales);
  o.profit = o.revenue - o.spend - o.tax - (o.refund_value || 0);
  return o;
}

// soma vários dias num total só (pros filtros de período: 7 dias, este mês…)
const RAW = ['spend', 'impressions', 'clicks', 'lpv', 'fb_purchases', 'fb_revenue', 'visitors', 'chatted', 'checkout', 'pix', 'sales', 'revenue', 'refunds', 'refund_value', 'tagged_visitors'];
async function sumDays(rows) {
  const s = { day: rows.length ? rows[rows.length - 1].day : null };
  for (const k of RAW) s[k] = rows.reduce((a, r) => a + n(r[k]), 0);
  const tax = (await settings.get('targets')).tax_pct / 100;
  return enrich(s, tax);
}

// hoje (ou um dia) somando só até a hora H — pra comparar "no mesmo horário"
async function dayUntil(day, hour, opts = {}) {
  const bm = opts.bm ? Number(opts.bm) : null;
  const F = `FROM fb_hourly WHERE day=$1 AND hour<=$2 AND ${BM_ACCS('$3')}`;
  const { rows } = await db.query(`
    SELECT (SELECT COALESCE(SUM(spend),0) ${F})::float spend,
           (SELECT COALESCE(SUM(impressions),0) ${F})::float impressions,
           (SELECT COALESCE(SUM(link_clicks),0) ${F})::float clicks,
           (SELECT COALESCE(SUM(fb_purchases),0) ${F})::float fb_purchases,
           (SELECT COALESCE(SUM(fb_revenue),0) ${F})::float fb_revenue,
           0::float lpv,
           COALESCE(SUM(visitors),0)::float visitors, COALESCE(SUM(chatted),0)::float chatted, COALESCE(SUM(checkout),0)::float checkout,
           COALESCE(SUM(pix),0)::float pix, COALESCE(SUM(sales),0)::float sales, COALESCE(SUM(revenue),0)::float revenue, 0 refunds, 0::float refund_value
    FROM app_hourly WHERE day=$1 AND hour<=$2 AND $3::int IS NULL`, [day, hour, bm]);
  const tax = (await settings.get('targets')).tax_pct / 100;
  return enrich({ day, ...rows[0] }, tax);
}

async function hourly(day, opts = {}) {
  const bm = opts.bm ? Number(opts.bm) : null;
  const { rows } = await db.query(`
    WITH h AS (SELECT generate_series(0, 23) AS hour)
    SELECT h.hour, COALESCE(f.spend,0)::float spend, COALESCE(f.fbr,0)::float fb_revenue, COALESCE(a.revenue,0)::float revenue,
           COALESCE(a.sales,0)::int sales, COALESCE(a.visitors,0)::int visitors, COALESCE(f.clicks,0)::int clicks, (f.hour IS NOT NULL OR a.hour IS NOT NULL) AS has
    FROM h
    LEFT JOIN (SELECT hour, SUM(spend) spend, SUM(fb_revenue) fbr, SUM(link_clicks) clicks FROM fb_hourly WHERE day=$1 AND ${BM_ACCS('$2')} GROUP BY hour) f ON f.hour = h.hour
    LEFT JOIN app_hourly a ON a.day=$1 AND a.hour = h.hour AND $2::int IS NULL
    ORDER BY h.hour`, [day, bm]);
  return rows;
}

// ── campanhas e anúncios ─────────────────────────────────────────────────
// level: campaign | ad
// opts.bm: só uma BM · opts.all: inclui contas desativadas (padrão: só contas ativas)
async function objectRows(level, from, to, opts = {}) {
  const bm = opts.bm ? Number(opts.bm) : null;
  const tbl = level === 'campaign' ? 'campaigns' : 'ads';
  const { rows } = await db.query(`
    WITH f AS (
      SELECT object_id, SUM(spend)::float spend, SUM(impressions)::float impressions, SUM(link_clicks)::float clicks,
             SUM(fb_purchases)::float fb_purchases, SUM(fb_revenue)::float fb_revenue,
             CASE WHEN SUM(impressions) > 0 THEN SUM(frequency * impressions) / SUM(impressions) ELSE 0 END::float frequency
      FROM fb_daily WHERE level = $1 AND day BETWEEN $2 AND $3 GROUP BY object_id
    ),
    o AS (SELECT * FROM ${tbl}),
    att AS (SELECT key, SUM(visitors)::float visitors, SUM(sales)::float sales, SUM(revenue)::float revenue
            FROM app_attrib WHERE kind = $1 AND day BETWEEN $2 AND $3 GROUP BY key)
    SELECT o.*, ${level === 'ad' ? "c.name AS campaign_name, " : ''}
           a.name AS account_name, a.account_status, b.name AS bm_name,
           COALESCE(f.spend,0) spend, COALESCE(f.impressions,0) impressions, COALESCE(f.clicks,0) clicks,
           COALESCE(f.fb_purchases,0) fb_purchases, COALESCE(f.fb_revenue,0) fb_revenue, COALESCE(f.frequency,0) frequency,
           COALESCE(ai.visitors, an.visitors, 0) visitors, COALESCE(ai.sales, an.sales, 0) sales, COALESCE(ai.revenue, an.revenue, 0) revenue
           ${level === 'campaign' ? `, COALESCE(o.daily_budget, (SELECT SUM(s.daily_budget) FROM adsets s WHERE s.campaign_id = o.id AND s.status = 'ACTIVE')) AS budget,
              (SELECT COUNT(*) FROM ads x WHERE x.campaign_id = o.id AND x.status = 'ACTIVE')::int AS active_ads` : ''}
    FROM o
    ${level === 'ad' ? 'LEFT JOIN campaigns c ON c.id = o.campaign_id' : ''}
    LEFT JOIN ad_accounts a ON a.id = o.account_id
    LEFT JOIN bms b ON b.id = a.bm_id
    LEFT JOIN f ON f.object_id = o.id
    LEFT JOIN att ai ON ai.key = o.id
    LEFT JOIN att an ON ai.key IS NULL AND LOWER(an.key) = LOWER(o.name)
                    AND (SELECT COUNT(*) FROM ${tbl} u WHERE LOWER(u.name) = LOWER(o.name)) = 1
    WHERE (f.object_id IS NOT NULL OR o.status = 'ACTIVE')
      AND ($4::int IS NULL OR a.bm_id = $4::int)
      AND ($5::boolean OR a.account_status = 1)`, [level, from, to, bm, !!opts.all]);
  const tg = await settings.get('targets');
  const tax = tg.tax_pct / 100;
  const today = T.today();
  return rows.map(r => {
    const o = { ...r };
    for (const k of ['spend', 'impressions', 'clicks', 'fb_purchases', 'fb_revenue', 'frequency', 'visitors', 'sales', 'revenue', 'budget']) o[k] = o[k] === null || o[k] === undefined ? o[k] : Number(o[k]);
    o.cpm = div(o.spend, o.impressions) * 1000;
    o.ctr = div(o.clicks, o.impressions) * 100;
    o.cpc = div(o.spend, o.clicks);
    o.cost = o.spend * (1 + tax);
    o.roi = div(o.revenue, o.cost);
    o.roi_face = div(o.fb_revenue, o.spend);
    o.cpa = o.sales ? o.spend / o.sales : null;
    o.cpa_face = o.fb_purchases ? o.spend / o.fb_purchases : null;
    const start = o.start_time || o.created_time;
    o.days_on = start ? Math.max(0, T.daysBetween(new Date(start).toLocaleDateString('sv-SE', { timeZone: T.TZ }), today)) : null;
    o.signal = signal(o, tg);
    return o;
  });
}

function signal(o, tg) {
  if (o.status && o.status !== 'ACTIVE') return 'off';
  if (o.spend < tg.cpa_target * 2) return 'learning';
  if (!o.visitors && !o.sales) return 'notag';           // sem etiqueta no link: não dá pra julgar pelo ROI real
  if (o.roi >= tg.roi_goal * 1.1) return 'scale';
  if (o.roi < 0.9 && o.spend >= tg.cpa_target * 3) return 'cut';
  if (o.frequency >= 3) return 'tired';
  return 'keep';
}

// orçamento diário das campanhas ligadas, só de contas ativas (CBO = campanha; ABO = soma dos conjuntos)
async function budgetByBm() {
  const { rows } = await db.query(`
    SELECT a.bm_id, SUM(COALESCE(c.daily_budget,
             (SELECT SUM(s.daily_budget) FROM adsets s WHERE s.campaign_id = c.id AND s.status = 'ACTIVE'), 0))::float AS total
    FROM campaigns c JOIN ad_accounts a ON a.id = c.account_id
    WHERE c.status = 'ACTIVE' AND a.account_status = 1 AND a.bm_id IS NOT NULL
    GROUP BY a.bm_id`);
  return rows;
}
async function budgetToday(bm) {
  return (await budgetByBm()).filter(r => !bm || r.bm_id === Number(bm)).reduce((s, r) => s + r.total, 0);
}
async function logBudget(day) {
  for (const r of await budgetByBm()) {
    await db.query(`INSERT INTO budget_log (day, bm_id, total, updated_at) VALUES ($1,$2,$3,NOW())
                    ON CONFLICT (day, bm_id) DO UPDATE SET total = $3, updated_at = NOW()`, [day, r.bm_id, r.total]);
  }
}
// soma dos orçamentos registrados no período (hoje: o orçamento ao vivo)
async function budgetRange(from, to, bm) {
  const today = T.today();
  const { rows } = await db.query(
    `SELECT COALESCE(SUM(total),0)::float t FROM budget_log WHERE day BETWEEN $1 AND $2 AND day < $3 AND ($4::int IS NULL OR bm_id = $4::int)`,
    [from, to, today, bm ? Number(bm) : null]);
  return rows[0].t + (to >= today && from <= today ? await budgetToday(bm) : 0);
}

// série diária de um objeto (pra minigráficos e cansaço)
async function objectSeries(level, ids, from, to) {
  if (!ids.length) return {};
  const { rows } = await db.query(`
    SELECT f.object_id, to_char(f.day,'YYYY-MM-DD') AS day, f.spend::float, f.impressions::float, f.link_clicks::float clicks, f.frequency::float,
           COALESCE(ai.revenue, an.revenue, 0)::float revenue, COALESCE(ai.sales, an.sales, 0)::float sales
    FROM fb_daily f
    LEFT JOIN ${level === 'campaign' ? 'campaigns' : 'ads'} o ON o.id = f.object_id
    LEFT JOIN app_attrib ai ON ai.day = f.day AND ai.kind = $1 AND ai.key = f.object_id
    LEFT JOIN app_attrib an ON ai.key IS NULL AND an.day = f.day AND an.kind = $1 AND LOWER(an.key) = LOWER(o.name)
    WHERE f.level = $1 AND f.object_id = ANY($2) AND f.day BETWEEN $3 AND $4 ORDER BY f.day`, [level, ids, from, to]);
  const out = {};
  for (const r of rows) {
    (out[r.object_id] = out[r.object_id] || []).push({ day: r.day, spend: r.spend, ctr: div(r.clicks, r.impressions) * 100, freq: r.frequency, roi: div(r.revenue, r.spend), sales: r.sales });
  }
  return out;
}

// cansaço 0–100: frequência alta + CTR caindo em relação a 5 dias atrás
function fatigue(series) {
  if (!series || series.length < 3) return { score: 0, ctr_drop: 0, freq: series && series.length ? series[series.length - 1].freq : 0 };
  const last = series[series.length - 1];
  const base = series[Math.max(0, series.length - 6)];
  const drop = base.ctr ? Math.max(0, (base.ctr - last.ctr) / base.ctr * 100) : 0;
  const score = Math.min(100, Math.round(Math.max(0, last.freq - 1.2) / 2.2 * 55 + drop / 40 * 45));
  return { score, ctr_drop: drop, freq: last.freq };
}

// posicionamento: Face (gasto/cliques) + vendas reais pela etiqueta {{placement}}
function placementGroup(p) {
  const s = String(p || '').toLowerCase();
  if (s.includes('audience') || s === 'an' || s.startsWith('an_')) return 'Audience Network';
  if (s.includes('reel')) return 'Reels';
  if (s.includes('stor')) return 'Stories';
  if (s.includes('feed')) return 'Feed';
  if (s.includes('explore')) return 'Explorar';
  return 'Outros';
}
async function placements(from, to) {
  const [f, a] = await Promise.all([
    db.query(`SELECT placement, SUM(spend)::float spend, SUM(impressions)::float impressions, SUM(link_clicks)::float clicks FROM fb_placement WHERE day BETWEEN $1 AND $2 GROUP BY 1`, [from, to]),
    db.query(`SELECT key, SUM(visitors)::float visitors, SUM(sales)::float sales, SUM(revenue)::float revenue FROM app_attrib WHERE kind='placement' AND day BETWEEN $1 AND $2 GROUP BY 1`, [from, to])
  ]);
  const g = {};
  const G = k => (g[k] = g[k] || { name: k, spend: 0, impressions: 0, clicks: 0, visitors: 0, sales: 0, revenue: 0 });
  for (const r of f.rows) { const x = G(placementGroup(r.placement)); x.spend += r.spend; x.impressions += r.impressions; x.clicks += r.clicks; }
  for (const r of a.rows) { const x = G(placementGroup(r.key)); x.visitors += r.visitors; x.sales += r.sales; x.revenue += r.revenue; }
  const total = Object.values(g).reduce((s, x) => s + x.spend, 0);
  return Object.values(g).filter(x => x.spend > 0).map(x => ({
    ...x, share: div(x.spend, total) * 100, cpm: div(x.spend, x.impressions) * 1000, ctr: div(x.clicks, x.impressions) * 100,
    conv: div(x.sales, x.visitors) * 100, roi: div(x.revenue, x.spend), has_sales: a.rows.length > 0
  })).sort((a, b) => b.spend - a.spend);
}

// decomposição do ROI entre dois dias: quanto cada elo explica da diferença
function decompose(A, B) {
  const f = [
    ['CPM', 'custo pra aparecer', A.cpm, B.cpm, true],
    ['CTR', 'quem clicou', A.ctr, B.ctr],
    ['Chegada', 'clicou e entrou no app', A.arrival, B.arrival],
    ['Conversão', 'comprou no app', A.conv, B.conv],
    ['Ticket', 'valor por venda', A.ticket, B.ticket],
  ];
  const total = Math.log(div(B.roi, A.roi) || 1);
  return f.map(([name, hint, a, b, inv]) => {
    let r = a && b ? b / a : 1;
    if (inv) r = 1 / r;
    const l = Math.log(r || 1);
    return { name, hint, a, b, change_pct: a ? (b - a) / a * 100 : 0, effect: l, share: total ? Math.round(l / total * 100) : 0 };
  });
}

module.exports = { daySeries, sumDays, dayUntil, hourly, objectRows, budgetToday, budgetRange, logBudget, objectSeries, fatigue, placements, placementGroup, decompose, enrich, div };
