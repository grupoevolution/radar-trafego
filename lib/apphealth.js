// lib/apphealth.js — SAÚDE DO APP (nov/2026): junta, hora a hora, o que o app de membros gravou
// (alarmes em ops_alerts, raio-x de cada minuto em ops_minutes) com as vendas e o teste de fora
// (app_probe). Responde duas perguntas: o que causou cada alarme? a venda caiu porque o app travou?
// Lê o banco do app só pela conexão de leitura (appdb); se a tabela não existir, fica sem o dado.
const appdb = require('../appdb');
const db = require('../db');
const T = require('./time');

const TZ = 'America/Sao_Paulo';
const START = `($1::date::timestamp AT TIME ZONE '${TZ}')`;
const END = `(($1::date + 1)::timestamp AT TIME ZONE '${TZ}')`;
const LOW_SALES = 0.6;     // hora com menos de 60% da média das mesmas horas = venda fraca
const MIN_AVG_SALES = 2;   // abaixo disso a média é pequena demais pra comparar
const OLD_SPREAD_MIN = 15; // alarmes de antes do raio-x: a rotina levava ~12 min pra sair

const n = v => Number(v) || 0;
const secs = ms => (n(ms) / 1000).toFixed(1).replace('.', ',') + 's';
const num = v => Math.round(n(v)).toLocaleString('pt-BR');

async function appRead(sql, params) {
  if (!appdb.enabled()) return null;
  try { return (await appdb.read(sql, params)).rows; }
  catch (err) { console.warn('[apphealth]', err.message.slice(0, 160)); return null; }
}

const brTime = iso => new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const minuteOfDay = iso => { const [h, m] = brTime(iso).split(':').map(Number); return h * 60 + m; };

// Causas prováveis de um alarme, olhando os 10 minutos anteriores a ele
function causesOf(alert, slots) {
  const st = alert.stats || {};
  const u = Array.isArray(st.ultimos_min) ? st.ultimos_min : [];
  const out = [];
  if (!u.length) return [{ tone: 'info', text: 'Alarme de antes do raio-x: não há detalhes gravados.' }];

  const hasPushData = u.some(m => m.pushes !== undefined);
  const pushes = u.reduce((s, m) => s + n(m.pushes), 0);
  const at = minuteOfDay(alert.created_at);
  const slot = (slots || []).find(s => { const [h, m] = String(s.send_time).split(':').map(Number); const d = at - (h * 60 + m); return d >= 0 && d <= OLD_SPREAD_MIN; });
  if (pushes > 0) out.push({ tone: 'warn', text: `Notificação em massa saindo: ${num(pushes)} enviadas nestes 10 minutos.` });
  else if (!hasPushData && slot) out.push({ tone: 'warn', text: `Logo depois da notificação das ${String(slot.send_time).slice(0, 5)}: muita gente abrindo o app junto.` });

  const base = u.slice(0, 3).reduce((s, m) => s + n(m.reqs), 0) / Math.max(1, Math.min(3, u.length));
  const peak = Math.max(...u.slice(-3).map(m => n(m.reqs)));
  if (base > 0 && peak / base >= 1.25) {
    out.push({ tone: out.length ? 'info' : 'warn', text: `Mais acesso de repente: de ${num(base)} para ${num(peak)} pedidos por minuto (+${Math.round((peak / base - 1) * 100)}%).${out.length ? '' : ' Sem notificação em massa nessa hora.'}` });
  }

  const admins = u.flatMap(m => m.admin || []);
  const heavy = admins.filter(a => n(a.media_ms) * n(a.pedidos) >= 5000 || n(a.max_ms) >= 5000).sort((a, b) => n(b.max_ms) - n(a.max_ms))[0];
  if (heavy) out.push({ tone: 'warn', text: `Painel em uso pesando no banco: ${heavy.rota.replace('/api/admin', '')} (até ${secs(heavy.max_ms)}).` });

  const dbs = u.map(m => m.db).filter(Boolean);
  const long = dbs.flatMap(d => d.longest || []).filter(q => n(q.ms) >= 2000 && q.sql).sort((a, b) => n(b.ms) - n(a.ms))[0];
  if (long) out.push({ tone: 'bad', text: `Consulta demorada travando o banco (${secs(long.ms)}): ${long.sql.slice(0, 110)}` });
  const locks = dbs.flatMap(d => d.longest || []).filter(q => q.wait === 'Lock').length;
  if (locks >= 3) out.push({ tone: 'bad', text: `${locks} consultas esperando umas pelas outras no banco (trava de registro).` });

  const load = Math.max(...u.map(m => n(m.load1)));
  const cpus = n((u.find(m => m.cpus) || {}).cpus);
  if (cpus && load >= cpus) out.push({ tone: 'bad', text: `Máquina sobrecarregada (carga ${String(load).replace('.', ',')} em ${cpus} processadores). Pode ser outro sistema da mesma VPS.` });
  const lag = Math.max(...u.map(m => n(m.loop_lag)));
  if (lag >= 1000) out.push({ tone: 'warn', text: `Servidor do app ocupado: atraso de ${secs(lag)} para atender.` });

  if (!out.length) out.push({ tone: 'info', text: 'Sem causa clara nos dados deste alarme.' });
  return out;
}

function incidents(alerts, slots) {
  const res = [];
  alerts.forEach((a, i) => {
    if (a.kind !== 'slow') return;
    const end = alerts.slice(i + 1).find(x => x.kind === 'ok');
    const st = a.stats || {};
    const u = Array.isArray(st.ultimos_min) ? st.ultimos_min : [];
    res.push({
      id: a.id, at: a.created_at, time: brTime(a.created_at), body: a.body || '',
      mins: end ? Math.max(1, Math.round((new Date(end.created_at) - new Date(a.created_at)) / 60000)) : null,
      causes: causesOf(a, slots),
      queue_max: Math.max(0, ...u.map(m => n(m.pool_waiting))),
      p90_max: Math.max(0, ...u.map(m => n(m.p90))),
      errors: u.reduce((s, m) => s + n(m.errors), 0),
      minutes: u.map(m => ({ time: brTime(m.at), reqs: n(m.reqs), p90: n(m.p90), queue: n(m.pool_waiting), pushes: m.pushes === undefined ? null : n(m.pushes), errors: n(m.errors) })),
      top: (st.top || []).slice(0, 5),
      admin: (u.flatMap(m => m.admin || []).sort((x, y) => n(y.max_ms) - n(x.max_ms))).slice(0, 3),
      running: (u.map(m => m.db).filter(Boolean).pop() || st.db || {}).longest || []
    });
  });
  return res;
}

async function dayReport(day) {
  const [alerts, minutes, slots] = await Promise.all([
    appRead(`SELECT id, kind, title, body, stats, created_at FROM ops_alerts WHERE created_at >= ${START} AND created_at < ${END} ORDER BY id`, [day]),
    appRead(`SELECT EXTRACT(HOUR FROM at AT TIME ZONE '${TZ}')::int AS h, reqs, p90, chats_avg, errors, pool_waiting, loop_lag, load1, pushes
             FROM ops_minutes WHERE at >= ${START} AND at < ${END}`, [day]),
    appRead(`SELECT send_time FROM engagement_push_slots WHERE active = true`)
  ]);
  const week = T.addDays(day, -7), prev = T.addDays(day, -1);
  const [{ rows: today }, { rows: avg }, { rows: spend }, { rows: probes }] = await Promise.all([
    db.query('SELECT hour, visitors, checkout, pix, sales, revenue FROM app_hourly WHERE day = $1', [day]),
    db.query(`SELECT hour, SUM(visitors)::float v, SUM(pix)::float p, SUM(sales)::float s, COUNT(DISTINCT day)::int d FROM app_hourly WHERE day BETWEEN $1 AND $2 GROUP BY hour`, [week, prev]),
    db.query('SELECT hour, SUM(spend)::float spend FROM fb_hourly WHERE day = $1 GROUP BY hour', [day]),
    db.query(`SELECT EXTRACT(HOUR FROM at AT TIME ZONE '${TZ}')::int AS h, COUNT(*)::int n, MAX(ms)::int max_ms, ROUND(AVG(ms))::int avg_ms, COUNT(*) FILTER (WHERE NOT ok)::int fails
              FROM app_probe WHERE at >= ${START} AND at < ${END} GROUP BY 1`, [day])
  ]);
  const by = (rows, k) => Object.fromEntries((rows || []).map(r => [r[k], r]));
  const T0 = by(today, 'hour'), A = by(avg, 'hour'), S = by(spend, 'hour'), P = by(probes, 'h');
  const M = {};
  for (const m of minutes || []) {
    const x = M[m.h] || (M[m.h] = { minutes: 0, reqs_peak: 0, p90_max: 0, queue_max: 0, errors: 0, pushes: 0, bad_minutes: 0 });
    x.minutes++; x.reqs_peak = Math.max(x.reqs_peak, m.reqs); x.p90_max = Math.max(x.p90_max, m.p90); x.queue_max = Math.max(x.queue_max, m.pool_waiting);
    x.errors += m.errors; x.pushes += m.pushes;
    if (m.pool_waiting > 12 || m.p90 > 2500 || m.errors > 30 || m.loop_lag > 1500) x.bad_minutes++;
  }
  const incs = incidents(alerts || [], slots || []);
  const now = T.parts();
  const lastHour = day === now.day ? now.hour : day < now.day ? 23 : -1;
  const hours = [];
  for (let h = 0; h <= lastHour; h++) {
    const t = T0[h] || {}, a = A[h] || {}, days = n(a.d) || 1, m = M[h] || null, p = P[h] || null;
    const avg_sales = n(a.s) / days;
    const alarms = incs.filter(i => minuteOfDay(i.at) >= h * 60 && minuteOfDay(i.at) < (h + 1) * 60).length;
    const app = !m && !p && !alarms ? 'sem_dado' : (alarms || (m && m.bad_minutes >= 2) || (p && p.fails >= 2)) ? 'ruim' : (m && m.bad_minutes) || (p && p.max_ms >= 8000) ? 'atencao' : 'ok';
    hours.push({
      hour: h, visitors: n(t.visitors), pix: n(t.pix), sales: n(t.sales), revenue: n(t.revenue), spend: n((S[h] || {}).spend),
      avg_visitors: n(a.v) / days, avg_pix: n(a.p) / days, avg_sales,
      low_sales: h < lastHour && avg_sales >= MIN_AVG_SALES && n(t.sales) < avg_sales * LOW_SALES,
      app, alarms, ...(m || {}), probe_avg_ms: p ? p.avg_ms : null, probe_max_ms: p ? p.max_ms : null, probe_fails: p ? p.fails : 0
    });
  }
  // blocos de horas seguidas com venda fraca, dizendo se o app estava mal nesse período
  const slumps = [];
  for (const x of hours) {
    if (!x.low_sales) continue;
    const last = slumps[slumps.length - 1];
    if (last && last.to === x.hour - 1) { last.to = x.hour; last.sales += x.sales; last.avg += x.avg_sales; last.app_bad = last.app_bad || x.app === 'ruim'; last.has_data = last.has_data || x.app !== 'sem_dado'; }
    else slumps.push({ from: x.hour, to: x.hour, sales: x.sales, avg: x.avg_sales, app_bad: x.app === 'ruim', has_data: x.app !== 'sem_dado' });
  }
  const closed = hours.slice(0, Math.max(0, day === now.day ? lastHour : 24));
  return {
    day, is_today: day === now.day,
    raio_x_ready: minutes !== null && minutes.length > 0,
    app_connected: appdb.enabled(),
    summary: {
      alarms: incs.length,
      slow_minutes: incs.reduce((s, i) => s + n(i.mins), 0),
      queue_max: Math.max(0, ...incs.map(i => i.queue_max), ...Object.values(M).map(x => x.queue_max)),
      probe_max_ms: Math.max(0, ...Object.values(P).map(x => n(x.max_ms))),
      probe_fails: Object.values(P).reduce((s, x) => s + n(x.fails), 0),
      sales: closed.reduce((s, x) => s + x.sales, 0),
      avg_sales: closed.reduce((s, x) => s + x.avg_sales, 0)
    },
    incidents: incs, hours, slumps
  };
}

module.exports = { dayReport };
