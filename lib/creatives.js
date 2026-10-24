// lib/creatives.js — criativos agrupados por IMAGEM (mesmo hash = mesma foto em qualquer conta/BM)
const T = require('./time');
const settings = require('./settings');
const metrics = require('./metrics');

const r2 = v => Math.round((v || 0) * 100) / 100;

async function byImage(from, to, bm) {
  const days = T.daysBetween(from, to) + 1;
  const ads = (await metrics.objectRows('ad', from, to, { bm })).filter(a => a.spend > 0 || a.status === 'ACTIVE');
  const series = await metrics.objectSeries('ad', ads.map(a => a.id), from, to);
  const tg = await settings.get('targets');
  const tax = tg.tax_pct / 100;
  const byReal = ads.some(a => a.sales > 0);
  const dayList = []; for (let d = from; d <= to; d = T.addDays(d, 1)) dayList.push(d);
  const groups = new Map();
  for (const a of ads) {
    const k = a.img_key || 'ad:' + a.id;
    let g = groups.get(k);
    if (!g) groups.set(k, g = { key: k, grouped: !!a.img_key, ads: [], camps: new Map(), bms: new Set(), thumb: null, top: null,
      spend: 0, impressions: 0, clicks: 0, sales: 0, revenue: 0, fb_purchases: 0, days_on: 0, active: false,
      day: Object.fromEntries(dayList.map(d => [d, { spend: 0, sales: 0, revenue: 0, fb: 0 }])) });
    g.ads.push(a.id);
    for (const f of ['spend', 'impressions', 'clicks', 'sales', 'revenue', 'fb_purchases']) g[f] += a[f] || 0;
    if (a.bm_name) g.bms.add(a.bm_name);
    if (a.status === 'ACTIVE') g.active = true;
    if (a.days_on != null) g.days_on = Math.max(g.days_on, a.days_on);
    if (!g.top || a.spend > g.top.spend) g.top = a;
    if (a.thumb_url && (!g.thumb || a.spend >= g.top.spend)) g.thumb = a.thumb_url;
    const c = g.camps.get(a.campaign_id) || { id: a.campaign_id, name: a.campaign_name, bm: a.bm_name, account: a.account_name, on: false, spend: 0, sales: 0, revenue: 0, fb_purchases: 0 };
    c.spend += a.spend; c.sales += a.sales; c.revenue += a.revenue; c.fb_purchases += a.fb_purchases; if (a.status === 'ACTIVE') c.on = true;
    g.camps.set(a.campaign_id, c);
    for (const x of series[a.id] || []) { const b = g.day[x.day]; if (b) { b.spend += x.spend; b.sales += x.sales; b.revenue += x.revenue; b.fb += x.fb_purchases; } }
  }
  const roiOf = (rev, sp) => metrics.div(rev, sp * (1 + tax));
  const minSpend = Math.max(15, tg.cpa_target * 2);
  const out = [...groups.values()].map(g => {
    const s = dayList.map(d => { const b = g.day[d]; return { day: d, spend: r2(b.spend), sales: byReal ? b.sales : b.fb, roi: byReal ? r2(roiOf(b.revenue, b.spend)) : null }; });
    const sales = byReal ? g.sales : g.fb_purchases;
    // situação: compara os últimos 3 dias com os 4 anteriores
    const last = s.slice(-3), prev = s.slice(-7, -3);
    const sum = (l, f) => l.reduce((t, x) => t + (x[f] || 0), 0);
    const ls = sum(last, 'sales'), lsp = sum(last, 'spend'), ps = sum(prev, 'sales'), psp = sum(prev, 'spend');
    let state = 'good';
    if (!g.active) state = 'off';
    else if (g.days_on <= 2) state = 'new';
    else if (lsp >= minSpend && ls === 0) state = 'stopped';
    else if (ps > 0 && psp > 0 && metrics.div(ls, lsp) < metrics.div(ps, psp) * 0.7) state = 'falling';
    const camps = [...g.camps.values()].map(c => ({ ...c, spend: r2(c.spend), roi: r2(roiOf(c.revenue, c.spend)), sales: byReal ? c.sales : c.fb_purchases })).sort((a, b) => b.spend - a.spend);
    return { key: g.key, grouped: g.grouped, name: g.top.name, thumb: g.thumb, days_on: g.days_on, active: g.active, state,
      ads: g.ads.length, campaigns: camps.length, bms: [...g.bms], spend: r2(g.spend), sales, revenue: r2(g.revenue),
      roi: byReal ? r2(roiOf(g.revenue, g.spend)) : null, cpa: sales ? r2(g.spend / sales) : null,
      ctr: r2(metrics.div(g.clicks, g.impressions) * 100), series: s, camps };
  });
  out.sort((a, b) => b.sales - a.sales || b.spend - a.spend);
  out.forEach((x, i) => { x.rank = x.spend >= minSpend && x.sales > 0 ? i + 1 : null; });
  return { from, to, days, by: byReal ? 'real' : 'face', roi_goal: tg.roi_goal, images: out,
    ungrouped: out.filter(x => !x.grouped).length };
}

module.exports = { byImage };
