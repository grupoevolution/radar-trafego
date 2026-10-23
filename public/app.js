/* Argos — app do painel (PC completo + versão de celular). Sem framework. */
(function () {
'use strict';

/* ───────────────────────── utilidades ───────────────────────── */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const I = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9.5" r="1.6"/><path d="M3 17l5-5 4 4 3-3 6 6"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  tree: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-2h12v2"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  doc: '<path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h4"/>',
  plug: '<path d="M9 7V3M15 7V3M7 7h10v4a5 5 0 0 1-10 0zM12 16v5"/>',
  alert: '<path d="M12 3l9.5 17h-19zM12 10v4M12 17.5v.01"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  arrowR: '<path d="M9 6l6 6-6 6"/>',
  arrowL: '<path d="M15 6l-6 6 6 6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
  undo: '<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>',
  photo: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9.5" r="1.6"/><path d="M3 17l5-5 4 4 3-3 6 6"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
  bm: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  meta: '<path d="M3 15c0-4 2-8 4.5-8S12 12 12 12s2-5 4.5-5S21 11 21 15c0 2-1 3-2.5 3S15 15 12 12c-3 3-4 6-6.5 6S3 17 3 15z"/>',
  andro: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
  app: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10 18h4"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
  shield: '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L3 9M3 4v5h5M4 13a8 8 0 0 0 14.5 4.5L21 15M21 20v-5h-5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  moon: '<path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18h2"/>',
  logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  flag: '<path d="M5 21V4M5 4h11l-2.5 4L16 12H5"/>'
};
const LOGO = '<svg class="logo" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lgA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2563EB"/><stop offset="1" stop-color="#06B6D4"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#lgA)"/><path d="M8 32 Q32 10 56 32 Q32 54 8 32 Z" fill="none" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"/><circle cx="32" cy="32" r="8.5" fill="#fff"/><circle cx="32" cy="32" r="3.5" fill="#1D4ED8"/></svg>';
const GRAD = '<defs><linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--bar-a)"/><stop offset="1" style="stop-color:var(--bar-b)"/></linearGradient><linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--gold);stop-opacity:.32"/><stop offset="1" style="stop-color:var(--gold);stop-opacity:0"/></linearGradient></defs>';
const ic = n => `<svg class="i" viewBox="0 0 24 24">${I[n] || ''}</svg>`;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (v, d = 0) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const brl = (v, d = 0) => ((Number(v) || 0) < 0 ? '−' : '') + 'R$ ' + nf(Math.abs(Number(v) || 0), d);
const pct = (v, d = 1) => nf(v, d) + '%';
const f2 = v => nf(v, 2);
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const div = (a, b) => (b ? a / b : 0);
const dayLabel = d => { if (!d) return ''; const [y, m, dd] = d.split('-'); const w = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date(d + 'T12:00:00Z').getUTCDay()]; return `${w} ${dd}/${m}`; };
const shortDay = d => d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '';
const ago = iso => { if (!iso) return 'nunca'; const s = (Date.now() - new Date(iso)) / 1000; if (s < 60) return 'agora'; if (s < 3600) return `há ${Math.round(s / 60)} min`; if (s < 86400) return `há ${Math.round(s / 3600)} h`; return `há ${Math.round(s / 86400)} dias`; };
const hhmm = iso => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

function delta(cur, prev, invert) {
  if (!prev) return '';
  const d = (cur - prev) / Math.abs(prev) * 100;
  if (!isFinite(d)) return '';
  const good = invert ? d < 0 : d > 0;
  const cls = Math.abs(d) < 3 ? 'muted' : good ? 'up' : 'down';
  return `<span class="delta ${cls}">${d > 0 ? '+' : '−'}${nf(Math.abs(d), 0)}%</span>`;
}

async function api(path, opts = {}) {
  const r = await fetch('/api' + path, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers: opts.body ? { 'Content-Type': 'application/json' } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin'
  });
  let j = {};
  try { j = await r.json(); } catch (e) {}
  if (r.status === 401 && path !== '/login') { showLogin(); throw new Error('Faça login'); }
  if (!r.ok) throw new Error(j.error || ('Erro ' + r.status));
  return j;
}

let toastT;
function toast(msg, err) {
  const t = $('#toast');
  t.className = 'toast' + (err ? ' err' : '');
  t.innerHTML = ic(err ? 'alert' : 'check') + esc(msg);
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => (t.hidden = true), err ? 5000 : 2800);
}

/* janela de confirmação/formulário. onOk(valores) pode lançar erro → mostra e não fecha */
function sheet({ title, body = '', ok = 'Confirmar', cancel = 'Cancelar', onOk, wide, danger, noOk }) {
  const s = $('#sheet');
  s.innerHTML = `<div class="sheet${wide ? ' wide' : ''}" role="dialog" aria-modal="true"><h3>${title}</h3>${body}
    <div class="err" id="sheetErr"></div>
    <div class="btns">${noOk ? '' : `<button class="btn ${danger ? 'danger' : 'primary'}" id="okB">${ic('check')}${ok}</button>`}<button class="btn" id="noB">${noOk ? 'Fechar' : cancel}</button></div></div>`;
  s.hidden = false;
  const close = () => { s.hidden = true; s.innerHTML = ''; };
  $('#noB').onclick = close;
  s.onclick = e => { if (e.target === s) close(); };
  const okB = $('#okB');
  if (okB) okB.onclick = async () => {
    const vals = {};
    $$('[name]', s).forEach(el => { vals[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
    okB.disabled = true;
    try { await onOk(vals); close(); }
    catch (err) { $('#sheetErr').textContent = err.message; okB.disabled = false; }
  };
  setTimeout(() => { const f = $('input,select,textarea', s) || okB; f && f.focus(); }, 30);
}

/* ───────────────────────── gráficos (SVG) ───────────────────────── */
function axisY(W, H, p, min, max, ticks, fmt) {
  let s = '';
  for (let i = 0; i <= ticks; i++) {
    const v = min + (max - min) * i / ticks, y = H - p.b - (H - p.t - p.b) * i / ticks;
    s += `<line class="grid-l" x1="${p.l}" x2="${W - p.r}" y1="${y}" y2="${y}"/><text x="${p.l - 8}" y="${y + 3}" text-anchor="end">${fmt(v)}</text>`;
  }
  return s;
}
const niceMax = v => { if (v <= 0) return 1; const e = Math.pow(10, Math.floor(Math.log10(v))); const m = v / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e; };
const kfmt = v => v >= 1000 ? 'R$' + nf(v / 1000, v % 1000 ? 1 : 0) + 'k' : 'R$' + nf(v);

function spark(data, color, w = 120, h = 32) {
  const d = (data || []).filter(x => isFinite(x));
  if (d.length < 2) return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:${h}px"><line x1="3" x2="${w - 3}" y1="${h / 2}" y2="${h / 2}" stroke="${css('--line-2')}" stroke-dasharray="3 3"/></svg>`;
  const mn = Math.min(...d), mx = Math.max(...d), r = mx - mn || 1;
  const pts = d.map((v, i) => [i / (d.length - 1) * (w - 6) + 3, h - 4 - (v - mn) / r * (h - 10)]);
  const P = pts.map(p => p.join(',')).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:${h}px;display:block"><path d="M${pts.map(p => p.join(',')).join(' L')} L${w - 3},${h} L3,${h}Z" fill="${color}" fill-opacity=".12"/><polyline points="${P}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/><circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="3" fill="${color}"/></svg>`;
}

function hourChart(hours, upto) {
  const W = 640, H = 230, p = { l: 48, r: 8, t: 10, b: 24 };
  const hs = hours.filter(h => h.hour <= upto);
  const max = niceMax(Math.max(10, ...hs.map(h => Math.max(h.revenue, h.fb_revenue, h.spend))));
  const n = 24, bw = (W - p.l - p.r) / n, y = v => H - p.b - (H - p.t - p.b) * v / max;
  let s = GRAD + axisY(W, H, p, 0, max, 4, kfmt);
  hours.forEach((h, i) => {
    const x = p.l + i * bw;
    if (h.hour <= upto) {
      if (h.fb_revenue > 0) s += `<rect x="${x + bw * .16}" y="${y(h.fb_revenue)}" width="${bw * .68}" height="${H - p.b - y(h.fb_revenue)}" rx="3" fill="${css('--face-soft')}" stroke="${css('--face')}" stroke-dasharray="2 2" stroke-width=".8"/>`;
      if (h.revenue > 0) s += `<rect x="${x + bw * .16}" y="${y(h.revenue)}" width="${bw * .68}" height="${H - p.b - y(h.revenue)}" rx="3" fill="url(#gBar)"><title>${h.hour}h · faturamento ${brl(h.revenue)} · gasto ${brl(h.spend)}</title></rect>`;
    }
    if (i % 3 === 0) s += `<text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${String(h.hour).padStart(2, '0')}h</text>`;
  });
  const pts = hs.map((h, i) => `${p.l + i * bw + bw / 2},${y(h.spend)}`);
  if (pts.length > 1) s += `<polyline points="${pts.join(' ')}" fill="none" stroke="${css('--fg')}" stroke-width="2" stroke-linejoin="round"/>`;
  if (pts.length) { const [lx, ly] = pts[pts.length - 1].split(','); s += `<circle cx="${lx}" cy="${ly}" r="4" fill="${css('--fg')}" stroke="${css('--surface')}" stroke-width="2"/>`; }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${s}</svg>`;
}

function daysChart(days, goal) {
  const W = 700, H = 240, p = { l: 48, r: 40, t: 16, b: 26 };
  if (!days.length) return '<div class="empty">Sem dias nesse período.</div>';
  const max = niceMax(Math.max(10, ...days.map(d => d.spend)));
  const live = days.map((d, i) => [i, d]).filter(([, d]) => d.spend > 0);
  const rmax = Math.ceil((Math.max(goal, 1, ...live.map(([, d]) => d.roi)) + .2) * 5) / 5;
  const n = days.length, gw = (W - p.l - p.r) / n;
  const y = v => H - p.b - (H - p.t - p.b) * v / max, yr = v => H - p.b - (H - p.t - p.b) * v / rmax;
  let s = GRAD + axisY(W, H, p, 0, max, 4, kfmt);
  for (let i = 1; i <= 3; i++) { const v = rmax * i / 3; s += `<text x="${W - p.r + 6}" y="${yr(v) + 3}">${nf(v, 1)}</text>`; }
  s += `<line x1="${p.l}" x2="${W - p.r}" y1="${yr(goal)}" y2="${yr(goal)}" stroke="${css('--good')}" stroke-dasharray="4 4"/><text x="${W - p.r - 4}" y="${yr(goal) - 5}" text-anchor="end" style="fill:${css('--good')}">meta ${nf(goal, 1)}</text>`;
  const step = Math.ceil(n / 10);
  days.forEach((d, i) => {
    const x = p.l + i * gw;
    if (d.spend > 0) s += `<rect x="${x + gw * .2}" y="${y(d.spend)}" width="${gw * .6}" height="${H - p.b - y(d.spend)}" rx="3" fill="url(#gBar)"><title>${dayLabel(d.day)} · gasto ${brl(d.spend)} · ROI real ${f2(d.roi)}</title></rect>`;
    if (i % step === 0 || i === n - 1) s += `<text x="${x + gw / 2}" y="${H - 8}" text-anchor="middle">${shortDay(d.day)}</text>`;
  });
  if (live.length > 1) {
    const pts = live.map(([i, d]) => [p.l + i * gw + gw / 2, yr(d.roi)]);
    s += `<path d="M${pts[0][0]},${H - p.b} L${pts.map(q => q.join(',')).join(' L')} L${pts[pts.length - 1][0]},${H - p.b}Z" fill="url(#gArea)"/><polyline points="${pts.map(q => q.join(',')).join(' ')}" fill="none" stroke="${css('--gold')}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const [lx, ly] = pts[pts.length - 1];
    s += `<circle cx="${lx}" cy="${ly}" r="9" fill="${css('--gold')}" opacity=".18"/><circle cx="${lx}" cy="${ly}" r="4.5" fill="${css('--gold')}" stroke="${css('--surface')}" stroke-width="2"/>`;
  }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${s}</svg>`;
}

function roiLine(series, notes, goal) {
  const W = 900, H = 250, p = { l: 36, r: 14, t: 40, b: 24 };
  const vals = series.map(d => d.roi);
  const mn = Math.max(0, Math.floor((Math.min(goal, ...vals) - .2) * 5) / 5), mx = Math.ceil((Math.max(goal, ...vals) + .2) * 5) / 5;
  const n = series.length;
  const x = i => p.l + (W - p.l - p.r) * i / Math.max(1, n - 1), y = v => H - p.b - (H - p.t - p.b) * (v - mn) / ((mx - mn) || 1);
  let s = axisY(W, H, p, mn, mx, 4, v => nf(v, 1));
  s += `<rect x="${p.l}" y="${y(mx)}" width="${W - p.l - p.r}" height="${Math.max(0, y(goal) - y(mx))}" fill="${css('--good-soft')}"/><text x="${W - p.r - 6}" y="${y(goal) - 6}" text-anchor="end" style="fill:${css('--good')}">meta ${nf(goal, 1)}+</text>`;
  const idx = Object.fromEntries(series.map((d, i) => [d.day, i]));
  const seen = {};
  let k = 0;
  [...(notes || [])].sort((a, b) => a.day < b.day ? -1 : 1).forEach(nt => {
    const i = idx[nt.day]; if (i === undefined || seen[i]) return; seen[i] = 1;
    const ty = k++ % 2 ? p.t - 2 : p.t - 16;
    const t = nt.title.length > 24 ? nt.title.slice(0, 23) + '…' : nt.title;
    s += `<g class="ann"><line x1="${x(i)}" x2="${x(i)}" y1="${ty + 4}" y2="${H - p.b}" stroke="${css('--warn')}" stroke-dasharray="3 3"/><text x="${x(i) + 5}" y="${ty}"><title>${esc(nt.title)}</title>${esc(t)}</text></g>`;
  });
  const pts = series.map((d, i) => `${x(i)},${y(d.roi)}`);
  s += `<path d="M${x(0)},${H - p.b} L${pts.join(' L')} L${x(n - 1)},${H - p.b}Z" fill="${css('--gold-soft')}"/><polyline points="${pts.join(' ')}" fill="none" stroke="${css('--gold')}" stroke-width="2.2" stroke-linejoin="round"/>`;
  series.forEach((d, i) => {
    s += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${shortDay(d.day)}</text>`;
    const last = i >= n - 2;
    s += `<circle cx="${x(i)}" cy="${y(d.roi)}" r="${last ? 4.5 : 2.5}" fill="${d.roi >= goal ? css('--good') : d.roi < 1.1 ? css('--bad') : css('--gold')}" stroke="${css('--surface')}" stroke-width="2"><title>${dayLabel(d.day)} · ROI ${f2(d.roi)}</title></circle>`;
    if (last) s += `<text x="${x(i)}" y="${y(d.roi) - 10}" text-anchor="middle" style="fill:${css('--fg')};font-weight:600">${f2(d.roi)}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${s}</svg>`;
}

function barsChart(data, fmt, opt = {}) {
  const W = opt.W || 320, H = opt.H || 170, p = { l: opt.l || 36, r: 8, t: 18, b: 28 };
  const vals = data.map(d => d[1] || 0);
  const max = niceMax(Math.max(...vals, opt.min || 0) * 1.1);
  const n = data.length || 1, bw = (W - p.l - p.r) / n, y = v => H - p.b - (H - p.t - p.b) * v / max;
  let s = axisY(W, H, p, 0, max, 3, opt.ax || (v => nf(v, 1)));
  if (opt.goal) s += `<line x1="${p.l}" x2="${W - p.r}" y1="${y(opt.goal)}" y2="${y(opt.goal)}" stroke="${css('--good')}" stroke-dasharray="4 3"/>`;
  data.forEach(([l, v, hi], i) => {
    const x = p.l + i * bw + bw * .2, w = bw * .6;
    if (v == null) { s += `<text x="${x + w / 2}" y="${H - p.b - 6}" text-anchor="middle">—</text>`; }
    else s += `<rect x="${x}" y="${y(v)}" width="${w}" height="${H - p.b - y(v)}" rx="4" fill="${hi ? css('--gold') : css('--face-soft')}" stroke="${hi ? 'none' : css('--face')}" stroke-width=".8"/><text x="${x + w / 2}" y="${y(v) - 6}" text-anchor="middle" style="fill:${css('--fg')};font-weight:600">${fmt(v)}</text>`;
    s += `<text x="${x + w / 2}" y="${H - 10}" text-anchor="middle">${esc(l)}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${s}</svg>`;
}

function scatterChart(days, ideal, goal) {
  const W = 640, H = 300, p = { l: 40, r: 12, t: 14, b: 30 };
  if (!days.length) return '<div class="empty">Sem dias suficientes ainda.</div>';
  const sp = days.map(d => d.spend), rs = days.map(d => d.roi);
  const xmin = Math.floor(Math.min(...sp) / 500) * 500, xmax = Math.ceil(Math.max(...sp) / 500) * 500 || 1000;
  const ymin = Math.max(0, Math.floor((Math.min(...rs, goal) - .2) * 5) / 5), ymax = Math.ceil((Math.max(...rs, goal) + .2) * 5) / 5;
  const x = v => p.l + (W - p.l - p.r) * (v - xmin) / ((xmax - xmin) || 1), y = v => H - p.b - (H - p.t - p.b) * (v - ymin) / ((ymax - ymin) || 1);
  let s = axisY(W, H, p, ymin, ymax, 4, v => nf(v, 1));
  for (let v = xmin; v <= xmax; v += xmax - xmin > 3000 ? 1000 : 500) s += `<text x="${x(v)}" y="${H - 10}" text-anchor="middle">${kfmt(v)}</text>`;
  if (ideal) s += `<rect x="${x(ideal.from)}" y="${p.t}" width="${Math.max(0, x(Math.min(ideal.to, xmax)) - x(ideal.from))}" height="${H - p.t - p.b}" fill="${css('--gold-soft')}" rx="4"/><text x="${(x(ideal.from) + x(Math.min(ideal.to, xmax))) / 2}" y="${p.t + 14}" text-anchor="middle" style="fill:${css('--gold')};font-weight:600;font-family:var(--f-body)">ponto ideal</text>`;
  s += `<line x1="${p.l}" x2="${W - p.r}" y1="${y(goal)}" y2="${y(goal)}" stroke="${css('--good')}" stroke-dasharray="4 3"/>`;
  days.forEach(d => { const c = d.roi >= goal ? css('--good') : d.roi >= 1.2 ? css('--gold') : css('--bad'); s += `<circle cx="${x(d.spend)}" cy="${y(d.roi)}" r="5" fill="${c}" fill-opacity=".85" stroke="${css('--surface')}" stroke-width="1"><title>${dayLabel(d.day)} · ${brl(d.spend)} · ROI ${f2(d.roi)}</title></circle>`; });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${s}</svg>`;
}

function cohortChart(rows) {
  const W = 900, H = 220, p = { l: 36, r: 10, t: 12, b: 26 };
  if (!rows.length) return '<div class="empty">A recompra aparece depois que o app estiver conectado por alguns dias.</div>';
  const data = rows.slice(-24);
  const max = niceMax(Math.max(...data.map(d => Math.max(d.d0, d.d7 || 0, d.d30 || 0))) * 1.05);
  const n = data.length, gw = (W - p.l - p.r) / n, y = v => H - p.b - (H - p.t - p.b) * v / max;
  let s = axisY(W, H, p, 0, max, 4, v => nf(v, 1));
  data.forEach((d, i) => {
    const x = p.l + i * gw, bw = gw * .24;
    s += `<rect x="${x + gw * .1}" y="${y(d.d0)}" width="${bw}" height="${H - p.b - y(d.d0)}" rx="3" fill="${css('--face-soft')}" stroke="${css('--face')}" stroke-width=".8"><title>No dia: ${f2(d.d0)}</title></rect>`;
    if (d.d7 != null) s += `<rect x="${x + gw * .1 + bw + 2}" y="${y(d.d7)}" width="${bw}" height="${H - p.b - y(d.d7)}" rx="3" fill="${css('--info')}"><title>7 dias: ${f2(d.d7)}</title></rect>`;
    if (d.d30 != null) s += `<rect x="${x + gw * .1 + 2 * bw + 4}" y="${y(d.d30)}" width="${bw}" height="${H - p.b - y(d.d30)}" rx="3" fill="${css('--gold')}"><title>30 dias: ${f2(d.d30)}</title></rect>`;
    s += `<text x="${x + gw / 2}" y="${H - 8}" text-anchor="middle">${shortDay(d.day)}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${s}</svg>`;
}

function chart7(days) {
  const W = 700, H = 230, p = { l: 48, r: 40, t: 14, b: 26 };
  const max = niceMax(Math.max(10, ...days.map(d => Math.max(d.spend, d.revenue))));
  const rs = days.map(d => d.roi_real);
  const rmin = Math.max(0, Math.floor((Math.min(...rs) - .2) * 5) / 5), rmax = Math.ceil((Math.max(...rs) + .2) * 5) / 5;
  const n = days.length, gw = (W - p.l - p.r) / n;
  const y = v => H - p.b - (H - p.t - p.b) * v / max, yr = v => H - p.b - (H - p.t - p.b) * (v - rmin) / ((rmax - rmin) || 1);
  let s = axisY(W, H, p, 0, max, 4, kfmt);
  for (let i = 0; i <= 3; i++) { const v = rmin + (rmax - rmin) * i / 3; s += `<text x="${W - p.r + 6}" y="${yr(v) + 3}">${nf(v, 1)}</text>`; }
  const pts = [];
  days.forEach((d, i) => {
    const x = p.l + i * gw, bw = gw * .3;
    s += `<rect x="${x + gw * .18}" y="${y(d.spend)}" width="${bw}" height="${H - p.b - y(d.spend)}" rx="3" fill="${css('--face-soft')}" stroke="${css('--face')}" stroke-width=".8"/><rect x="${x + gw * .18 + bw + 3}" y="${y(d.revenue)}" width="${bw}" height="${H - p.b - y(d.revenue)}" rx="3" fill="${css('--gold')}"/><text x="${x + gw / 2}" y="${H - 8}" text-anchor="middle">${dayLabel(d.day)}</text>`;
    pts.push([x + gw / 2, yr(d.roi_real)]);
  });
  s += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${css('--fg')}" stroke-width="2"/>`;
  pts.forEach((pt, i) => { s += `<circle cx="${pt[0]}" cy="${pt[1]}" r="3.5" fill="${i === n - 1 ? css('--gold') : css('--fg')}" stroke="${css('--surface')}" stroke-width="1.5"/><text x="${pt[0]}" y="${pt[1] - 9}" text-anchor="middle" style="fill:${css('--fg')};font-weight:600">${f2(days[i].roi_real)}</text>`; });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${s}</svg>`;
}

/* ───────────────────────── estado e navegação ───────────────────────── */
let ME = null;
let view = 'geral';
let mobTab = 'hoje';
const VIEWS = {
  geral: ['Visão geral', 'home'], metas: ['Metas', 'flag'], camp: ['Campanhas', 'list'], cre: ['Criativos', 'image'], contas: ['Contingência', 'tree'],
  regras: ['Aprovações', 'check'], rel: ['Relatórios', 'doc'], int: ['Conexões', 'plug'], diag: ['O que mudou', 'pulse'], escala: ['Escala', 'trend']
};
const GROUPS = [['Acompanhar', ['geral', 'metas', 'camp', 'cre']], ['Operação', ['contas', 'regras', 'rel', 'int']], ['Análises', ['diag', 'escala']]];
const HASHMAP = { aprovar: ['regras', 'aprovar'], alertas: ['geral', 'alertas'], rel: ['rel', 'rel'] };
const isMobile = () => window.innerWidth < 760 && store.get('radar-full') !== '1';

function showLogin() {
  $('#root').innerHTML = `<div class="login"><form id="loginF">
    <div class="brand" style="padding:0">${LOGO}<div><b>Argos</b><small>Tráfego Meta</small></div></div>
    <h1>Entrar</h1><p>Use a senha do painel.</p>
    <div class="field"><label for="pw">Senha</label><input id="pw" type="password" autocomplete="current-password" required></div>
    <div class="err" id="loginErr"></div>
    <button class="btn primary block" type="submit">${ic('arrowR')}Entrar</button></form></div>`;
  $('#loginF').onsubmit = async e => {
    e.preventDefault();
    try { await api('/login', { body: { password: $('#pw').value } }); boot(); }
    catch (err) { $('#loginErr').textContent = err.message; }
  };
  setTimeout(() => $('#pw') && $('#pw').focus(), 50);
}

/* ── barra fixa de avisos graves (conta caiu, anúncio reprovado, chave parou) ── */
let AB = [], abOpen = false;
const abSeen = () => Number(store.get('argos-alert-seen')) || 0;
async function loadAlertBar() { try { AB = await api('/alerts/active'); } catch (e) { return; } drawAlertBar(); }
function drawAlertBar() {
  const el = $('#alertbar');
  const fresh = AB.filter(a => a.id > abSeen());
  if (!fresh.length) { el.hidden = true; document.documentElement.style.setProperty('--abh', '0px'); return; }
  const ago = t => { const m = Math.max(1, Math.round((Date.now() - new Date(t)) / 60000)); return m < 60 ? `há ${m} min` : `há ${Math.round(m / 60)} h`; };
  el.hidden = false;
  el.innerHTML = `<div class="in">${ic('alert')}<span class="t"><b>${esc(fresh[0].title)}</b> <small style="opacity:.8">${ago(fresh[0].created_at)}</small>${fresh.length > 1 ? `<span class="more">+${fresh.length - 1}</span>` : ''}</span>
    ${fresh.length > 1 || fresh[0].detail ? `<button data-act="abToggle" aria-expanded="${abOpen}">${abOpen ? 'Esconder' : 'Ver todos'}</button>` : ''}<button data-act="abOk">Ciente</button>
    ${abOpen ? `<div class="list">${fresh.map(a => `<div><b>${esc(a.title)}</b><small>${ago(a.created_at)}</small>${a.detail ? `<br>${esc(a.detail)}` : ''}</div>`).join('')}</div>` : ''}</div>`;
  document.documentElement.style.setProperty('--abh', el.offsetHeight + 'px');
}

async function boot() {
  try { ME = await api('/me'); } catch (e) { return; }
  await loadBms();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  const h = location.hash.replace('#', '');
  if (HASHMAP[h]) { view = HASHMAP[h][0]; mobTab = HASHMAP[h][1] === 'rel' ? 'rel' : HASHMAP[h][1] === 'aprovar' ? 'aprovar' : HASHMAP[h][1] === 'alertas' ? 'alertas' : 'hoje'; }
  else if (VIEWS[h]) view = h;
  else { const s = store.get('radar-view'); if (s && VIEWS[s]) view = s; }
  render();
  loadAlertBar(); setInterval(loadAlertBar, 2 * 60 * 1000);
}

function render() { if (isMobile()) renderMobile(); else renderDesk(); }
let lastMobile = null;
window.addEventListener('resize', () => { const m = isMobile(); if (ME && m !== lastMobile) render(); });

/* ───────────────────────── PC ───────────────────────── */
function renderDesk() {
  lastMobile = false;
  $('#root').innerHTML = `<div class="app">
    <aside class="side" aria-label="Menu">
      <div class="brand">${LOGO}<div><b>Argos</b><small>Tráfego Meta</small></div></div>
      ${GROUPS.map(([g, ks]) => `<div class="nav-label">${g}</div>` + ks.map(k => `<button class="nav" data-go="${k}" aria-current="${k === view}">${ic(VIEWS[k][1])}${VIEWS[k][0]}${k === 'regras' ? '<span class="count" id="pendCount" hidden></span>' : ''}</button>`).join('')).join('')}
      ${window.innerWidth < 760 ? `<button class="nav" data-act="mobileMode">${ic('phone')}Versão celular</button>` : ''}
      <div class="side-foot">
        <div class="sync" id="syncLine"><span class="dot live"></span>Carregando…</div>
        <button class="linkbtn" data-act="sync">${ic('refresh')}Atualizar agora</button>
        <div class="theme-seg" role="group" aria-label="Tema"><button data-act="theme" data-v="dark" aria-pressed="${document.documentElement.dataset.theme !== 'light'}">Escuro</button><button data-act="theme" data-v="light" aria-pressed="${document.documentElement.dataset.theme === 'light'}">Claro</button></div>
        <button class="linkbtn" data-act="logout">${ic('logout')}Sair</button>
      </div>
    </aside>
    <main><header class="top"><div><h1 id="vTitle"></h1><div class="sub" id="vSub"></div></div><div class="top-right" id="topRight"></div><button class="btn sm refresh" data-act="sync" title="Ler o Face e o app agora">${ic('refresh')}Atualizar agora</button></header>
      <div class="wrap"><section class="view" id="view"></section></div></main></div>`;
  go(view);
}

let lastGo = null;
async function go(k) {
  view = k; store.set('radar-view', k);
  $$('.nav').forEach(b => b.setAttribute('aria-current', b.dataset.go === k));
  if (k !== 'geral') dpOpen = false;
  $('#vTitle').textContent = VIEWS[k][0];
  $('#vSub').textContent = '';
  $('#topRight').innerHTML = ME.demo ? '<span class="demo">Dados de demonstração</span>' : '';
  $('#view').innerHTML = '<div class="loading">Carregando…</div>';
  history.replaceState(null, '', '#' + k);
  window.scrollTo({ top: 0 });
  try { await RENDER[k](); const v = $('#view'); if (v && lastGo !== k) { lastGo = k; v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); setTimeout(() => v.classList.remove('enter'), 900); } } catch (err) { if (err.message !== 'Faça login') $('#view').innerHTML = `<div class="empty">${ic('alert')}${esc(err.message)}</div>`; }
  refreshSide();
}

async function refreshSide() {
  try {
    const p = await api('/actions?status=pending');
    const c = $('#pendCount'); if (c) { c.textContent = p.length; c.hidden = !p.length; }
  } catch (e) {}
}

const topRight = html => { $('#topRight').innerHTML = (ME.demo ? '<span class="demo">Dados de demonstração</span>' : '') + html; };
const sub = t => { $('#vSub').textContent = t; };

/* ── filtro de BM (lembrado entre as telas) ── */
let BMS_LIST = [];
let bmSel = store.get('radar-bm') || '';
const bmQ = sep => (bmSel ? `${sep}bm=${bmSel}` : '');
const bmName = () => { const b = BMS_LIST.find(x => String(x.id) === String(bmSel)); return b ? b.name : ''; };
async function loadBms() { try { BMS_LIST = await api('/bms/list'); } catch (e) { BMS_LIST = []; } if (bmSel && !BMS_LIST.some(b => String(b.id) === String(bmSel))) { bmSel = ''; store.set('radar-bm', ''); } }
function bmPicker() {
  if (BMS_LIST.length < 2) return '';
  return `<label class="chip bm-pick">${ic('bm')}<select data-bmsel aria-label="Filtrar por BM"><option value="">Todas as BMs</option>${BMS_LIST.map(b => `<option value="${b.id}" ${String(b.id) === String(bmSel) ? 'selected' : ''}>${esc(b.name)}${b.active ? '' : ' · sem conta ativa'}</option>`).join('')}</select></label>`;
}
const bmNote = () => bmSel ? `<div class="banner note">${ic('info')}<div><h2 style="font-size:15px">Vendo só a ${esc(bmName())}</h2><p>O gasto e os números do Face são só dessa BM. As vendas por BM contam apenas as que vieram com etiqueta no link (campanhas novas); o funil do app não tem como ser dividido por BM.</p></div></div>` : '';

/* ── VISÃO GERAL ── */
const PERIODS = [['today', 'Hoje'], ['yesterday', 'Ontem'], ['d7', 'Últimos 7 dias'], ['month', 'Este mês'], ['last', 'Mês passado']];
let ov = { k: 'today', from: null, to: null };
let dpOpen = false;
function perRange(k) {
  const t = ME.today;
  if (k === 'today') return [t, t];
  if (k === 'yesterday') return [yday(), yday()];
  if (k === 'd7') return [addD(t, -7), addD(t, -1)];
  if (k === 'month') return [t.slice(0, 8) + '01', t];
  if (k === 'last') { const end = addD(t.slice(0, 8) + '01', -1); return [end.slice(0, 8) + '01', end]; }
  return [ov.from, ov.to];
}
const spanTxt = (a, b) => a === b ? shortDay(a) : shortDay(a) + ' – ' + shortDay(b);
function dpHtml() {
  const [a, b] = perRange(ov.k);
  const lbl = (PERIODS.find(p => p[0] === ov.k) || [0, 'Personalizado'])[1];
  return `<div class="dp"><button class="dp-btn" data-act="dpOpen" aria-expanded="${dpOpen}">${ic('calendar')}${lbl}<span class="dp-span">${spanTxt(a, b)}</span>${ic('chev')}</button>
    ${dpOpen ? `<div class="dp-menu">${PERIODS.map(([k, l]) => { const [x, y] = perRange(k); return `<button class="opt" data-act="dpPick" data-v="${k}" aria-pressed="${ov.k === k}">${l}<span>${spanTxt(x, y)}</span></button>`; }).join('')}
      <div class="dp-custom"><label>De<input type="date" id="dpFrom" value="${a}" max="${ME.today}"></label><label>Até<input type="date" id="dpTo" value="${b}" max="${ME.today}"></label><button class="btn sm primary" data-act="dpApply">Aplicar datas</button></div></div>` : ''}</div>`;
}
const drawDp = () => { const t = $('#topRight'); if (t) t.innerHTML = (ME.demo ? '<span class="demo">Dados de demonstração</span>' : '') + bmPicker() + dpHtml(); };
const roiCls = (r, g) => r >= g ? 'roi-g' : r >= 1.3 ? 'roi-w' : 'roi-b';
const dNeutral = (cur, prev) => { if (!prev) return ''; const d = (cur - prev) / Math.abs(prev) * 100; return isFinite(d) ? `<span class="delta muted">${d > 0 ? '+' : '−'}${nf(Math.abs(d), 0)}%</span>` : ''; };

async function viewGeral() {
  const [a, b] = perRange(ov.k);
  const q = (ov.k === 'today' ? '?' : a === b ? `?day=${a}&` : `?from=${a}&to=${b}&`) + bmQ('');
  const o = await api('/overview' + q);
  if (view !== 'geral') return;
  const c = o.cur || {}, p = o.prev || {}, tg = o.targets;
  const lbl = (PERIODS.find(x => x[0] === ov.k) || [0, 'Período'])[1];
  sub(o.is_range ? `${spanTxt(o.from, o.to)} · ${o.days} dias · comparando com o período anterior` : o.is_today ? `Hoje, ${dayLabel(o.day)} · até ${String(o.hour).padStart(2, '0')}h · comparando com ${o.prev_label}` : `${dayLabel(o.day)} · comparando com o dia anterior`);
  drawDp();
  const goal = o.budget_goal || tg.daily_budget_goal * (o.days || 1);
  const taxPct = Number(tg.tax_pct) || 0;
  const inflated = c.sales ? Math.round((c.fb_purchases / c.sales - 1) * 100) : 0;
  const lost = Math.max(0, Math.round(c.clicks - (c.tagged_visitors || c.visitors)));
  const funnelRows = [
    ['Impressões', 'vezes que o anúncio apareceu', c.impressions, null, null],
    ['Cliques no anúncio', 'CTR', c.clicks, c.ctr, p.ctr],
    ['Entraram no app', 'de quem clicou', c.visitors, c.arrival, p.arrival],
    ['Abriram uma conversa', 'de quem entrou', c.chatted, c.chat_rate, p.chat_rate],
    ['Clicaram em comprar', 'de quem conversou', c.checkout, c.checkout_rate, p.checkout_rate],
    ['Geraram Pix', 'de quem clicou em comprar', c.pix, c.pix_rate, p.pix_rate],
    ['Pagaram o Pix', 'venda real', c.sales, c.pay_rate, p.pay_rate]
  ];
  const mx = Math.log10(Math.max(10, c.impressions || 10));
  const funnel = `<div class="fr head"><span>Etapa</span><span>Pessoas</span><span style="text-align:right">Passaram</span><span style="text-align:right">${o.is_range ? 'Período anterior' : o.is_today ? 'Ontem, mesmo horário' : 'Dia anterior'}</span></div>` +
    funnelRows.map((r, i) => {
      const alert = i > 0 && r[4] && r[3] < r[4] * 0.85;
      return `<div class="fr${alert ? ' alert' : ''}"><div class="lb">${r[0]}<small>${r[1]}</small></div><div class="bw"><i style="width:${Math.max(3, Math.log10(Math.max(1, r[2])) / mx * 100)}%"></i><b>${nf(r[2])}</b></div><div class="pc">${i ? pct(r[3], 1) : '—'}<small>${i ? 'da etapa anterior' : ''}</small></div><div class="yd">${i && r[4] != null ? pct(r[4], 1) : nf(p.impressions)}</div></div>`;
    }).join('');
  const sev = (cur, prev, inv) => { if (!prev) return ''; const d = (cur - prev) / prev * (inv ? -1 : 1); return d < -0.15 ? 'bad' : d < -0.05 ? 'warn' : ''; };
  const chain = [
    ['CPM · custo pra aparecer', brl(c.cpm, 2), brl(p.cpm, 2), delta(c.cpm, p.cpm, true), sev(c.cpm, p.cpm, true)],
    ['CTR · quem clicou', pct(c.ctr), pct(p.ctr), delta(c.ctr, p.ctr), sev(c.ctr, p.ctr)],
    ['Chegou no app', pct(c.arrival, 0), pct(p.arrival, 0), delta(c.arrival, p.arrival), sev(c.arrival, p.arrival)],
    ['Comprou no app', pct(c.conv, 2), pct(p.conv, 2), delta(c.conv, p.conv), sev(c.conv, p.conv)],
    ['Ticket médio', brl(c.ticket, 2), brl(p.ticket, 2), delta(c.ticket, p.ticket), sev(c.ticket, p.ticket)]
  ].map(l => `<div class="link ${l[4]}"><span class="lbl">${l[0]}</span><span class="val">${l[1]}</span><span class="was">antes ${l[2]} ${l[3]}</span></div>`).join('');
  const shades = [1, .82, .66, .52, .4, .3, .22, .16];
  const tot = o.accounts.by_bm.reduce((s, x) => s + x.spend, 0);
  const share = o.accounts.by_bm.map((x, i) => ({ ...x, pct: div(x.spend, tot) * 100, sh: shades[Math.min(i, shades.length - 1)] }));
  $('#view').innerHTML = `
  <div class="grid g-hero">
    <div class="hero-wrap"><div class="spend">
      <span class="eyebrow">Gasto · ${lbl.toLowerCase()}${bmSel ? ' · ' + esc(bmName()) : ''}</span>
      <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap"><span class="big grad-t num">R$ ${nf(c.spend)}</span>${dNeutral(c.spend, p.spend)}<span class="faint" style="font-size:12px">vs ${o.prev_label}</span></div>
      <div class="tax-line"><span>Com imposto (${nf(taxPct, 2)}%)</span><b class="num">${brl(c.cost, 2)}</b><span class="faint">é esse valor que o ROI real usa</span></div>
      <div class="bbar" title="Quanto do orçamento das campanhas ativas já foi gasto"><i class="${c.spend > goal ? 'hi' : ''}" style="width:${Math.min(100, div(c.spend, goal) * 100)}%"></i></div>
      <div class="row2"><span>Orçamento das campanhas ativas${o.is_range ? ` (${o.days} dias)` : ''} <b>${brl(goal)}</b></span><span>Usado <b>${nf(div(c.spend, goal) * 100)}%</b></span><span>${nf(c.clicks)} cliques</span></div>
      <div class="upd">${ic('clock')}Gasto atualizado ${o.last_light ? hhmm(o.last_light.created_at) : '—'} · campanhas ${o.last_full ? hhmm(o.last_full.created_at) : '—'}</div>
    </div></div>
    <div class="kpis">
      <div class="card kpi"><span class="eyebrow"><span class="ki">${ic('trend')}</span>ROI real · com imposto</span><div class="v ${roiCls(c.roi, tg.roi_goal)}">${f2(c.roi)}</div><div class="foot">${delta(c.roi, p.roi)} meta ${nf(tg.roi_goal, 1)} · Face <span class="ghost">${f2(c.roi_face)}</span></div></div>
      <div class="card kpi"><span class="eyebrow"><span class="ki">${ic('card')}</span>Lucro no bolso</span><div class="v ${c.profit < 0 ? 'down' : ''}"><small>R$</small>${c.profit < 0 ? '−' : ''}${nf(Math.abs(c.profit))}</div><div class="foot">já tirando imposto de ${nf(taxPct, 2)}% e reembolsos</div></div>
      <div class="card kpi"><span class="eyebrow"><span class="ki">${ic('check')}</span>Custo por venda</span><div class="v">${c.cpa ? brl(c.cpa, 2) : '—'}</div><div class="foot">${delta(c.cpa, p.cpa, true)} ${nf(c.sales)} vendas reais${inflated > 3 ? ` · Face conta <span class="ghost">${nf(c.fb_purchases)}</span>` : ''}</div></div>
      <div class="card kpi"><span class="eyebrow"><span class="ki">${ic('andro')}</span>Faturamento real</span><div class="v" style="font-size:22px"><small>R$</small>${nf(c.revenue)}</div><div class="foot">${delta(c.revenue, p.revenue)} detalhes no Andrômeda</div></div>
    </div>
  </div>
  ${!ME.app_connected ? `<div class="banner note">${ic('info')}<div><h2 style="font-size:16px">O app de membros ainda não está conectado</h2><p>Sem ele o Argos só mostra o lado do Face. Veja em Conexões.</p></div></div>` : ''}
  ${bmNote()}
  <div class="grid g-2">
    ${o.is_range
      ? `<div class="card"><div class="card-h"><h3>Gasto e ROI real por dia</h3><div class="right legend"><span><i class="sw gold"></i>Gasto</span><span><i class="sw line" style="background:var(--gold)"></i>ROI real</span></div></div><div class="card-b">${daysChart(o.series, tg.roi_goal)}</div></div>`
      : `<div class="card"><div class="card-h"><h3>Gasto × faturamento por hora</h3><div class="right legend"><span><i class="sw gold"></i>Faturamento real</span><span><i class="sw face"></i>O que o Face diz</span><span><i class="sw line"></i>Gasto</span></div></div><div class="card-b">${hourChart(o.hourly, o.hour)}</div></div>`}
    <div class="card"><div class="card-h"><h3>Precisa da sua atenção</h3>${o.pending ? `<button class="right btn sm primary" data-go="regras">${o.pending} aprovação${o.pending > 1 ? 'ões' : ''}</button>` : ''}</div>
      <div class="card-b rows">${o.alerts.length ? o.alerts.map(alertRow).join('') : `<div class="empty">${ic('check')}Nada fora do normal agora.</div>`}</div></div>
  </div>
  <div class="card"><div class="card-h"><h3>Do anúncio ao Pix pago</h3><span class="hint">Quantas pessoas passaram em cada etapa e quantos % vieram da etapa anterior</span></div>
    <div class="card-b"><div class="fun">${funnel}</div>
      <div class="fun-sum">
        <div><b class="num">${pct(c.conv, 2)}</b><span>de quem entrou no app comprou</span></div>
        <div><b class="num">${nf(div(c.sales, c.clicks) * 100, 1)}</b><span>vendas a cada 100 cliques no Face</span></div>
        <div><b class="num">${nf(lost)}</b><span>clicaram mas não chegaram no app</span></div>
        <div><b class="num ${c.pix - c.sales > 0 ? 'down' : ''}">${nf(Math.max(0, c.pix - c.sales))}</b><span>geraram Pix e não pagaram</span></div>
      </div></div></div>
  <div class="card"><div class="card-h"><h3>A corrente do resultado</h3><span class="hint">Cada elo comparado com ${o.prev_label}. O elo destacado é onde o dinheiro está vazando.</span></div><div class="card-b"><div class="chain">${chain}</div></div></div>
  <div class="grid g-2">
    <div class="card"><div class="card-h"><h3>Ranking pelo lucro</h3><button class="right btn sm" data-go="camp">Ver todas</button></div>
      <div class="card-b tbl-wrap">${o.top.length ? `<table><thead><tr><th>Campanha</th><th>Gasto</th><th>Vendas reais</th><th>ROI real</th><th>Face</th></tr></thead><tbody>${o.top.map((t, i) => `<tr><td class="txt"><div style="display:flex;gap:10px;align-items:center"><span class="rk">${i + 1}</span><div class="cname">${esc(t.name)}<small>${t.bm_name ? `<span class="bm-tag">${esc(t.bm_name)}</span>` : ''}${esc(t.account_name || '')}</small></div></div></td><td>${brl(t.spend)}</td><td>${nf(t.sales)}</td><td class="real-v">${f2(t.roi)}</td><td class="face-v">${f2(t.roi_face)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">Nenhuma campanha gastou ainda.</div>'}</div></div>
    <div class="card"><div class="card-h"><h3>Contas agora</h3><button class="right btn sm" data-go="contas">Organizar</button></div>
      <div class="card-b" style="display:grid;gap:14px">
        <div class="grid g-3" style="gap:10px">
          <div class="kpi" style="padding:0"><span class="eyebrow">Rodando</span><div class="v up" style="font-size:26px">${o.accounts.running}</div></div>
          <div class="kpi" style="padding:0"><span class="eyebrow">Em análise</span><div class="v w" style="font-size:26px">${o.accounts.review}</div></div>
          <div class="kpi" style="padding:0"><span class="eyebrow">Caíram</span><div class="v down" style="font-size:26px">${o.accounts.down}</div></div>
        </div>
        <div class="eyebrow">Gasto ${o.is_range ? 'do período' : 'do dia'} por BM</div>
        ${share.length ? `<div class="share-bar">${share.map(x => `<div title="${esc(x.name)} · ${brl(x.spend)}" style="flex:${x.pct};background:color-mix(in srgb,var(--gold) ${x.sh * 100}%,var(--surface-2));${x.sh < .5 ? 'color:var(--fg)' : ''}">${x.pct >= 7 ? nf(x.pct) + '%' : ''}</div>`).join('')}</div>
        <div class="legend">${share.map(x => `<span><i class="sw" style="background:color-mix(in srgb,var(--gold) ${x.sh * 100}%,var(--surface-2))"></i>${esc(x.name)}</span>`).join('')}</div>` : '<div class="faint">Sem gasto ainda.</div>'}
        <div class="row" style="border-top:1px solid var(--line);padding-top:12px">${andromedaRow(o)}</div>
      </div></div>
  </div>`;
  updateSync(o.last_sync);
}
const yday = () => { const d = new Date(ME.today + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };
function andromedaRow(o) {
  if (!o.andromeda_on) return `<div class="ico-box ib-face">${ic('andro')}</div><div><div class="t">Andrômeda ainda não ligado</div><div class="d">Configure em Conexões pra mandar o gasto sozinho</div></div>`;
  const a = o.andromeda;
  if (!a) return `<div class="ico-box ib-info">${ic('andro')}</div><div><div class="t">Andrômeda: aguardando o primeiro envio</div></div>`;
  return `<div class="ico-box ${a.ok ? 'ib-good' : 'ib-bad'}">${ic(a.ok ? 'check' : 'alert')}</div><div><div class="t">${a.ok ? 'Andrômeda recebeu o gasto' : 'Andrômeda não recebeu o último envio'}</div><div class="d">${brl(a.total, 2)} somado de todas as contas · ${hhmm(a.sent_at)}${a.ok ? '' : ' · ' + esc(a.error || 'erro ' + a.status_code)}</div></div>`;
}
const ALERT_IC = { account_down: 'alert', token: 'plug', rule: 'bolt', fatigue: 'image', roi_day: 'trend', coverage: 'info' };
function alertRow(a) {
  return `<div class="row"><div class="ico-box ib-${a.severity === 'bad' ? 'bad' : a.severity === 'good' ? 'good' : a.severity === 'info' ? 'info' : 'warn'}">${ic(ALERT_IC[a.kind] || 'bell')}</div><div><div class="t">${esc(a.title)}</div><div class="d">${esc(a.detail || '')}</div></div><span class="when">${hhmm(a.created_at)}</span></div>`;
}
function updateSync(s) {
  const el = $('#syncLine'); if (!el || !s) return;
  el.innerHTML = `<span class="dot ${s.ok ? 'live' : 'off'}"></span>${s.ok ? 'Atualizado ' + ago(s.created_at) : 'Última leitura com erro'}`;
  el.title = s.detail || '';
}

/* ── O QUE MUDOU ── */
let dg = { a: null, b: null };
async function viewDiag() {
  const q = dg.b ? `?a=${dg.a}&b=${dg.b}` : '';
  const d = await api('/diagnose' + q);
  dg = { a: d.a, b: d.b };
  const A = d.A, B = d.B;
  sub('Compara dois dias elo por elo, do anúncio até o Pix pago');
  topRight('');
  const maxAbs = Math.max(0.0001, ...d.parts.map(x => Math.abs(x.effect)));
  const fv = (name, v) => name === 'CPM' || name === 'Ticket' ? brl(v, 2) : pct(v, name === 'Conversão' ? 2 : 1);
  const decomp = d.parts.map(x => {
    const w = Math.abs(x.effect) / maxAbs * 48, neg = x.effect < 0;
    const big = Math.abs(x.share) >= 40;
    return `<div class="dc"><div class="n">${x.name}<small>${x.hint}</small></div><div class="track"><span class="bar" style="${neg ? 'right:50%' : 'left:50%'};width:${w}%;background:${neg ? (big ? 'var(--bad)' : 'color-mix(in srgb,var(--bad) 45%,transparent)') : (big ? 'var(--good)' : 'color-mix(in srgb,var(--good) 45%,transparent)')}"></span></div><div class="r">${fv(x.name, x.a)} → ${fv(x.name, x.b)}<br><span class="${big ? (neg ? 'down' : 'up') : 'faint'}">${Math.abs(x.share)}% da ${B.roi < A.roi ? 'queda' : 'subida'}</span></div></div>`;
  }).join('');
  const st = [['Impressões', 'impressions', null], ['Cliques no anúncio', 'clicks', 'ctr'], ['Entraram no app', 'visitors', 'arrival'], ['Abriram conversa', 'chatted', 'chat_rate'], ['Clicaram em comprar', 'checkout', 'checkout_rate'], ['Geraram Pix', 'pix', 'pix_rate'], ['Pagaram o Pix', 'sales', 'pay_rate']];
  const worst = st.slice(1).map(s => ({ k: s[2], d: div(B[s[2]] - A[s[2]], A[s[2]]) })).sort((x, y) => x.d - y.d)[0];
  const funnel = st.map(s => {
    const hl = B.roi < A.roi && s[2] === worst.k && worst.d < -0.1;
    return `<tr class="${hl ? 'hl' : ''}"><td class="txt">${s[0]}</td><td>${nf(A[s[1]])}</td><td class="faint">${s[2] ? pct(A[s[2]], 1) : '—'}</td><td class="${hl ? 'down' : ''}" style="${hl ? 'font-weight:600' : ''}">${nf(B[s[1]])}</td><td class="${hl ? 'down' : 'faint'}" style="${hl ? 'font-weight:600' : ''}">${s[2] ? pct(B[s[2]], 1) : '—'}</td><td>${delta(B[s[1]], A[s[1]])}</td></tr>`;
  }).join('') + `<tr><td class="txt" style="font-weight:600">Conversão de quem entrou</td><td colspan="2" style="font-weight:600">${pct(A.conv, 2)}</td><td colspan="2" style="font-weight:600" class="${B.conv < A.conv ? 'down' : 'up'}">${pct(B.conv, 2)}</td><td></td></tr>
    <tr><td class="txt muted">Gasto · faturamento real</td><td colspan="2">${brl(A.spend)} · ${brl(A.revenue)}</td><td colspan="2">${brl(B.spend)} · ${brl(B.revenue)}</td><td class="faint">ROI ${f2(A.roi)} → ${f2(B.roi)}</td></tr>`;
  const v = d.verdict;
  $('#view').innerHTML = `
  <div class="toolbar"><span class="muted">Comparar</span>
    <label class="chip">${ic('calendar')}<input type="date" id="dgB" value="${d.b}" max="${ME.today}"></label>
    <span class="muted">com</span>
    <label class="chip">${ic('calendar')}<input type="date" id="dgA" value="${d.a}" max="${ME.today}"></label>
    <span class="muted" style="margin-left:auto;font-size:12.5px">${dayLabel(d.b)}: ${brl(B.spend)} gastos · ${dayLabel(d.a)}: ${brl(A.spend)} gastos</span></div>
  <div class="banner ${v.tone}"><div class="ico-box ib-${v.tone === 'bad' ? 'bad' : v.tone === 'good' ? 'good' : 'info'}" style="width:40px;height:40px">${ic(v.tone === 'bad' ? 'alert' : v.tone === 'good' ? 'check' : 'info')}</div>
    <div><div class="eyebrow" style="color:var(--${v.tone === 'bad' ? 'bad' : v.tone === 'good' ? 'good' : 'info'})">${B.roi < A.roi ? 'O que derrubou' : 'O que mudou'} em ${dayLabel(d.b)}</div><h2>${esc(v.title)}</h2><p>${esc(v.text)}</p></div></div>
  <div class="grid g-2e">
    <div class="card"><div class="card-h"><h3>Quanto cada elo pesou no ROI</h3><span class="hint">ROI foi de ${f2(A.roi)} para ${f2(B.roi)}</span></div>
      <div class="card-b"><div class="decomp">${decomp}</div><p class="faint" style="font-size:12px;margin:16px 0 0">A barra mostra quanto aquele elo puxou o ROI pra baixo (vermelho) ou pra cima (verde). Os cinco juntos explicam toda a diferença entre os dois dias.</p></div></div>
    <div class="card"><div class="card-h"><h3>Do anúncio ao Pix pago</h3><span class="hint">Face + app + Kirvano</span></div>
      <div class="card-b tbl-wrap"><table><thead><tr><th>Etapa</th><th>${shortDay(d.a)}</th><th>%</th><th>${shortDay(d.b)}</th><th>%</th><th>Pessoas</th></tr></thead><tbody>${funnel}</tbody></table></div></div>
  </div>
  <div class="card"><div class="card-h"><h3>ROI real nos últimos 14 dias</h3><span class="hint">As marcas são as mudanças anotadas no diário</span><div class="right"><button class="btn sm" data-act="addNote">${ic('plus')}Anotar mudança</button></div></div>
    <div class="card-b">${roiLine(d.series.filter(x => x.spend > 0), d.notes, ME.targets.roi_goal)}</div></div>
  <div class="grid g-2e">
    <div class="card"><div class="card-h"><h3>Diário de mudanças</h3><span class="hint">Preço, oferta, criativo, conta… vira marca no gráfico</span></div>
      <div class="card-b rows">${d.notes.length ? d.notes.map(n => `<div class="row"><div class="ico-box ib-${n.kind === 'conta' ? 'bad' : n.kind === 'criativo' ? 'info' : 'gold'}">${ic(n.kind === 'conta' ? 'alert' : n.kind === 'criativo' ? 'image' : 'edit')}</div><div><div class="t">${esc(n.title)}</div><div class="d">${esc(n.detail || '')}</div></div><span class="when">${shortDay(n.day)} <button class="linkbtn" data-act="delNote" data-id="${n.id}" aria-label="Apagar anotação">${ic('trash')}</button></span></div>`).join('') : `<div class="empty">${ic('edit')}Anote aqui quando mudar preço, oferta ou criativo.</div>`}</div></div>
    <div class="card"><div class="card-h"><h3>Por posicionamento</h3><span class="hint">${dayLabel(d.b)}</span></div>
      <div class="card-b tbl-wrap">${d.placements.length ? `<table><thead><tr><th>Onde apareceu</th><th>Gasto</th><th>CPM</th><th>CTR</th><th>Comprou</th><th>ROI real</th></tr></thead><tbody>${d.placements.map(p => `<tr><td class="txt">${p.name}</td><td>${pct(p.share, 0)}</td><td>${brl(p.cpm, 2)}</td><td>${pct(p.ctr)}</td><td>${p.has_sales ? pct(p.conv, 2) : '—'}</td><td>${p.has_sales ? `<span class="pill p-${p.roi >= ME.targets.roi_goal ? 'good' : p.roi >= 1.2 ? 'gold' : p.roi >= .8 ? 'warn' : 'bad'}">${f2(p.roi)}</span>` : '<span class="faint">sem etiqueta</span>'}</td></tr>`).join('')}</tbody></table>${d.placements[0].has_sales ? '' : '<p class="faint" style="font-size:12px;margin:10px 0 0">Pra ver vendas por posicionamento, o link do anúncio precisa ter utm_term={{placement}} (veja Conexões).</p>'}` : '<div class="empty">Sem dados de posicionamento nesse dia.</div>'}</div></div>
  </div>`;
  $('#dgA').onchange = e => { dg.a = e.target.value; viewDiag(); };
  $('#dgB').onchange = e => { dg.b = e.target.value; viewDiag(); };
}


/* ── METAS DO MÊS ── */
let mMonth = null;
const monthLabel = m => { const t = new Date(m + '-15T12:00:00Z').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }); return t.charAt(0).toUpperCase() + t.slice(1); };
const GOAL_ROWS = [
  ['invest', 'Investimento', 'gasto no Face', v => brl(v)],
  ['sales', 'Vendas', 'vendas reais', v => nf(v)],
  ['revenue', 'Faturamento', 'vendas reais', v => brl(v)],
  ['profit', 'Lucro', 'já sem imposto e reembolsos', v => brl(v)],
  ['roi', 'ROI real', 'com imposto', v => f2(v)]
];
function cumChart(series, key, goalTotal, daysTotal, month) {
  const W = 700, H = 220, p = { l: 52, r: 12, t: 14, b: 26 };
  const cum = []; let acc = 0;
  series.forEach(d => { acc += d[key] || 0; cum.push(acc); });
  const max = niceMax(Math.max(goalTotal || 0, acc, 10) * 1.05);
  const x = i => p.l + (W - p.l - p.r) * (i + 0.5) / daysTotal, y = v => H - p.b - (H - p.t - p.b) * v / max;
  let s = GRAD + axisY(W, H, p, 0, max, 4, kfmt);
  if (goalTotal) s += `<line x1="${x(-0.5)}" y1="${y(0)}" x2="${x(daysTotal - 0.5)}" y2="${y(goalTotal)}" stroke="${css('--good')}" stroke-dasharray="5 5"/><text x="${W - p.r}" y="${y(goalTotal) - 6}" text-anchor="end" style="fill:${css('--good')}">meta ${kfmt(goalTotal)}</text>`;
  if (cum.length) {
    const pts = cum.map((v, i) => [x(i), y(v)]);
    s += `<path d="M${pts[0][0]},${y(0)} L${pts.map(q => q.join(',')).join(' L')} L${pts[pts.length - 1][0]},${y(0)}Z" fill="url(#gArea)"/><polyline points="${pts.map(q => q.join(',')).join(' ')}" fill="none" stroke="${css('--gold')}" stroke-width="2.4" stroke-linejoin="round"/>`;
    const [lx, ly] = pts[pts.length - 1];
    s += `<circle cx="${lx}" cy="${ly}" r="9" fill="${css('--gold')}" opacity=".18"/><circle cx="${lx}" cy="${ly}" r="4.5" fill="${css('--gold')}" stroke="${css('--surface')}" stroke-width="2"/>`;
  }
  for (let i = 0; i < daysTotal; i += Math.ceil(daysTotal / 10)) s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${String(i + 1).padStart(2, '0')}/${month.slice(5)}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${s}</svg>`;
}
async function viewMetas() {
  if (!mMonth) mMonth = ME.today.slice(0, 7);
  const d = await api(`/goals?month=${mMonth}${bmQ('&')}`);
  if (view !== 'metas') return;
  const g = d.goal || {};
  const cur = mMonth === ME.today.slice(0, 7);
  sub(`${monthLabel(mMonth)}${bmSel ? ' · ' + esc(bmName()) : ''} · ${cur ? `${d.remaining_days} dias pela frente · projeção no ritmo de agora` : 'mês fechado'}`);
  topRight(bmPicker() + `<label class="chip">${ic('calendar')}<input type="month" id="mMonth" value="${mMonth}" max="${ME.today.slice(0, 7)}" aria-label="Escolher mês"></label><button class="btn sm primary" data-act="editGoals">${ic('edit')}${d.goal ? 'Editar metas' : 'Definir metas'}</button>`);
  const card = ([k, label, hint, fmt]) => {
    const goal = g[k] != null ? Number(g[k]) : null, done = d.done[k] || 0;
    const isRoi = k === 'roi';
    const proj = isRoi ? done : d.projection[k];
    const pctDone = goal ? (isRoi ? done / goal : done / goal) * 100 : null;
    const okProj = goal == null ? null : proj >= goal;
    return `<div class="card goal"><div class="eyebrow">${label}<span class="faint" style="text-transform:none;letter-spacing:0;font-weight:400">· ${hint}</span></div>
      <div class="gv"><b class="num">${fmt(done)}</b>${goal != null ? `<span class="faint">de ${fmt(goal)}</span>` : '<span class="faint">sem meta</span>'}</div>
      ${goal != null ? `<div class="bbar"><i class="${pctDone >= 100 ? '' : ''}" style="width:${Math.min(100, pctDone)}%"></i></div>` : ''}
      <div class="gfoot">
        ${isRoi ? `<span>Meta ${goal != null ? f2(goal) : '—'}</span>` : `<span>Projeção <b class="num ${okProj === null ? '' : okProj ? 'up' : 'down'}">${fmt(proj)}</b></span>`}
        ${!isRoi && goal != null && cur ? `<span>Precisa <b class="num">${fmt(d.need[k] || 0)}</b>/dia</span>` : ''}
        ${goal != null ? `<span class="pill p-${(isRoi ? done >= goal : okProj) ? 'good' : 'warn'}">${isRoi ? (done >= goal ? 'Na meta' : 'Abaixo') : okProj ? 'No ritmo' : 'Fora do ritmo'}</span>` : ''}
      </div></div>`;
  };
  const pm = d.prev_month;
  const chartKey = g.profit != null ? 'profit' : 'revenue';
  $('#view').innerHTML = `
  ${!d.goal ? `<div class="banner gold">${ic('flag')}<div><h2 style="font-size:17px">Defina as metas de ${monthLabel(mMonth).toLowerCase()}</h2><p>Investimento, vendas, faturamento, lucro e ROI. O Argos acompanha dia a dia, mostra quanto falta por dia e projeta como o mês fecha no ritmo atual. Mês passado: ${brl(pm.invest)} investidos, ${nf(pm.sales)} vendas, ${brl(pm.profit)} de lucro, ROI ${f2(pm.roi)}.</p></div><button class="btn primary" data-act="editGoals">${ic('edit')}Definir metas</button></div>` : ''}
  ${bmNote()}
  <div class="goals">${GOAL_ROWS.map(card).join('')}</div>
  <div class="grid g-2">
    <div class="card"><div class="card-h"><h3>${chartKey === 'profit' ? 'Lucro' : 'Faturamento'} acumulado no mês</h3><span class="hint">Linha tracejada = ritmo pra bater a meta</span></div>
      <div class="card-b">${cumChart(d.series, chartKey, g[chartKey] != null ? Number(g[chartKey]) : null, d.days_total, mMonth)}</div></div>
    <div class="card"><div class="card-h"><h3>Comparando com ${monthLabel(pm.month).toLowerCase()}</h3></div>
      <div class="card-b tbl-wrap"><table><thead><tr><th></th><th>Este mês</th><th>Projeção</th><th>Mês passado</th></tr></thead><tbody>
        ${[['Investimento', 'invest', v => brl(v)], ['Vendas', 'sales', v => nf(v)], ['Faturamento', 'revenue', v => brl(v)], ['Lucro', 'profit', v => brl(v)], ['Ticket', 'ticket', v => brl(v, 2)], ['Custo por venda', 'cpa', v => brl(v, 2)], ['ROI real', 'roi', v => f2(v)]].map(([l, k, f]) => `<tr><td class="txt">${l}</td><td>${f(d.done[k] || 0)}</td><td class="faint">${d.projection[k] != null ? f(d.projection[k]) : '—'}</td><td class="faint">${f(pm[k] || 0)}</td></tr>`).join('')}
      </tbody></table>${g.notes ? `<p class="muted" style="font-size:12.5px;margin:12px 0 0">${esc(g.notes)}</p>` : ''}</div></div>
  </div>`;
  const mi = $('#mMonth'); if (mi) mi.onchange = e => { if (e.target.value) { mMonth = e.target.value; viewMetas(); } };
  window.__goalsData = d;
}

/* ── CAMPANHAS ── */
let cp = { level: 'campaign', period: 'today', active: true };
const SIG = { scale: ['good', 'Escalar'], keep: ['gold', 'Manter'], tired: ['warn', 'Cansando'], cut: ['bad', 'Desligar?'], learning: ['info', 'Aprendendo'], off: ['face', 'Desligada'], notag: ['face', 'Sem etiqueta'] };
let campRows = [], campGuards = {};
async function viewCamp() {
  const per = { today: [ME.today, ME.today], yesterday: [yday(), yday()], d7: [addD(ME.today, -6), ME.today] }[cp.period];
  const d = await api(`/campaigns?level=${cp.level}&from=${per[0]}&to=${per[1]}${bmQ('&')}`);
  campRows = d.rows; campGuards = d.guards;
  sub('O que o Face diz e o que caiu de verdade, lado a lado');
  topRight(bmPicker() + `<div class="seg" role="group" aria-label="Período">${[['today', 'Hoje'], ['yesterday', 'Ontem'], ['d7', '7 dias']].map(([k, l]) => `<button aria-pressed="${cp.period === k}" data-act="cpPeriod" data-v="${k}">${l}</button>`).join('')}</div>`);
  const rows = d.rows.filter(r => !cp.active || r.status === 'ACTIVE' || r.spend > 0);
  const isC = cp.level === 'campaign';
  $('#view').innerHTML = `
  ${bmNote()}
  <div class="banner note">${ic('info')}<div><h2 style="font-size:16px">A coluna azul é a venda que caiu de verdade</h2>
    <p>Só aparecem campanhas de contas ativas. As vendas reais por campanha vêm da etiqueta do link (UTM): campanhas antigas sem etiqueta aparecem como "Sem etiqueta" e o ROI real delas fica no total do dia. ${d.guards.edit_enabled ? 'Ligar, desligar e mudar orçamento vai direto pro Face e fica no histórico (aba Regras).' : 'Ligar, desligar e mudar orçamento ficam travados até você liberar a edição em Conexões.'}</p></div></div>
  <div class="toolbar">
    <div class="seg" role="group" aria-label="Nível"><button aria-pressed="${isC}" data-act="cpLevel" data-v="campaign">Campanhas</button><button aria-pressed="${!isC}" data-act="cpLevel" data-v="ad">Anúncios</button></div>
    <button class="chip" data-act="cpActive">${ic(cp.active ? 'check' : 'list')}${cp.active ? 'Só ativas ou que gastaram' : 'Todas'}</button>
    <span class="faint" style="font-size:12.5px;margin-left:auto">${rows.length} ${isC ? 'campanhas' : 'anúncios'} · ordenado por gasto</span>
  </div>
  <div class="card"><div class="tbl-wrap">${rows.length ? `<table><thead><tr><th>${isC ? 'Campanha' : 'Anúncio'}</th><th>Ligada</th><th>No ar há</th>${isC ? '<th>Orçamento/dia</th>' : ''}<th>Gasto</th><th>CPM</th><th>CTR</th><th>Freq.</th><th>Vendas Face</th><th>Vendas reais</th><th>Custo/venda real</th><th>ROI real</th><th style="text-align:left">7 dias</th><th>Sinal</th></tr></thead><tbody>
    ${rows.map((c, i) => `<tr style="${c.status !== 'ACTIVE' ? 'opacity:.6' : ''}"><td class="txt"><div class="cname">${esc(c.name)}<small>${c.bm_name ? `<span class="bm-tag">${esc(c.bm_name)}</span>` : ''}${esc(isC ? (c.account_name || '') : (c.account_name || '') + ' · ' + (c.campaign_name || ''))}</small></div></td>
      <td><button class="tog" role="switch" aria-checked="${c.status === 'ACTIVE'}" data-act="tog" data-i="${i}" aria-label="Ligar ou desligar ${esc(c.name)}"></button></td>
      <td class="${c.days_on >= 12 ? 'w' : ''}">${c.days_on == null ? '—' : c.days_on + (c.days_on === 1 ? ' dia' : ' dias')}</td>
      ${isC ? `<td>${c.budget ? `<button class="budget" data-act="bud" data-i="${i}">${brl(c.budget)} ${ic('edit')}</button>` : '<span class="faint">—</span>'}</td>` : ''}
      <td>${brl(c.spend, 2)}</td><td>${c.impressions ? brl(c.cpm, 2) : '—'}</td><td>${c.impressions ? pct(c.ctr) : '—'}</td><td class="${c.frequency >= 3 ? 'w' : ''}">${c.frequency ? nf(c.frequency, 1) : '—'}</td>
      <td class="face-v">${nf(c.fb_purchases)}</td><td class="real-v">${nf(c.sales)}</td><td>${c.cpa ? brl(c.cpa, 2) : '—'}</td><td class="real-v">${c.spend ? f2(c.roi) : '—'}</td>
      <td style="width:110px">${spark(c.series, css(c.roi >= ME.targets.roi_goal ? '--good' : c.roi >= 1.1 ? '--gold' : '--bad'), 100, 26)}</td>
      <td><span class="pill p-${SIG[c.signal][0]}">${SIG[c.signal][1]}</span></td></tr>`).join('')}
  </tbody></table>` : `<div class="empty">${ic('list')}Nenhuma ${isC ? 'campanha' : 'anúncio'} nesse período.</div>`}</div></div>`;
}
const addD = (day, n) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
function editLocked() {
  sheet({ title: 'A edição está desligada', body: `<p>Por segurança, o Argos começa só lendo. Quando você confiar nos números, ligue a edição em <b>Conexões → Edição pelo Argos</b>.</p>`, ok: 'Ir pra Conexões', onOk: () => go('int') });
}

/* ── CRIATIVOS ── */
let crFilter = 'all', crSort = 'sales', crDays = 14, crOpen = null, crData = null;
const ST = { good: ['good', 'Vendendo'], falling: ['warn', 'Caindo'], stopped: ['bad', 'Parou de vender'], new: ['info', 'Novo'], off: ['face', 'Desligada'] };
const roiCol = (r, g) => r == null ? '' : r >= g ? 'var(--good)' : r >= 1.3 ? 'var(--warn)' : 'var(--bad)';
const thumbBg = x => { if (x.thumb) return `url('${esc(x.thumb)}')`; let h = 0; for (const c of x.key) h = (h * 31 + c.charCodeAt(0)) % 360; return `radial-gradient(120% 80% at 30% 20%, hsl(${h} 45% 58%), hsl(${(h + 40) % 360} 35% 20%))`; };
// linha azul = vendas/dia, ciano = ROI real do dia, tracejada verde = meta
function creChart(series, goal, W = 300, H = 84) {
  const p = { l: 4, r: 4, t: 8, b: 6 }, n = series.length;
  const xs = i => p.l + (W - p.l - p.r) * i / Math.max(1, n - 1);
  const ms = Math.max(3, ...series.map(x => x.sales));
  const ys = v => H - p.b - (H - p.t - p.b) * v / ms;
  const mr = Math.max(goal * 1.8, 3);
  const yr = v => H - p.b - (H - p.t - p.b) * Math.min(v, mr) / mr;
  const hasRoi = series.some(x => x.roi != null && x.spend > 0);
  const ln = (pts, c, w, o = 1) => `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" opacity="${o}" vector-effect="non-scaling-stroke"/>`;
  let s = hasRoi ? `<line x1="${p.l}" x2="${W - p.r}" y1="${yr(goal)}" y2="${yr(goal)}" stroke="var(--good)" stroke-dasharray="4 4" opacity=".6" vector-effect="non-scaling-stroke"/>` : '';
  s += ln(series.map((x, i) => `${xs(i)},${ys(x.sales)}`).join(' '), 'var(--gold)', 2.2);
  if (hasRoi) s += ln(series.map((x, i) => x.spend > 0 ? `${xs(i)},${yr(x.roi)}` : null).filter(Boolean).join(' '), 'var(--gold-2)', 1.7, .9);
  const L = series[n - 1];
  s += `<circle cx="${xs(n - 1)}" cy="${ys(L.sales)}" r="3.2" fill="var(--gold)"/>`;
  return `<svg class="cre-ch" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Vendas${hasRoi ? ' e ROI' : ''} por dia">${s}</svg>`;
}
async function viewCre() {
  const [d, pt] = await Promise.all([api(`/creatives/images?days=${crDays}` + bmQ('&')), api('/creatives' + bmQ('?')).catch(() => null)]);
  crData = d;
  const real = d.by === 'real', goal = d.roi_goal || ME.targets.roi_goal;
  sub(`Cada cartão é uma imagem, somando todas as campanhas e contas onde ela roda · ${real ? 'vendas reais (etiqueta)' : 'compras que o Face conta (sem etiqueta ainda)'}`);
  topRight(bmPicker());
  let list = d.images.slice();
  if (crSort === 'roi') list.sort((a, b) => (b.roi || 0) - (a.roi || 0) || b.sales - a.sales);
  if (crSort === 'spend') list.sort((a, b) => b.spend - a.spend);
  if (crFilter !== 'all') list = list.filter(x => x.state === crFilter);
  const all = d.images, tot = all.reduce((s, x) => s + x.sales, 0), sp = all.reduce((s, x) => s + x.spend, 0), rv = all.reduce((s, x) => s + x.revenue, 0);
  const open = crOpen && all.find(x => x.key === crOpen);
  $('#view').innerHTML = `
  ${bmNote()}
  <div class="toolbar">
    <div class="seg" role="group" aria-label="Período">${[7, 14, 30].map(n => `<button aria-pressed="${crDays === n}" data-act="crDays" data-v="${n}">${n} dias</button>`).join('')}</div>
    <div class="seg" role="group" aria-label="Ordenar">${[['sales', 'Mais vendas'], ['roi', 'Maior ROI'], ['spend', 'Mais gasto']].map(([k, l]) => `<button aria-pressed="${crSort === k}" data-act="crSort" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="seg" role="group" aria-label="Situação">${[['all', 'Todas'], ['good', 'Vendendo'], ['falling', 'Caindo'], ['stopped', 'Parou'], ['new', 'Novas'], ['off', 'Desligadas']].map(([k, l]) => `<button aria-pressed="${crFilter === k}" data-act="crFilter" data-v="${k}">${l}</button>`).join('')}</div>
  </div>
  <div class="grid g-4">
    <div class="card kpi"><span class="eyebrow">Imagens no ar</span><b class="v num">${nf(all.filter(x => x.active).length)}</b></div>
    <div class="card kpi"><span class="eyebrow">${real ? 'Vendas' : 'Compras Face'} · ${d.days} dias</span><b class="v num">${nf(tot)}</b></div>
    <div class="card kpi"><span class="eyebrow">ROI real</span><b class="v num" style="color:${roiCol(real ? div(rv, sp * (1 + (ME.targets.tax_pct ?? 12.15) / 100)) : null, goal)}">${real ? f2(div(rv, sp * (1 + (ME.targets.tax_pct ?? 12.15) / 100))) : '—'}</b></div>
    <div class="card kpi"><span class="eyebrow">Pararam de vender</span><b class="v num" style="color:var(--bad)">${nf(all.filter(x => x.state === 'stopped').length)}</b></div>
  </div>
  ${open ? creDetail(open, real, goal) : ''}
  ${list.length ? `<div class="cre2-grid">${list.map(x => {
    const st = ST[x.state] || ST.good;
    return `<button class="card cre2 ${open === x ? 'sel' : ''}" data-act="crOpen" data-v="${esc(x.key)}" aria-label="Ver campanhas desta imagem">
      <div class="c2-top"><div class="c2-img" style="background-image:${thumbBg(x)}">${x.rank ? `<span class="rk">#${x.rank}</span>` : ''}</div>
        <div class="c2-meta"><b class="c2-nm">${esc(x.name)}</b><span class="pill p-${st[0]}">${st[1]}</span>
          <span class="c2-w"><b class="num">${x.campaigns}</b> ${x.campaigns === 1 ? 'campanha' : 'campanhas'} · <b class="num">${x.bms.length}</b> ${x.bms.length === 1 ? 'BM' : 'BMs'}</span>
          <span class="c2-w">No ar há <b class="num">${x.days_on}</b> ${x.days_on === 1 ? 'dia' : 'dias'}</span></div></div>
      <div class="c2-k"><div><small>${real ? 'Vendas' : 'Compras'}</small><b>${nf(x.sales)}</b></div><div><small>ROI</small><b style="color:${roiCol(x.roi, goal)}">${x.roi == null ? '—' : f2(x.roi)}</b></div><div><small>Gasto</small><b>${brl(x.spend)}</b></div><div><small>Custo/venda</small><b>${x.cpa ? brl(x.cpa, 2) : '—'}</b></div></div>
      <div class="c2-ch">${creChart(x.series, goal)}</div>
    </button>`;
  }).join('')}</div>` : `<div class="card"><div class="empty">${ic('image')}Nenhuma imagem nesse filtro.</div></div>`}
  <p class="faint" style="font-size:12px;margin:0">Linha azul = ${real ? 'vendas' : 'compras'} por dia · ciano = ROI real do dia · tracejada verde = meta (${f2(goal)}). "Caindo" = vendendo bem menos por real gasto nos últimos 3 dias; "Parou" = gastou nos últimos 3 dias e não vendeu.${d.ungrouped ? ` ${d.ungrouped} anúncio(s) ainda sem a impressão digital da imagem aparecem sozinhos até a próxima leitura completa.` : ''}</p>
  ${pt ? `<div class="grid g-3">
    <div class="card"><div class="card-h"><h3>Imagens por campanha</h3><span class="hint">ROI real médio, 30 dias</span></div><div class="card-b">${barsChart(pt.patterns.by_count.map(x => [x.key, x.roi, x.roi === Math.max(...pt.patterns.by_count.map(y => y.roi))]), f2, { goal })}</div></div>
    <div class="card"><div class="card-h"><h3>Por modelo</h3><span class="hint">ROI real médio, 30 dias</span></div><div class="card-b">${barsChart(pt.patterns.by_model.slice(0, 5).map((x, i) => [cap(x.key), x.roi, i === 0]), f2, { goal })}</div></div>
    <div class="card"><div class="card-h"><h3>Vida útil das imagens</h3><span class="hint">Em quantos dias cansaram (60 dias)</span></div><div class="card-b">${barsChart(pt.patterns.life.map(x => [x.key + ' d', x.n, x.n === Math.max(...pt.patterns.life.map(y => y.n)) && x.n > 0]), v => nf(v), { ax: v => nf(v) })}</div></div>
  </div>` : ''}`;
}
function creDetail(x, real, goal) {
  const st = ST[x.state] || ST.good;
  const good = x.camps.filter(c => c.roi >= goal && c.spend > 0).length, withSpend = x.camps.filter(c => c.spend > 0).length;
  const tip = !real ? 'Sem vendas com etiqueta ainda: o resultado por campanha usa as compras que o Face conta.'
    : withSpend < 2 ? 'Está em uma campanha só. Se ela estiver vendendo, vale testar a mesma imagem em outra campanha ou conta.'
    : good * 2 >= withSpend ? `Vende bem na maioria das campanhas (${good} de ${withSpend}). Boa candidata pra duplicar em conta nova.`
    : `Só vai bem em ${good} de ${withSpend} campanhas. Quando o problema é a campanha e não a foto, vale testar a mesma imagem em outra estrutura.`;
  return `<div class="card cre-dt"><div class="dt-h"><div class="c2-img" style="background-image:${thumbBg(x)};width:96px"></div>
      <div style="flex:1;min-width:200px;display:grid;gap:6px"><h3 style="margin:0">${esc(x.name)}</h3><span class="pill p-${st[0]}">${st[1]}</span>
        <span class="c2-w">No ar há <b class="num">${x.days_on}</b> dias · ${x.ads} anúncio(s) · CTR <b class="num">${pct(x.ctr)}</b> · ${nf(x.sales)} ${real ? 'vendas' : 'compras'} · ROI <b class="num" style="color:${roiCol(x.roi, goal)}">${x.roi == null ? '—' : f2(x.roi)}</b></span></div>
      <button class="btn sm" data-act="crOpen" data-v="">${ic('x')}Fechar</button></div>
    <div class="banner note">${ic('info')}<div><p style="margin:0">${tip}</p></div></div>
    <div class="dt-ch">${creChart(x.series, goal, 900, 150)}<div class="dt-ax"><span>${shortDay(x.series[0].day)}</span><span>${shortDay(x.series[x.series.length - 1].day)}</span></div></div>
    <div class="tbl-wrap"><table><thead><tr><th>Campanha</th><th>Gasto</th><th>${real ? 'Vendas' : 'Compras'}</th><th>ROI real</th><th>Situação</th></tr></thead><tbody>
      ${x.camps.map(c => `<tr><td class="txt"><span class="bm-tag">${esc(c.bm || '—')}</span>${esc(c.name || c.id)}<div class="faint" style="font-size:11.5px">${esc(c.account || '')}</div></td><td class="num">${brl(c.spend)}</td><td class="num">${nf(c.sales)}</td><td class="num" style="color:${real ? roiCol(c.roi, goal) : ''}">${real ? f2(c.roi) : '—'}</td><td>${c.on ? 'Ligada' : 'Desligada'}</td></tr>`).join('')}
    </tbody></table></div></div>`;
}
const cap = s => String(s || '').charAt(0) + String(s || '').slice(1).toLowerCase();

/* ── ESCALA ── */
async function viewEscala() {
  const d = await api('/scale');
  sub('Até onde dá pra subir o orçamento sem o ROI cair · últimos 60 dias');
  topRight('');
  const ideal = d.ideal;
  $('#view').innerHTML = `
  <div class="banner gold"><div class="ico-box ib-gold" style="width:40px;height:40px">${ic('trend')}</div><div>
    <div class="eyebrow" style="color:var(--gold)">Seu ponto ideal hoje</div>
    ${ideal ? `<h2>Entre ${brl(ideal.from)} e ${brl(ideal.to)} por dia o ROI fica acima de ${nf(d.goal, 1)}</h2>
      <p>${d.above.n ? `Nos dias acima de ${brl(ideal.to)}, o ROI médio foi ${f2(d.above.roi)}. ` : ''}Acima dessa faixa a oferta atual perde eficiência. Pra escalar além, o que muda o jogo é oferta (ticket, recompra), não só orçamento.</p>`
      : `<h2>Ainda não dá pra cravar a faixa ideal</h2><p>O Argos precisa de alguns dias com gasto e vendas reais em faixas diferentes de orçamento. Volte em uma ou duas semanas.</p>`}</div></div>
  <div class="grid g-2">
    <div class="card"><div class="card-h"><h3>Quanto investiu × ROI real</h3><span class="hint">Cada ponto é um dia</span></div><div class="card-b">${scatterChart(d.days, ideal, d.goal)}</div></div>
    <div class="card"><div class="card-h"><h3>Custo por venda pelo tamanho da campanha</h3><span class="hint">Gasto diário de cada campanha · 30 dias</span></div><div class="card-b">${barsChart(d.buckets.map((b, i) => [b.label, b.cpa, b.cpa && b.cpa === Math.min(...d.buckets.filter(x => x.cpa).map(x => x.cpa))]), v => 'R$' + nf(v, 1), { W: 360, H: 300, l: 44, ax: v => 'R$' + nf(v) })}
      <p class="faint" style="font-size:12px;margin:8px 0 0">Com ticket baixo, campanhas menores costumam manter o custo por venda mais barato.</p></div></div>
  </div>
  <div class="card"><div class="card-h"><h3>ROI com recompra</h3><span class="hint">O mesmo dia de tráfego visto no dia, 7 e 30 dias depois</span><div class="right legend"><span><i class="sw face"></i>No dia</span><span><i class="sw info"></i>Após 7 dias</span><span><i class="sw gold"></i>Após 30 dias</span></div></div>
    <div class="card-b">${cohortChart(d.cohort)}<p class="faint" style="font-size:12px;margin:10px 0 0">Olhar só o ROI do dia esconde parte do lucro: quem compra hoje volta a comprar nos dias seguintes.</p></div></div>`;
}

/* ── CONTAS E PERFIS ── */
let ST_DATA = null;
const ACC_ST = s => s === 1 ? ['good', 'Rodando'] : [2, 100, 101, 201, 202].includes(s) ? ['bad', 'Desativada'] : [3, 9].includes(s) ? ['warn', 'Pagamento pendente'] : [7, 8].includes(s) ? ['warn', 'Em análise'] : ['face', 'Sem status'];
async function viewContas() {
  const d = await api('/structure');
  ST_DATA = d;
  sub('Perfis → BMs → contas. Arraste uma BM até outro perfil pra mudar quem administra');
  topRight(`<button class="chip" data-act="newProfile">${ic('plus')}Novo perfil</button><button class="chip" data-go="int">${ic('plug')}Conectar BM</button>`);
  const vault = d.profiles.find(p => p.role === 'cofre');
  const ops = d.profiles.filter(p => p.role !== 'cofre');
  const bmsOf = pid => d.bms.filter(b => b.profile_id === pid);
  const accsOf = bid => d.accounts.filter(a => a.bm_id === bid);
  const loose = d.bms.filter(b => !b.profile_id || !d.profiles.find(p => p.id === b.profile_id && p.role !== 'cofre'));
  const accHtml = a => {
    const st = a.is_reserve && a.account_status === 1 ? ['info', 'Reserva'] : ACC_ST(a.account_status);
    const dead = st[0] === 'bad';
    return `<button class="acc${dead ? ' dead' : ''}" data-act="editAcc" data-id="${esc(a.id)}"><span class="an">${esc(a.name)}</span><span class="pill p-${st[0]}">${st[1]}</span>
      <span class="ad">${ic('card')}<span>${esc(a.card_label || a.funding_label || 'sem cartão anotado')}${Number(a.spend_cap) > 0 ? ' · limite ' + brl(a.spend_cap) : ' · sem limite de gasto'}${a.budget ? ' · orç. ' + brl(a.budget) + '/dia' : ''}</span></span>
      ${dead ? `<span class="sh faint" style="font-size:11.5px">Caiu ${a.status_changed_at ? ago(a.status_changed_at) : ''} · ${brl(a.budget)}/dia pra redistribuir</span>` : `<span class="sh"><span class="meter"><i class="${a.share > ME.targets.max_account_share ? 'hi' : ''}" style="width:${Math.min(100, a.share * 3)}%"></i></span><span class="num faint" style="font-size:11px">${nf(a.share)}% do dia</span></span>`}</button>`;
  };
  const bmHtml = b => `<div class="bm" draggable="true" data-bm="${b.id}" title="Arraste pra outro perfil"><button class="bm-h" data-act="editBm" data-id="${b.id}">${ic('bm')}${esc(b.name)}${b.has_token ? (b.token_ok === false ? '<span class="pill p-bad" style="margin-left:auto">chave parou</span>' : '') : '<span class="pill p-face" style="margin-left:auto">sem chave</span>'}</button>${accsOf(b.id).map(accHtml).join('') || '<span class="faint" style="font-size:12px">Nenhuma conta</span>'}</div>`;
  const profCard = p => `<div class="card prof" data-drop="${p.id}"><div class="prof-h" data-act="editProfile" data-id="${p.id}"><div class="avatar">${esc(initials(p.name))}</div><div><div style="font-weight:600">${esc(p.name)}</div><div class="faint" style="font-size:11.5px">${bmsOf(p.id).length} BMs · ${bmsOf(p.id).reduce((s, b) => s + accsOf(b.id).length, 0)} contas</div></div><span class="pill p-${p.status === 'ativo' ? 'good' : p.status === 'caiu' ? 'bad' : 'warn'}" style="margin-left:auto">${p.status === 'ativo' ? 'Ativo' : p.status === 'caiu' ? 'Caiu' : 'Pediu verificação'}</span></div>${bmsOf(p.id).map(bmHtml).join('') || '<div class="bm faint" style="font-size:12.5px">Nenhuma BM. Arraste uma BM pra cá (ou toque nela e escolha este perfil).</div>'}</div>`;
  $('#view').innerHTML = `
  <div class="vault"><div class="ico-box ib-gold">${ic('lock')}</div>
    <div style="flex:1;min-width:200px"><div class="eyebrow">Perfil cofre · não usar pra anunciar</div>${vault ? `<h3>${esc(vault.name)}</h3><div class="muted" style="font-size:12.5px">Admin de todas as ${d.bms.length} BMs${vault.last_used_at ? ' · último uso ' + ago(vault.last_used_at) : ''}</div>` : `<h3>Nenhum perfil cofre ainda</h3><div class="muted" style="font-size:12.5px">Crie um perfil que fica admin de todas as BMs e nunca anuncia.</div>`}</div>
    ${vault ? `<span class="pill p-${vault.status === 'ativo' ? 'good' : 'bad'}">${vault.status === 'ativo' ? 'Seguro' : 'Atenção'}</span><button class="btn sm" data-act="editProfile" data-id="${vault.id}">${ic('edit')}Editar</button>` : `<button class="btn sm primary" data-act="newProfile" data-role="cofre">${ic('plus')}Criar perfil cofre</button>`}
    <button class="btn sm" data-act="fall">${ic('alert')}Uma conta caiu</button></div>
  ${ops.length || loose.length ? `<div class="profiles">${ops.map(profCard).join('')}${loose.length ? `<div class="card prof" data-drop=""><div class="prof-h"><div class="avatar">?</div><div><div style="font-weight:600">BMs sem perfil</div><div class="faint" style="font-size:11.5px">Arraste a BM até um perfil</div></div></div>${loose.map(bmHtml).join('')}</div>` : ''}</div>` : `<div class="card"><div class="empty">${ic('tree')}Conecte a primeira BM em Conexões e depois distribua entre os perfis.</div></div>`}
  <div class="grid g-2e">
    <div class="card"><div class="card-h"><h3>Segurança da estrutura</h3></div><div class="card-b rows">${d.checks.map(c => `<div class="row"><div class="ico-box ib-${c.ok ? 'good' : 'warn'}">${ic(c.ok ? 'check' : 'alert')}</div><div><div class="t">${esc(c.title)}</div><div class="d">${esc(c.detail)}</div></div></div>`).join('')}</div></div>
    <div class="card"><div class="card-h"><h3>Domínios</h3><span class="hint">Se um domínio for marcado, todas as contas que usam ele caem juntas</span><button class="right btn sm" data-act="newDomain">${ic('plus')}Adicionar</button></div>
      <div class="card-b tbl-wrap">${d.domains.length ? `<table><thead><tr><th>Domínio</th><th>Contas usando</th><th>Situação</th><th></th></tr></thead><tbody>${d.domains.map(x => `<tr><td class="txt num">${esc(x.domain)}</td><td>${x.accounts}</td><td><span class="pill p-${x.status === 'ok' ? 'good' : x.status === 'marcado' ? 'bad' : 'info'}">${x.status === 'ok' ? 'Ok' : x.status === 'marcado' ? 'Marcado' : 'Reserva pronta'}</span></td><td><button class="linkbtn" data-act="editDomain" data-id="${x.id}">${ic('edit')}</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">Cadastre os domínios que você usa nos anúncios.</div>'}</div></div>
  </div>`;
}
const initials = n => String(n || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

/* ── REGRAS ── */
const RULE_TXT = {
  roi_low: p => `ROI real abaixo de <code>${f2(p.roi)}</code> depois de gastar <code>${p.min_cpa_mult || 3}× o custo por venda</code> → desligar`,
  roi_high: p => `ROI real acima de <code>${f2(p.roi)}</code> por <code>${p.days || 2} dias</code> seguidos → orçamento <code>+${p.pct || 15}%</code>`,
  spend_no_sale: p => `Gastou mais de <code>${brl(p.spend || 40)}</code> no dia e <code>0</code> vendas reais → desligar`,
  fatigue: p => `Frequência acima de <code>${nf(p.freq || 3, 1)}</code> e CTR caiu <code>${p.ctr_drop || 30}%</code> em ${p.days || 5} dias → avisar`,
  day_roi_low: p => `ROI real do dia abaixo de <code>${f2(p.roi)}</code> a partir das <code>${p.hour || 18}h</code> → avisar`
};
const RULE_FIELDS = {
  roi_low: [['roi', 'ROI abaixo de', 0.1], ['min_cpa_mult', 'Só depois de gastar X vezes o custo por venda', 1]],
  roi_high: [['roi', 'ROI acima de', 0.1], ['days', 'Por quantos dias seguidos', 1], ['pct', 'Subir quantos %', 1]],
  spend_no_sale: [['spend', 'Gasto sem venda (R$)', 1]],
  fatigue: [['freq', 'Frequência acima de', 0.1], ['ctr_drop', 'CTR caiu quantos %', 1], ['days', 'Em quantos dias', 1]],
  day_roi_low: [['roi', 'ROI do dia abaixo de', 0.1], ['hour', 'A partir de que hora', 1]]
};
const MODES = [['notify', 'Só avisar'], ['approve', 'Pedir aprovação'], ['auto', 'Automático']];
async function viewRegras() {
  const [r, pend, hist] = await Promise.all([api('/rules'), api('/actions?status=pending'), api('/actions')]);
  const g = r.guards;
  sub('O Argos vigia as campanhas pelo ROI real e pede sua aprovação');
  topRight('');
  $('#view').innerHTML = `
  ${!g.edit_enabled ? `<div class="banner note">${ic('lock')}<div><h2 style="font-size:16px">Edição desligada: as aprovações ficam guardadas</h2><p>As regras já avisam e montam os pedidos. Pra aprovar e o Argos mexer no Face, ligue a edição em Conexões.</p></div></div>` : ''}
  <div class="grid g-2">
    <div class="card"><div class="card-h"><h3>Suas regras</h3><span class="hint">Usam o ROI real, não o do Face</span></div>
      <div style="padding-top:6px">${r.rules.map(x => `<div class="rule">
        <button class="tog" role="switch" aria-checked="${x.enabled}" data-act="ruleOn" data-id="${x.id}" aria-label="Ligar regra"></button>
        <div style="min-width:0"><div style="font-weight:600;margin-bottom:3px">${esc(x.name)}</div><div class="if">${(RULE_TXT[x.kind] || (() => ''))(x.params || {})}</div>
          <div class="meta"><span>${x.fired_day === ME.today ? `Disparou ${x.fired_today}× hoje` : x.last_fired_at ? 'Último disparo ' + ago(x.last_fired_at) : 'Ainda não disparou'}</span><button class="linkbtn" data-act="ruleEdit" data-id="${x.id}">${ic('edit')}Ajustar números</button></div></div>
        <div class="seg small" role="group" aria-label="Modo">${MODES.map(([k, l]) => `<button aria-pressed="${x.mode === k}" data-act="ruleMode" data-id="${x.id}" data-v="${k}">${l}</button>`).join('')}</div></div>`).join('')}</div></div>
    <div class="card"><div class="card-h"><h3>Esperando sua aprovação</h3><span class="right pill p-${pend.length ? 'warn' : 'good'}">${pend.length}</span></div>
      <div class="card-b" style="display:grid;gap:12px">${pend.length ? pend.map(approveCard).join('') : `<div class="empty">${ic('check')}Nada esperando. As regras estão de olho.</div>`}</div></div>
  </div>
  <div class="card"><div class="card-h"><h3>Tudo que foi mudado</h3><span class="hint">Pelo Argos, por regra ou por você</span></div>
    <div class="card-b tbl-wrap">${hist.length ? `<table><thead><tr><th>Quando</th><th>Origem</th><th style="text-align:left">O que</th><th style="text-align:left">Detalhe</th><th>Situação</th><th></th></tr></thead><tbody>${hist.map(h => `<tr><td>${new Date(h.decided_at || h.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}</td>
      <td class="txt"><span class="pill ${h.source === 'rule' ? 'p-info' : h.source === 'report' ? 'p-gold' : 'p-face'}">${h.source === 'rule' ? 'Regra' : h.source === 'report' ? 'Relatório' : 'Você'}</span></td>
      <td class="txt l">${actLabel(h)}</td><td class="txt l muted">${esc(h.reason || '')}</td>
      <td class="txt">${h.status === 'executed' ? '<span class="pill p-good">Feito</span>' : h.status === 'undone' ? '<span class="pill p-face">Desfeito</span>' : '<span class="pill p-face">Ignorado</span>'}</td>
      <td>${h.status === 'executed' && h.prev ? `<button class="btn sm" data-act="undo" data-id="${h.id}">${ic('undo')}Desfazer</button>` : ''}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">Nenhuma mudança ainda.</div>'}</div></div>
  <div class="card card-b" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
    <div class="ico-box ib-info">${ic('shield')}</div>
    <div style="flex:1;min-width:220px"><div style="font-weight:600">Travas que valem pra todas as regras</div><div class="muted" style="font-size:12.5px">Só julga campanha depois de gastar 3× o custo por venda (${brl(ME.targets.cpa_target)}) · nunca mexe mais de ${g.max_change_pct}% no orçamento por vez · teto de ${brl(g.max_campaign_budget)} por campanha · as regras de ROI esperam se poucas vendas vierem com etiqueta</div></div>
    <button class="btn ${g.paused_all ? 'primary' : 'danger'}" data-act="pauseAll">${ic(g.paused_all ? 'arrowR' : 'pause')}${g.paused_all ? 'Retomar as regras' : 'Pausar todas as regras'}</button></div>`;
}
function actLabel(a) {
  const t = a.action === 'pause' ? 'Desligar' : a.action === 'activate' ? 'Ligar' : a.payload && a.payload.value ? `Orçamento para ${brl(a.payload.value)}` : `Orçamento +${(a.payload && a.payload.pct) || ''}%`;
  return `${t} <b>${esc(a.object_name || a.object_id)}</b>`;
}
function approveCard(a) {
  return `<div class="approve"><div style="display:flex;gap:8px;align-items:center"><span class="pill ${a.source === 'report' ? 'p-gold' : 'p-warn'}">${a.source === 'report' ? 'Relatório' : esc(a.rule_name || 'Regra')}</span><span class="faint num" style="margin-left:auto;font-size:11.5px">${hhmm(a.created_at)}</span></div>
    <div style="font-weight:600">${actLabel(a)}</div><div class="muted" style="font-size:12.5px">${esc(a.reason || '')}</div>${a.error ? `<div class="down" style="font-size:12px">${esc(a.error)}</div>` : ''}
    <div class="btns"><button class="btn primary sm" data-act="approve" data-id="${a.id}">${ic('check')}Aprovar</button><button class="btn sm" data-act="ignore" data-id="${a.id}">Ignorar</button></div></div>`;
}

/* ── RELATÓRIOS ── */
let repId = null;
async function viewRel() {
  const [list, nums] = await Promise.all([api('/reports'), api('/daynums')]);
  sub('A análise diária do Claude, com gráficos');
  topRight('');
  if (!repId && list.length) repId = list[0].id;
  const rep = repId ? await api('/reports/' + repId) : null;
  $('#view').innerHTML = `<div class="grid g-rel">
    <div style="display:grid;gap:18px;min-width:0">${rep ? reportHtml(rep) : `<div class="card"><div class="empty" style="padding:48px 18px">${ic('doc')}<b style="color:var(--fg)">Nenhuma análise ainda</b>A primeira chega às 07:00, depois que a rotina do Claude for ligada (veja Conexões).</div></div>`}</div>
    <div style="display:grid;gap:18px;align-content:start;min-width:0">
      <div class="card"><div class="card-h"><h3>Números do dia</h3><span class="hint">Automático, direto do Face e das vendas</span></div>
        <div class="card-b tbl-wrap"><table><thead><tr><th>Dia</th><th>Cliques</th><th>Compras</th><th>ROI real</th></tr></thead><tbody>${nums.filter(n => n.spend > 0 || n.sales > 0).map(n => `<tr title="Entraram ${nf(n.visitors)} · conversão ${pct(n.conv, 2)}"><td class="txt">${dayLabel(n.day)}</td><td>${nf(n.clicks)}</td><td>${nf(n.sales)}</td><td><span class="pill p-${n.roi >= ME.targets.roi_goal ? 'good' : n.roi >= 1.3 ? 'gold' : n.roi >= 1.05 ? 'warn' : 'bad'}">${f2(n.roi)}</span></td></tr>`).join('') || '<tr><td colspan="4" class="txt muted">Sem dados ainda</td></tr>'}</tbody></table></div></div>
      <div class="card"><div class="card-h"><h3>Análises anteriores</h3></div><div class="card-b rows">${list.length ? list.map(r => `<button class="row" style="width:100%;background:none;border-left:0;border-right:0;border-bottom:0;text-align:left;${r.id === repId ? 'color:var(--gold)' : ''}" data-act="openRep" data-id="${r.id}"><div class="ico-box ib-${r.id === repId ? 'gold' : 'face'}">${ic('doc')}</div><div><div class="t">${dayLabel(r.day)}${r.source === 'demo' ? ' · exemplo' : ''}</div><div class="d" style="white-space:normal">${esc(r.title)}</div></div><span class="when">${ic('arrowR')}</span></button>`).join('') : '<div class="faint">Nenhuma ainda.</div>'}</div></div>
      <div class="card"><div class="card-h"><h3>Como a análise chega</h3></div><div class="card-b rows">
        <div class="row"><div class="ico-box ib-gold">${ic('clock')}</div><div><div class="t">Todo dia às 07:00</div><div class="d">O Claude roda sozinho na nuvem, lê o Argos (Face + app + vendas) e escreve a análise</div></div></div>
        <div class="row"><div class="ico-box ib-info">${ic('bell')}</div><div><div class="t">Notificação no celular</div><div class="d">Resumo em uma linha; toque pra abrir aqui</div></div></div>
        <div class="row"><div class="ico-box ib-good">${ic('check')}</div><div><div class="t">Sugestões viram botão</div><div class="d">Você aprova e o Argos executa no Face (com a edição ligada)</div></div></div></div></div>
    </div></div>`;
}
function reportHtml(r) {
  const c = r.content || {};
  const done = JSON.parse(store.get('radar-todo-' + r.id) || '[]');
  return `<div class="card card-b report" style="padding:24px 26px">
      <div class="toolbar" style="margin-bottom:12px"><span class="pill p-gold">${r.source === 'demo' ? 'Exemplo' : 'Análise do Claude'}</span><span class="faint" style="font-size:12px">Sobre ${dayLabel(r.day)} · publicado ${new Date(r.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}</span></div>
      <h2>${esc(r.title)}</h2>
      ${(c.kpis || []).length ? `<div class="grid g-4" style="gap:10px;margin-top:16px">${c.kpis.map(k => `<div class="kbox"><span class="eyebrow" style="font-size:10px">${esc(k.label)}</span><b class="num ${k.tone === 'bad' ? 'down' : k.tone === 'good' ? 'up' : ''}" style="font-size:20px">${esc(k.value)}</b><span class="faint" style="font-size:11.5px">${esc(k.note)}</span></div>`).join('')}</div>` : ''}
    </div>
    ${(c.changes || []).length || (c.normal || []).length ? `<div class="card"><div class="card-h"><h3>O que mudou</h3><span class="hint">Só aparece o que fugiu do normal dos últimos 7 dias</span></div><div class="card-b" style="display:grid;gap:12px">
      <div class="grid g-3" style="gap:12px">${(c.changes || []).map(x => `<div class="chg"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span style="font-weight:600;font-size:13px">${esc(x.title)}</span><span class="pill p-${x.tone}">${x.tone === 'bad' ? 'Grave' : x.tone === 'good' ? 'Bom' : 'Atenção'}</span></div><b class="num ${x.tone === 'bad' ? 'down' : x.tone === 'good' ? 'up' : 'w'}" style="font-size:22px">${esc(x.value)}</b><span class="faint" style="font-size:11.5px">${esc(x.note)}</span>${spark(x.series, css(x.tone === 'bad' ? '--bad' : x.tone === 'good' ? '--good' : '--warn'))}<span style="font-size:12px;color:var(--muted)">${esc(x.hint)}</span></div>`).join('')}</div>
      ${(c.normal || []).length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:12.5px"><span class="muted">Normal, sem nada a dizer:</span>${c.normal.map(n => `<span class="pill p-face">${esc(n)}</span>`).join('')}</div>` : ''}</div></div>` : ''}
    ${r.days7 && r.days7.length ? `<div class="card"><div class="card-h"><h3>Últimos 7 dias</h3><div class="right legend"><span><i class="sw face"></i>Gasto</span><span><i class="sw gold"></i>Faturamento real</span><span><i class="sw line"></i>ROI real</span></div></div><div class="card-b">${chart7(r.days7)}</div></div>` : ''}
    ${(c.campaigns || []).length ? `<div class="card"><div class="card-h"><h3>Campanha por campanha</h3><span class="hint">ROI real dos 7 dias e a sugestão</span></div><div class="card-b tbl-wrap"><table><thead><tr><th>Campanha</th><th>No ar há</th><th style="text-align:left">ROI real · 7 dias</th><th>No dia</th><th style="text-align:left">Sugestão</th></tr></thead><tbody>
      ${c.campaigns.map(k => `<tr><td class="txt"><span class="cname">${esc(k.name)}</span></td><td>${k.days_on == null ? '—' : k.days_on + ' dias'}</td><td style="width:130px">${spark(k.series, css('--' + (k.tone === 'gold' || k.tone === 'face' || k.tone === 'info' ? 'gold' : k.tone)), 120, 28)}</td><td class="real-v">${k.roi != null ? f2(k.roi) : '—'}</td>
        <td class="txt l"><div style="display:flex;gap:8px;align-items:center;justify-content:space-between"><span class="pill p-${k.tone}">${esc(k.suggestion)}</span>${k.action_id && k.action_status === 'pending' ? `<button class="btn sm primary" data-act="approve" data-id="${k.action_id}">${ic('check')}Aprovar</button>` : k.action_status === 'executed' ? '<span class="faint" style="font-size:12px">feito</span>' : k.action_status === 'ignored' ? '<span class="faint" style="font-size:12px">ignorado</span>' : ''}</div></td></tr>`).join('')}</tbody></table></div></div>` : ''}
    <div class="card card-b report" style="padding:22px 26px">
      ${(c.analysis || []).length ? `<h4 style="margin-top:0">A análise</h4>${c.analysis.map(p => `<p>${esc(p)}</p>`).join('')}` : ''}
      ${(c.todo || []).length ? `<h4>O que fazer hoje</h4><ul>${c.todo.map((t, i) => `<li><button class="check" role="checkbox" aria-checked="${done.includes(i)}" data-act="todo" data-rep="${r.id}" data-i="${i}" aria-label="Feito">${done.includes(i) ? ic('check') : ''}</button><span>${esc(t)}</span></li>`).join('')}</ul>` : ''}
    </div>`;
}

/* ── CONEXÕES ── */
async function viewInt() {
  const s = await api('/settings');
  sub('Face, app de membros, Andrômeda, Claude, celular e configurações');
  topRight(`<button class="chip" data-act="sync">${ic('refresh')}Atualizar agora</button>`);
  const tg = s.targets, g = s.guards, n = s.notify, a = s.andromeda;
  const push = 'Notification' in window ? Notification.permission : 'unsupported';
  const tagPct = s.tagged.v ? Math.round(s.tagged.t / s.tagged.v * 100) : 0;
  $('#view').innerHTML = `
  ${s.demo ? `<div class="banner gold">${ic('info')}<div><h2 style="font-size:16px">Você está vendo dados de demonstração</h2><p>Tudo aqui é simulado pra você conhecer o sistema. Pra usar de verdade: troque <b>DEMO_MODE</b> para <b>0</b> no EasyPanel, reinicie e conecte as BMs abaixo.</p></div></div>` : s.demo_data ? `<div class="banner gold">${ic('info')}<div><h2 style="font-size:16px">Ainda há dados de demonstração guardados</h2><p>Apague antes de conectar as BMs reais pra não misturar.</p></div><button class="btn danger" data-act="clearDemo">${ic('trash')}Apagar demonstração</button></div>` : ''}
  <div class="card"><div class="card-h"><h3>Conexões</h3></div><div style="padding-top:6px">
    <div class="int"><div class="ico-box ib-info">${ic('meta')}</div><div><div style="font-weight:600">Facebook · ${s.bms.n} BM${s.bms.n === 1 ? '' : 's'} com chave</div><div class="muted" style="font-size:12.5px">Chave de leitura por BM (usuário do sistema). Se um perfil cair, a BM continua conectada. ${s.bms.n && s.bms.ok < s.bms.n ? `<b class="down">${s.bms.n - s.bms.ok} com problema.</b>` : ''}</div></div><button class="btn sm primary" data-act="connectBm">${ic('plus')}Conectar BM</button></div>
    <div class="int"><div class="ico-box ib-gold">${ic('app')}</div><div><div style="font-weight:600">App de membros</div><div class="muted" style="font-size:12.5px">${s.app_connected ? `Lendo entradas, conversas, Pix e vendas (só leitura). ${tagPct ? `${tagPct}% das entradas dos últimos 3 dias vieram com etiqueta do Face.` : ''}` : 'Não conectado. Falta a variável APP_DATABASE_URL (veja o guia de deploy).'}</div></div><span class="pill p-${s.app_connected ? 'good' : 'bad'}">${s.app_connected ? 'Só leitura' : 'Desligado'}</span></div>
    <div class="int"><div class="ico-box ib-good">${ic('andro')}</div><div><div style="font-weight:600">Andrômeda</div><div class="muted" style="font-size:12.5px">Recebe só o gasto total do dia (sem imposto), a cada ${s.collect.light_min || 15} min e no fechamento (00:05, conferido às 04:00).</div></div><span class="pill p-${a.enabled && a.url ? 'good' : 'face'}">${a.enabled && a.url ? 'Enviando' : 'Desligado'}</span></div>
    <div class="int"><div class="ico-box ib-info">${ic('cpu')}</div><div><div style="font-weight:600">Claude</div><div class="muted" style="font-size:12.5px">${s.last_report ? 'Última análise ' + ago(s.last_report.created_at) : 'A rotina das 07:00 ainda não publicou nenhuma análise.'}</div></div><span class="pill p-${s.last_report ? 'good' : 'face'}">${s.last_report ? 'Ligado' : 'Aguardando'}</span></div>
  </div></div>
  <div class="grid g-2e">
    <div class="card"><div class="card-h"><h3>Etiqueta dos anúncios</h3><span class="hint">Cole em "Parâmetros de URL" de cada anúncio</span></div><div class="card-b" style="display:grid;gap:10px">
      <div class="code" id="utmCode">${esc(s.utm_template)}</div>
      <div class="btns"><button class="btn sm" data-act="copyUtm">${ic('copy')}Copiar</button></div>
      <p class="muted" style="margin:0;font-size:12.5px">É isso que liga cada venda real ao anúncio que trouxe o lead. Sem ela, o ROI por campanha fica em branco.</p></div></div>
    <div class="card"><div class="card-h"><h3>Andrômeda</h3><span class="hint">Endereço que o Andrômeda vai criar pra receber</span></div><div class="card-b form">
      <div class="field"><label for="anUrl">Endereço (URL)</label><input id="anUrl" value="${esc(a.url || '')}" placeholder="https://andromeda.../api/gasto-face"></div>
      <div class="form-row"><div class="field"><label for="anSec">Senha de envio</label><input id="anSec" value="${esc(a.secret || '')}" placeholder="texto combinado com o Andrômeda"></div>
        <div class="field"><label>Ligado</label><button class="tog" role="switch" aria-checked="${!!a.enabled}" id="anOn" aria-label="Ligar envio" style="margin-top:8px"></button></div></div>
      <div class="btns"><button class="btn sm primary" data-act="saveAndro">${ic('check')}Salvar</button><button class="btn sm" data-act="testAndro">Enviar agora</button></div>
      <div class="rows">${s.andromeda_log.map(l => `<div class="row"><div class="ico-box ib-${l.ok ? 'good' : 'bad'}">${ic(l.ok ? 'check' : 'alert')}</div><div><div class="t num">${brl(l.total, 2)}</div><div class="d">${l.closing ? 'Fechamento de ' + dayLabel(String(l.day).slice(0, 10)) : 'Gasto total até agora'}${l.ok ? '' : ' · ' + esc(l.error || 'erro ' + l.status_code)}</div></div><span class="when">${hhmm(l.sent_at)}</span></div>`).join('')}</div>
    </div></div>
  </div>
  <div class="grid g-2e">
    <div class="card"><div class="card-h"><h3>Notificações neste aparelho</h3><span class="hint">${s.push_subs} aparelho${s.push_subs === 1 ? '' : 's'} recebendo</span></div><div class="card-b" style="display:grid;gap:10px">
      <div class="btns"><button class="btn sm primary" data-act="enablePush">${ic('bell')}${push === 'granted' ? 'Reativar neste aparelho' : 'Ativar neste aparelho'}</button><button class="btn sm" data-act="testPush">Mandar teste</button></div>
      <p class="faint" style="margin:0;font-size:12px">No iPhone: abra o Argos no Safari, toque em Compartilhar → "Adicionar à Tela de Início", abra pelo ícone e então ative.</p>
      <div>${[['roi_day', 'ROI do dia', `Às ${(n.roi_hours || []).join('h, ')}h`], ['account_down', 'Conta ou BM caiu', 'Até 15 min'], ['ad_rejected', 'Anúncio reprovado ou conjunto com erro', 'Até 15 min'], ['approval', 'Pedido de aprovação', 'Na hora'], ['spend_no_sale', 'Campanha gastou sem vender', 'Na hora'], ['fatigue', 'Criativo cansando', '1× por dia'], ['report', 'Análise da manhã', '07:00']].map(([k, t, d]) => `<div class="nt"><div class="t"><b>${t}</b><span>${d}</span></div><button class="tog" role="switch" aria-checked="${n[k] !== false}" data-act="notifTog" data-k="${k}" aria-label="${t}"></button></div>`).join('')}</div>
      <div class="field"><label for="roiHours">Horários do aviso de ROI (separados por vírgula)</label><input id="roiHours" value="${(n.roi_hours || []).join(', ')}"></div>
      <div class="btns"><button class="btn sm" data-act="saveHours">Salvar horários</button></div>
    </div></div>
    <div class="card"><div class="card-h"><h3>Metas do negócio</h3><span class="hint">Usadas nos cálculos e nas regras</span></div><div class="card-b form">
      <div class="form-row">
        <div class="field"><label for="tgRoi">ROI que você busca</label><input id="tgRoi" type="number" step="0.05" value="${tg.roi_goal}"></div>
        <div class="field"><label for="tgBud">Meta de gasto por dia (R$)</label><input id="tgBud" type="number" step="50" value="${tg.daily_budget_goal}"></div>
        <div class="field"><label for="tgCpa">Custo por venda normal (R$)</label><input id="tgCpa" type="number" step="0.5" value="${tg.cpa_target}"></div>
        <div class="field"><label for="tgTax">Imposto sobre o investido (%)</label><input id="tgTax" type="number" step="0.01" value="${tg.tax_pct}"></div>
        <div class="field"><label for="tgShare">Máximo do gasto numa conta só (%)</label><input id="tgShare" type="number" step="1" value="${tg.max_account_share}"></div>
        <div class="field"><label for="tgInt">Atualizar o gasto a cada (min)</label><input id="tgInt" type="number" step="5" min="5" value="${s.collect.light_min || 15}"></div>
      </div>
      <div class="btns"><button class="btn sm primary" data-act="saveTargets">${ic('check')}Salvar metas</button></div></div></div>
  </div>
  <div class="card"><div class="card-h"><h3>Edição pelo Argos</h3><span class="hint">Etapa 4: ligue quando confiar nos números</span></div><div class="card-b form">
    <div class="nt"><div class="t"><b>Permitir que o Argos mexa nas campanhas</b><span>Ligar, desligar e mudar orçamento pelo painel e pelas aprovações. A chave da BM precisa da permissão de gerenciar anúncios.</span></div><button class="tog" role="switch" aria-checked="${g.edit_enabled}" data-act="guardTog" data-k="edit_enabled" aria-label="Permitir edição"></button></div>
    <div class="nt"><div class="t"><b>Permitir regras no modo automático</b><span>Sem pedir aprovação. Só use em regras que já se mostraram certas.</span></div><button class="tog" role="switch" aria-checked="${g.auto_enabled}" data-act="guardTog" data-k="auto_enabled" aria-label="Permitir automático"></button></div>
    <div class="form-row">
      <div class="field"><label for="gdPct">Máximo de mudança no orçamento (%)</label><input id="gdPct" type="number" step="1" value="${g.max_change_pct}"></div>
      <div class="field"><label for="gdCamp">Teto por campanha (R$/dia)</label><input id="gdCamp" type="number" step="10" value="${g.max_campaign_budget}"></div>
    </div>
    <div class="btns"><button class="btn sm primary" data-act="saveGuards">${ic('check')}Salvar travas</button></div></div></div>
  <div class="card"><div class="card-h"><h3>Últimas leituras</h3><span class="hint">Face ${esc(s.meta_version)} · app · fechamento</span></div><div class="card-b tbl-wrap"><table><thead><tr><th>Quando</th><th>Tipo</th><th>Tempo</th><th style="text-align:left">Resultado</th></tr></thead><tbody>${s.sync_log.map(l => `<tr><td>${new Date(l.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}</td><td class="txt">${l.kind === 'collect' ? 'Leitura' : l.kind === 'close' ? 'Fechamento' : 'Conferência'}</td><td>${nf((l.ms || 0) / 1000, 1)} s</td><td class="txt l">${l.ok ? '<span class="pill p-good">Ok</span>' : `<span class="pill p-bad">Erro</span> <span class="muted" style="white-space:normal">${esc(l.detail)}</span>`}</td></tr>`).join('') || '<tr><td colspan="4" class="txt muted">Nenhuma leitura ainda</td></tr>'}</tbody></table></div></div>`;
  $('#anOn').onclick = e => e.currentTarget.setAttribute('aria-checked', e.currentTarget.getAttribute('aria-checked') !== 'true');
}

function connectBmSheet() {
  sheet({
    title: 'Conectar uma BM', wide: true, ok: 'Conectar',
    body: `<p>Faça isso uma vez por BM. A chave fica guardada criptografada e não depende do login de nenhum perfil.</p>
      <ol class="steps">
        <li>Abra <b>business.facebook.com</b> → Configurações do negócio → <b>Usuários do sistema</b> → Adicionar (função: Admin).</li>
        <li>No usuário criado: <b>Atribuir ativos</b> → Contas de anúncios → marque todas as contas dessa BM (controle total).</li>
        <li><b>Gerar novo token</b> → escolha o app do Argos → validade <b>Nunca</b> → marque <b>ads_read</b> (e <b>ads_management</b> se for usar a edição) e <b>business_management</b>.</li>
        <li>Copie a chave e cole abaixo.</li>
      </ol>
      <div class="field"><label for="tok">Chave (token) do usuário do sistema</label><textarea id="tok" name="token" placeholder="EAAG..."></textarea></div>
      <div class="field"><label for="tokP">Perfil que administra essa BM (opcional)</label><select id="tokP" name="profile_id"><option value="">Escolher depois</option>${(ST_DATA ? ST_DATA.profiles : []).map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div>`,
    onOk: async v => {
      const r = await api('/bms/connect', { body: { token: v.token, profile_id: v.profile_id || null } });
      toast(`Conectado: ${r.bms.map(b => `${b.bm} (${b.accounts.length} contas)`).join(', ')}`);
      if (r.warning) setTimeout(() => toast(r.warning, true), 3000);
      go(view);
    }
  });
}

/* ───────────────────────── CELULAR ───────────────────────── */
const MOB = [['hoje', 'home', 'Hoje'], ['aprovar', 'bolt', 'Aprovar'], ['alertas', 'bell', 'Alertas'], ['rel', 'doc', 'Análise']];
async function renderMobile() {
  lastMobile = true;
  $('#root').innerHTML = `<div class="mob"><div class="mob-top"><div class="mt">${LOGO}<b id="mTitle"></b></div><div style="display:flex;gap:6px;align-items:center"><span class="sync" style="font-size:11.5px" id="syncLine"></span><button class="chip" data-act="sync" aria-label="Atualizar agora">${ic('refresh')}</button><button class="chip" data-act="full" aria-label="Versão completa">${ic('monitor')}</button></div></div>
    <div class="mob-body" id="mBody"><div class="loading">Carregando…</div></div>
    <nav class="mob-nav" id="mNav"></nav></div>`;
  mob(mobTab);
}
async function mob(t) {
  mobTab = t;
  let pend = [];
  try { pend = await api('/actions?status=pending'); } catch (e) { return; }
  $('#mNav').innerHTML = MOB.map(([k, i, l]) => `<button data-act="mob" data-v="${k}" aria-current="${k === t}">${ic(i)}${l}${k === 'aprovar' && pend.length ? `<span class="count">${pend.length}</span>` : ''}</button>`).join('');
  $('#mTitle').textContent = MOB.find(m => m[0] === t)[2];
  const B = $('#mBody');
  try {
    if (t === 'hoje') {
      const o = await api('/overview');
      const c = o.cur, p = o.prev, C = 2 * Math.PI * 50, fill = Math.min(1, div(c.roi, o.targets.roi_goal * 1.25));
      const subscribed = 'Notification' in window && Notification.permission === 'granted';
      B.innerHTML = `${ME.demo ? '<span class="demo" style="justify-self:start">Dados de demonstração</span>' : ''}
        ${!subscribed ? `<button class="btn primary block" data-act="enablePush">${ic('bell')}Ativar notificações</button>` : ''}
        <div class="hero-wrap"><div class="spend" style="padding:18px 20px;gap:10px"><span class="eyebrow">Gasto hoje · até ${o.hour}h</span><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span class="big grad-t num" style="font-size:40px">R$ ${nf(c.spend)}</span>${dNeutral(c.spend, p.spend)}</div><div class="bbar"><i class="${c.spend > o.targets.daily_budget_goal ? 'hi' : ''}" style="width:${Math.min(100, div(c.spend, o.targets.daily_budget_goal) * 100)}%"></i></div><div class="row2"><span>Meta do dia <b>${brl(o.targets.daily_budget_goal)}</b></span><span>${nf(c.clicks)} cliques</span></div></div></div>
        <div class="card ring-card"><div class="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill="none" stroke="var(--surface-2)" stroke-width="10"/><circle cx="60" cy="60" r="50" fill="none" stroke="${c.roi >= o.targets.roi_goal ? 'var(--good)' : c.roi >= 1.1 ? 'var(--gold)' : 'var(--bad)'}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C * fill} ${C}"/></svg><div class="c"><b class="grad-t">${f2(c.roi)}</b><span>ROI real</span></div></div>
          <div class="kv"><div><span class="muted">Gasto</span><b>${brl(c.spend)}</b></div><div><span class="muted">Faturamento</span><b>${brl(c.revenue)}</b></div><div><span class="muted">Lucro no bolso</span><b class="${c.profit < 0 ? 'down' : 'up'}">${brl(c.profit)}</b></div><div><span class="muted">Face diz</span><span class="ghost">ROI ${f2(c.roi_face)}</span></div></div></div>
        <div class="card card-b" style="display:grid;gap:9px"><div class="eyebrow">Funil de hoje · até ${o.hour}h</div>
          ${[['Cliques no Face', c.clicks, null], ['Entraram no app', c.visitors, c.arrival], ['Conversaram', c.chatted, c.chat_rate], ['Clicaram em comprar', c.checkout, c.checkout_rate], ['Geraram Pix', c.pix, c.pix_rate], ['Pagaram', c.sales, c.pay_rate]].map(r => `<div style="display:flex;justify-content:space-between;font-size:13px"><span>${r[0]}</span><span class="num"><b>${nf(r[1])}</b> <span class="faint" style="font-size:11.5px;display:inline-block;width:44px;text-align:right">${r[2] == null ? '' : pct(r[2], 0)}</span></span></div>`).join('')}
          <div style="font-size:12.5px;color:var(--muted);border-top:1px dashed var(--line-2);padding-top:8px">Conversão de quem entrou: <b class="num" style="color:var(--gold)">${pct(c.conv, 2)}</b></div></div>
        <div class="card card-b" style="display:grid;gap:10px"><div class="eyebrow">A corrente, vs ${o.prev_label}</div>
          ${[['CPM', brl(c.cpm, 2), delta(c.cpm, p.cpm, true)], ['CTR', pct(c.ctr), delta(c.ctr, p.ctr)], ['Chegou no app', pct(c.arrival, 0), delta(c.arrival, p.arrival)], ['Comprou', pct(c.conv, 2), delta(c.conv, p.conv)], ['Ticket', brl(c.ticket, 2), delta(c.ticket, p.ticket)]].map(r => `<div style="display:flex;justify-content:space-between;font-size:13px;align-items:center"><span>${r[0]}</span><span class="num">${r[1]} ${r[2]}</span></div>`).join('')}</div>
        <div class="card card-b" style="display:grid;gap:8px"><div class="eyebrow">Melhores agora</div>${o.top.slice(0, 4).map(x => `<div style="display:flex;justify-content:space-between;font-size:12.5px;gap:8px"><span class="num" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.name)}</span><b class="real-v num">${f2(x.roi)}</b></div>`).join('') || '<span class="faint">Sem gasto ainda</span>'}</div>`;
      updateSync(o.last_sync);
    } else if (t === 'aprovar') {
      B.innerHTML = (!ME.guards.edit_enabled ? `<div class="banner note" style="padding:12px">${ic('lock')}<p style="font-size:12.5px">A edição está desligada. Ligue em Conexões (versão completa) pra aprovar.</p></div>` : '') +
        (pend.length ? pend.map(approveCard).join('') : `<div class="empty">${ic('check')}Nada esperando.</div>`);
    } else if (t === 'alertas') {
      const al = await api('/alerts');
      B.innerHTML = `<div class="card card-b rows">${al.length ? al.map(alertRow).join('') : `<div class="empty">${ic('check')}Nenhum alerta.</div>`}</div>`;
      api('/alerts/seen', { body: {} }).catch(() => {});
    } else if (t === 'rel') {
      const list = await api('/reports');
      if (!list.length) { B.innerHTML = `<div class="empty">${ic('doc')}A primeira análise chega às 07:00.</div>`; return; }
      const r = await api('/reports/' + list[0].id);
      const c = r.content || {};
      B.innerHTML = `<div class="card card-b" style="display:grid;gap:10px"><span class="pill p-gold" style="justify-self:start">${dayLabel(r.day)}${r.source === 'demo' ? ' · exemplo' : ''}</span>
        <div style="font-family:var(--f-display);font-size:19px;font-weight:700;line-height:1.2">${esc(r.title)}</div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:8px">${(c.kpis || []).map(k => `<div class="kbox"><span class="eyebrow" style="font-size:9.5px">${esc(k.label)}</span><b class="num ${k.tone === 'bad' ? 'down' : k.tone === 'good' ? 'up' : ''}" style="font-size:17px">${esc(k.value)}</b><span class="faint" style="font-size:11px">${esc(k.note)}</span></div>`).join('')}</div></div>
        ${(c.changes || []).map(x => `<div class="chg"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:13px">${esc(x.title)}</b><b class="num ${x.tone === 'bad' ? 'down' : 'w'}">${esc(x.value)}</b></div>${spark(x.series, css(x.tone === 'bad' ? '--bad' : '--warn'), 300, 30)}<span class="muted" style="font-size:12px">${esc(x.hint)}</span></div>`).join('')}
        <div class="card card-b" style="display:grid;gap:8px"><div class="eyebrow">Fazer hoje</div>${(c.todo || []).map(t => `<div style="display:flex;gap:8px;font-size:13px"><span style="color:var(--gold)">${ic('check')}</span>${esc(t)}</div>`).join('')}</div>
        <button class="btn block" data-act="fullRel">${ic('monitor')}Ver a análise completa</button>`;
    }
  } catch (err) { if (err.message !== 'Faça login') B.innerHTML = `<div class="empty">${ic('alert')}${esc(err.message)}</div>`; }
}

/* ───────────────────────── notificações ───────────────────────── */
function urlB64(b) { const p = '='.repeat((4 - b.length % 4) % 4); const s = atob((b + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...s].map(c => c.charCodeAt(0))); }
async function enablePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) { toast('Este navegador não aceita notificações. No iPhone, adicione o Argos à Tela de Início primeiro.', true); return; }
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { toast('Permissão negada. Libere as notificações do Argos nas configurações do navegador.', true); return; }
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(ME.vapid) });
  await api('/push/subscribe', { body: sub.toJSON() });
  toast('Notificações ligadas neste aparelho');
}

/* ───────────────────────── ações (cliques) ───────────────────────── */
const reload = () => (isMobile() ? mob(mobTab) : go(view));
const ACT = {
  async sync(el) { el.disabled = true; el.classList.add('spin'); toast('Lendo Face e app… leva uns segundos'); const r = await api('/sync', { body: {} }).finally(() => { el.disabled = false; el.classList.remove('spin'); }); toast(r.ok ? 'Atualizado' : (r.error || 'Terminou com avisos'), !r.ok); reload(); },
  theme(el) { const r = document.documentElement; const n = el.dataset.v || (r.dataset.theme === 'light' ? 'dark' : 'light'); r.dataset.theme = n; store.set('radar-theme', n); render(); },
  async logout() { await api('/logout', { body: {} }); showLogin(); },
  editGoals() {
    const d = window.__goalsData || {}; const g = d.goal || {}; const pm = d.prev_month || {};
    const v = k => (g[k] != null ? g[k] : '');
    sheet({ title: `Metas de ${monthLabel(mMonth).toLowerCase()}`, wide: true, ok: 'Salvar metas',
      body: `<p>Mês passado: ${brl(pm.invest)} investidos · ${nf(pm.sales)} vendas · ${brl(pm.revenue)} faturados · ${brl(pm.profit)} de lucro · ROI ${f2(pm.roi)}. Deixe em branco o que não quiser acompanhar.</p>
        <div class="form-row">
          <div class="field"><label for="gI">Investimento no Face (R$)</label><input id="gI" name="invest" type="number" step="100" value="${v('invest')}"></div>
          <div class="field"><label for="gS">Vendas</label><input id="gS" name="sales" type="number" step="10" value="${v('sales')}"></div>
          <div class="field"><label for="gR">Faturamento (R$)</label><input id="gR" name="revenue" type="number" step="100" value="${v('revenue')}"></div>
          <div class="field"><label for="gP">Lucro (R$)</label><input id="gP" name="profit" type="number" step="100" value="${v('profit')}"></div>
          <div class="field"><label for="gO">ROI real (com imposto)</label><input id="gO" name="roi" type="number" step="0.05" value="${v('roi')}"></div>
        </div>
        <div class="field"><label for="gN">Anotação (opcional)</label><input id="gN" name="notes" value="${esc(g.notes || '')}" placeholder="Ex.: novembro com 5 mil/dia e ROI 1,8"></div>`,
      onOk: async vals => { await api('/goals', { method: 'PUT', body: { month: mMonth, ...vals } }); toast('Metas salvas'); viewMetas(); } });
  },
  dpOpen() { dpOpen = !dpOpen; drawDp(); },
  dpPick(el) { ov = { k: el.dataset.v, from: null, to: null }; dpOpen = false; drawDp(); viewGeral(); },
  dpApply() { let a = $('#dpFrom').value, b = $('#dpTo').value; if (!a || !b) return toast('Escolha as duas datas', true); if (a > b) [a, b] = [b, a]; ov = { k: 'custom', from: a, to: b }; dpOpen = false; drawDp(); viewGeral(); },
  cpPeriod(el) { cp.period = el.dataset.v; viewCamp(); },
  cpLevel(el) { cp.level = el.dataset.v; viewCamp(); },
  cpActive() { cp.active = !cp.active; viewCamp(); },
  crFilter(el) { crFilter = el.dataset.v; viewCre(); },
  abToggle() { abOpen = !abOpen; drawAlertBar(); },
  abOk() { store.set('argos-alert-seen', Math.max(...AB.map(a => a.id))); abOpen = false; drawAlertBar(); },
  crSort(el) { crSort = el.dataset.v; viewCre(); },
  crDays(el) { crDays = Number(el.dataset.v); viewCre(); },
  crOpen(el) { crOpen = el.dataset.v && el.dataset.v !== crOpen ? el.dataset.v : null; viewCre().then(() => { if (crOpen) { const d = $('.cre-dt'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }); },
  tog(el) {
    const c = campRows[+el.dataset.i];
    if (!campGuards.edit_enabled) return editLocked();
    const on = c.status === 'ACTIVE';
    sheet({ title: `${on ? 'Desligar' : 'Ligar'} ${esc(c.name)}?`, body: `<p>Gasto no período ${brl(c.spend, 2)} · ROI real ${f2(c.roi)} (Face diz ${f2(c.roi_face)}). A mudança vai pro Face na hora e fica no histórico.</p>`, ok: on ? 'Desligar' : 'Ligar', danger: on,
      onOk: async () => { await api(`/objects/${cp.level}/${c.id}/status`, { body: { action: on ? 'pause' : 'activate' } }); toast(`${c.name} ${on ? 'desligada' : 'ligada'}`); viewCamp(); } });
  },
  bud(el) {
    const c = campRows[+el.dataset.i];
    if (!campGuards.edit_enabled) return editLocked();
    sheet({ title: `Orçamento de ${esc(c.name)}`, body: `<p>Hoje: ${brl(c.budget)}/dia. Mudanças acima de ${campGuards.max_change_pct}% fazem o Face reiniciar o aprendizado da campanha. Teto: ${brl(campGuards.max_campaign_budget)}.</p><div class="field"><label for="budIn">Novo orçamento diário (R$)</label><input id="budIn" name="value" type="number" step="5" value="${Math.round(c.budget)}"></div><div class="faint" id="budHint" style="font-size:12px"></div>`,
      onOk: async v => { await api(`/objects/campaign/${c.id}/budget`, { body: { value: Number(v.value) } }); toast('Orçamento atualizado'); viewCamp(); } });
    const inp = $('#budIn'), h = $('#budHint');
    inp.oninput = () => { const d = (inp.value / c.budget - 1) * 100; h.textContent = isFinite(d) ? `${d >= 0 ? '+' : ''}${nf(d)}%${Math.abs(d) > campGuards.max_change_pct ? ' · acima da trava: o Face vai reiniciar o aprendizado' : ''}` : ''; h.className = Math.abs(d) > campGuards.max_change_pct ? 'w' : 'faint'; };
  },
  addNote() {
    sheet({ title: 'Anotar uma mudança', body: `<p>Ex.: "Subi o VIP pra 24,90", "Troquei as imagens da Carol". Vira uma marca no gráfico.</p>
      <div class="field"><label for="nT">O que mudou</label><input id="nT" name="title" maxlength="140"></div>
      <div class="form-row"><div class="field"><label for="nD">Dia</label><input id="nD" name="day" type="date" value="${ME.today}" max="${ME.today}"></div>
      <div class="field"><label for="nK">Tipo</label><select id="nK" name="kind"><option value="mudanca">Preço / oferta</option><option value="criativo">Criativo</option><option value="conta">Conta / BM</option></select></div></div>
      <div class="field"><label for="nX">Detalhe (opcional)</label><input id="nX" name="detail"></div>`,
      ok: 'Anotar', onOk: async v => { await api('/notes', { body: v }); toast('Anotado'); viewDiag(); } });
  },
  async delNote(el) { await api('/notes/' + el.dataset.id, { method: 'DELETE' }); viewDiag(); },
  newProfile(el) {
    const cofre = el.dataset.role === 'cofre';
    sheet({ title: cofre ? 'Criar perfil cofre' : 'Novo perfil', body: `<div class="field"><label for="pN">Nome (só pra você reconhecer)</label><input id="pN" name="name" value="${cofre ? 'Perfil Mestre' : ''}"></div><div class="field"><label for="pR">Função</label><select id="pR" name="role"><option value="operador">Operador (anuncia)</option><option value="cofre" ${cofre ? 'selected' : ''}>Cofre (admin de tudo, não anuncia)</option></select></div>`,
      ok: 'Criar', onOk: async v => { await api('/profiles', { body: v }); go('contas'); } });
  },
  editProfile(el) {
    const p = ST_DATA.profiles.find(x => x.id === +el.dataset.id);
    sheet({ title: 'Perfil', body: `<div class="field"><label for="pN">Nome</label><input id="pN" name="name" value="${esc(p.name)}"></div>
      <div class="form-row"><div class="field"><label for="pS">Situação</label><select id="pS" name="status">${[['ativo', 'Ativo'], ['verificacao', 'Pediu verificação'], ['caiu', 'Caiu']].map(([k, l]) => `<option value="${k}" ${p.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label for="pU">Último uso</label><input id="pU" name="last_used_at" type="date" value="${p.last_used_at ? String(p.last_used_at).slice(0, 10) : ''}"></div></div>
      <div class="field"><label for="pO">Anotações</label><input id="pO" name="notes" value="${esc(p.notes || '')}"></div>
      <button class="btn sm danger" type="button" id="delP">${ic('trash')}Apagar perfil</button>`,
      ok: 'Salvar', onOk: async v => { await api('/profiles/' + p.id, { method: 'PATCH', body: v }); go('contas'); } });
    $('#delP').onclick = async () => { await api('/profiles/' + p.id, { method: 'DELETE' }); $('#sheet').hidden = true; go('contas'); };
  },
  editBm(el) {
    const b = ST_DATA.bms.find(x => x.id === +el.dataset.id);
    sheet({ title: esc(b.name), body: `${b.last_error ? `<p class="down">Último erro: ${esc(b.last_error)}</p>` : `<p>Última leitura ${ago(b.last_sync_at)}.</p>`}
      <div class="field"><label for="bN">Nome</label><input id="bN" name="name" value="${esc(b.name)}"></div>
      <div class="field"><label for="bP">Perfil que administra (onde você mexe)</label><select id="bP" name="profile_id"><option value="">Nenhum</option>${ST_DATA.profiles.filter(p => p.role !== 'cofre').map(p => `<option value="${p.id}" ${b.profile_id === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
      <button class="btn sm danger" type="button" id="delB">${ic('trash')}Remover BM do Argos</button>`,
      ok: 'Salvar', onOk: async v => { await api('/bms/' + b.id, { method: 'PATCH', body: { name: v.name, profile_id: v.profile_id ? +v.profile_id : null } }); go('contas'); } });
    $('#delB').onclick = async () => { await api('/bms/' + b.id, { method: 'DELETE' }); $('#sheet').hidden = true; go('contas'); };
  },
  editAcc(el) {
    const a = ST_DATA.accounts.find(x => x.id === el.dataset.id);
    sheet({ title: esc(a.name), body: `<p class="num">${esc(a.id)} · ${ACC_ST(a.account_status)[1]}${a.funding_label ? ' · Face: ' + esc(a.funding_label) : ''}</p>
      <div class="field"><label for="aC">Cartão (como você reconhece)</label><input id="aC" name="card_label" value="${esc(a.card_label || '')}" placeholder="Nubank •• 4821"></div>
      <div class="form-row"><div class="field"><label for="aD">Domínio usado</label><select id="aD" name="domain_id"><option value="">—</option>${ST_DATA.domains.map(d => `<option value="${d.id}" ${a.domain_id === d.id ? 'selected' : ''}>${esc(d.domain)}</option>`).join('')}</select></div>
      <div class="field"><label for="aR">Conta reserva</label><select id="aR" name="is_reserve"><option value="false">Não</option><option value="true" ${a.is_reserve ? 'selected' : ''}>Sim, pronta pra usar</option></select></div></div>
      <div class="field"><label for="aN">Anotações</label><input id="aN" name="notes" value="${esc(a.notes || '')}"></div>`,
      ok: 'Salvar', onOk: async v => { await api('/accounts/' + encodeURIComponent(a.id), { method: 'PATCH', body: { card_label: v.card_label, domain_id: v.domain_id ? +v.domain_id : null, is_reserve: v.is_reserve === 'true', notes: v.notes } }); go('contas'); } });
  },
  async fall() {
    const down = ST_DATA.accounts.filter(a => a.account_status !== 1);
    const opts = (down.length ? down : ST_DATA.accounts);
    sheet({ title: 'Qual conta caiu?', body: `<div class="field"><label for="fA">Conta</label><select id="fA" name="acc">${opts.map(a => `<option value="${esc(a.id)}">${esc(a.name)} · ${ACC_ST(a.account_status)[1]}</option>`).join('')}</select></div>`,
      ok: 'Ver pra onde vai o orçamento', onOk: async v => {
        const r = await api('/redistribute/' + encodeURIComponent(v.acc));
        setTimeout(() => sheet({ title: `${esc(r.account.name)} caiu. Pra onde vão os ${brl(r.budget)}/dia?`, noOk: true,
          body: r.plan.length ? `<p>Sugestão do Argos, priorizando reservas e contas com ROI bom e folga no limite:</p><div class="rows">${r.plan.map(p => `<div class="row"><div class="ico-box ib-${p.reserve ? 'info' : 'good'}">${ic(p.reserve ? 'lock' : 'trend')}</div><div><div class="t num">${esc(p.name)} +${brl(p.add)}/dia</div><div class="d">${p.reserve ? 'Conta reserva: ligar com uma campanha campeã' : 'ROI real 7 dias ' + f2(p.roi)}</div></div></div>`).join('')}</div>${r.uncovered ? `<p class="w">${brl(r.uncovered)}/dia ficam sem lugar: falta conta reserva.</p>` : ''}<p class="faint" style="font-size:12px">Aplique pelas campanhas de cada conta (aba Campanhas).</p>` : '<p>Nenhuma conta com folga e ROI bom agora. Ative uma conta reserva.</p>' }), 50);
      } });
  },
  newDomain() { sheet({ title: 'Adicionar domínio', body: `<div class="field"><label for="dD">Domínio</label><input id="dD" name="domain" placeholder="seusite.com.br"></div><div class="field"><label for="dS">Situação</label><select id="dS" name="status"><option value="ok">Em uso</option><option value="reserva">Reserva pronta</option><option value="marcado">Marcado pelo Face</option></select></div>`, ok: 'Adicionar', onOk: async v => { await api('/domains', { body: v }); go('contas'); } }); },
  editDomain(el) {
    const d = ST_DATA.domains.find(x => x.id === +el.dataset.id);
    sheet({ title: esc(d.domain), body: `<div class="field"><label for="dS">Situação</label><select id="dS" name="status">${[['ok', 'Em uso'], ['reserva', 'Reserva pronta'], ['marcado', 'Marcado pelo Face']].map(([k, l]) => `<option value="${k}" ${d.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div><button class="btn sm danger" type="button" id="delD">${ic('trash')}Remover</button>`,
      ok: 'Salvar', onOk: async v => { await api('/domains/' + d.id, { method: 'PATCH', body: v }); go('contas'); } });
    $('#delD').onclick = async () => { await api('/domains/' + d.id, { method: 'DELETE' }); $('#sheet').hidden = true; go('contas'); };
  },
  async ruleOn(el) { await api('/rules/' + el.dataset.id, { method: 'PATCH', body: { enabled: el.getAttribute('aria-checked') !== 'true' } }); viewRegras(); },
  async ruleMode(el) { await api('/rules/' + el.dataset.id, { method: 'PATCH', body: { mode: el.dataset.v } }); viewRegras(); },
  async ruleEdit(el) {
    const { rules } = await api('/rules');
    const r = rules.find(x => x.id === +el.dataset.id);
    const fields = RULE_FIELDS[r.kind] || [];
    sheet({ title: esc(r.name), body: `<div class="field"><label for="rN">Nome</label><input id="rN" name="__name" value="${esc(r.name)}"></div><div class="form-row">${fields.map(([k, l, st]) => `<div class="field"><label for="rf${k}">${l}</label><input id="rf${k}" name="${k}" type="number" step="${st}" value="${(r.params || {})[k] ?? ''}"></div>`).join('')}</div>`,
      ok: 'Salvar', onOk: async v => { const params = {}; fields.forEach(([k]) => { if (v[k] !== '') params[k] = Number(v[k]); }); await api('/rules/' + r.id, { method: 'PATCH', body: { name: v.__name, params } }); viewRegras(); } });
  },
  async approve(el) { el.disabled = true; try { await api(`/actions/${el.dataset.id}/approve`, { body: {} }); toast('Feito no Face'); } catch (e) { toast(e.message, true); } reload(); },
  async ignore(el) { await api(`/actions/${el.dataset.id}/ignore`, { body: {} }); toast('Ignorado'); reload(); },
  async undo(el) { el.disabled = true; try { await api(`/actions/${el.dataset.id}/undo`, { body: {} }); toast('Desfeito'); } catch (e) { toast(e.message, true); } reload(); },
  async pauseAll() { const g = (await api('/rules')).guards; await api('/settings/guards', { method: 'PATCH', body: { paused_all: !g.paused_all } }); toast(g.paused_all ? 'Regras retomadas' : 'Regras pausadas'); viewRegras(); },
  openRep(el) { repId = +el.dataset.id; viewRel(); },
  todo(el) { const k = 'radar-todo-' + el.dataset.rep; const s = new Set(JSON.parse(store.get(k) || '[]')); const i = +el.dataset.i; s.has(i) ? s.delete(i) : s.add(i); store.set(k, JSON.stringify([...s])); const on = s.has(i); el.setAttribute('aria-checked', on); el.innerHTML = on ? ic('check') : ''; },
  connectBm() { connectBmSheet(); },
  async copyUtm() { const t = $('#utmCode').textContent; try { await navigator.clipboard.writeText(t); toast('Copiado'); } catch (e) { const r = document.createRange(); r.selectNodeContents($('#utmCode')); getSelection().removeAllRanges(); getSelection().addRange(r); toast('Selecionado: copie com Ctrl+C'); } },
  async saveAndro() { await api('/settings/andromeda', { method: 'PATCH', body: { url: $('#anUrl').value.trim(), secret: $('#anSec').value.trim(), enabled: $('#anOn').getAttribute('aria-checked') === 'true' } }); toast('Andrômeda salvo'); viewInt(); },
  async testAndro() { const r = await api('/andromeda/test', { body: {} }); toast(r.skipped ? 'Ligue e salve o Andrômeda primeiro' : r.ok ? `Enviado: ${brl(r.total, 2)}` : 'Falhou: ' + (r.error || r.code), !r.ok); viewInt(); },
  async enablePush() { try { await enablePush(); } catch (e) { toast(e.message, true); } reload(); },
  async testPush() { const r = await api('/push/test', { body: {} }); toast(r.sent ? `Enviado pra ${r.sent} aparelho(s)` : 'Nenhum aparelho com notificação ativa', !r.sent); },
  async notifTog(el) { const on = el.getAttribute('aria-checked') !== 'true'; await api('/settings/notify', { method: 'PATCH', body: { [el.dataset.k]: on } }); el.setAttribute('aria-checked', on); },
  async saveHours() { const h = $('#roiHours').value.split(/[,;\s]+/).map(Number).filter(x => x >= 0 && x <= 23); await api('/settings/notify', { method: 'PATCH', body: { roi_hours: h } }); toast('Horários salvos'); viewInt(); },
  async saveTargets() {
    await api('/settings/targets', { method: 'PATCH', body: { roi_goal: +$('#tgRoi').value, daily_budget_goal: +$('#tgBud').value, cpa_target: +$('#tgCpa').value, tax_pct: +$('#tgTax').value, max_account_share: +$('#tgShare').value } });
    await api('/settings/collect', { method: 'PATCH', body: { light_min: Math.max(5, +$('#tgInt').value) } });
    ME = await api('/me'); toast('Metas salvas');
  },
  async guardTog(el) {
    const k = el.dataset.k, on = el.getAttribute('aria-checked') !== 'true';
    const doIt = async () => { await api('/settings/guards', { method: 'PATCH', body: { [k]: on } }); ME = await api('/me'); el.setAttribute('aria-checked', on); toast(on ? 'Ligado' : 'Desligado'); };
    if (on && k === 'edit_enabled') return sheet({ title: 'Liberar a edição pelo Argos?', body: '<p>A partir de agora, aprovações e os botões de ligar/desligar e orçamento mexem nas campanhas de verdade no Face. Tudo fica no histórico com Desfazer.</p>', ok: 'Liberar edição', onOk: doIt });
    if (on && k === 'auto_enabled') return sheet({ title: 'Permitir o modo automático?', body: '<p>Regras no modo Automático vão agir sem pedir aprovação, respeitando as travas. Você escolhe regra por regra na aba Regras.</p>', ok: 'Permitir', onOk: doIt });
    await doIt();
  },
  async saveGuards() { await api('/settings/guards', { method: 'PATCH', body: { max_change_pct: +$('#gdPct').value, max_campaign_budget: +$('#gdCamp').value } }); toast('Travas salvas'); },
  clearDemo() { sheet({ title: 'Apagar a demonstração?', body: '<p>Apaga todos os dados simulados (contas, campanhas, números, relatório de exemplo). Suas metas e configurações ficam.</p>', ok: 'Apagar', danger: true, onOk: async () => { await api('/demo/clear', { body: {} }); toast('Demonstração apagada'); go('int'); } }); },
  mob(el) { mob(el.dataset.v); },
  full() { store.set('radar-full', '1'); render(); },
  mobileMode() { store.set('radar-full', '0'); render(); },
  fullRel() { store.set('radar-full', '1'); view = 'rel'; render(); }
};
const RENDER = { geral: viewGeral, metas: viewMetas, diag: viewDiag, camp: viewCamp, cre: viewCre, escala: viewEscala, contas: viewContas, regras: viewRegras, rel: viewRel, int: viewInt };

document.addEventListener('click', e => {
  if (dpOpen && !e.target.closest('.dp')) { dpOpen = false; drawDp(); }
  const g = e.target.closest('[data-go]');
  if (g) { e.preventDefault(); if (isMobile()) { store.set('radar-full', '1'); view = g.dataset.go; return render(); } return go(g.dataset.go); }
  const a = e.target.closest('[data-act]');
  if (a && ACT[a.dataset.act]) {
    e.preventDefault();
    Promise.resolve(ACT[a.dataset.act](a)).catch(err => { if (err.message !== 'Faça login') toast(err.message, true); });
  }
});

// filtro de BM: vale pra todas as telas
document.addEventListener('change', e => {
  const sel = e.target.closest && e.target.closest('[data-bmsel]');
  if (!sel) return;
  bmSel = sel.value; store.set('radar-bm', bmSel);
  go(view);
});

// contingência: arrastar a BM até o perfil que administra
let dragBm = null;
document.addEventListener('dragstart', e => { const b = e.target.closest && e.target.closest('[data-bm]'); if (!b) return; dragBm = b.dataset.bm; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragBm); } catch (_) {} b.classList.add('dragging'); });
document.addEventListener('dragend', () => { dragBm = null; $$('.dragging,.prof.drop').forEach(x => x.classList.remove('dragging', 'drop')); });
document.addEventListener('dragover', e => { const z = dragBm && e.target.closest('[data-drop]'); if (!z) return; e.preventDefault(); $$('.prof.drop').forEach(x => x !== z && x.classList.remove('drop')); z.classList.add('drop'); });
document.addEventListener('drop', async e => {
  const z = dragBm && e.target.closest('[data-drop]'); if (!z) return;
  e.preventDefault();
  const id = +dragBm, pid = z.dataset.drop ? +z.dataset.drop : null;
  const b = ST_DATA && ST_DATA.bms.find(x => x.id === id);
  if (!b || (b.profile_id || null) === pid) return;
  try { await api('/bms/' + id, { method: 'PATCH', body: { name: b.name, profile_id: pid } }); toast(`${b.name} agora está com ${pid ? ST_DATA.profiles.find(p => p.id === pid).name : 'nenhum perfil'}`); go('contas'); }
  catch (err) { toast(err.message, true); }
});

// atualiza a tela de hoje sozinha a cada 2 minutos
setInterval(() => {
  if (document.hidden || !ME || !$('#sheet').hidden) return;
  if (isMobile() && mobTab === 'hoje') mob('hoje');
  else if (!isMobile() && view === 'geral' && ov.k === 'today' && !dpOpen) viewGeral().catch(() => {});
}, 120000);

boot();
})();
