// lib/notify.js — alertas (lista no painel) + notificação no celular (Web Push)
const webpush = require('web-push');
const db = require('../db');
const settings = require('./settings');
const T = require('./time');

let vapid = null;
async function initVapid() {
  let pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    const saved = await settings.get('vapid');
    if (saved && saved.publicKey) { pub = saved.publicKey; priv = saved.privateKey; }
    else {
      const k = webpush.generateVAPIDKeys();
      await settings.set('vapid', k);
      pub = k.publicKey; priv = k.privateKey;
    }
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', pub, priv);
  vapid = { publicKey: pub };
}
const publicKey = () => vapid && vapid.publicKey;

// category: chave de settings.notify (roi_day, account_down, approval, spend_no_sale, fatigue, report)
async function push(category, title, body, url = '/') {
  const cfg = await settings.get('notify');
  if (category && cfg && cfg[category] === false) return 0;
  const { rows } = await db.query('SELECT endpoint, keys FROM push_subs');
  let sent = 0;
  for (const s of rows) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify({ title, body, url }), { TTL: 3600 });
      sent++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) await db.query('DELETE FROM push_subs WHERE endpoint = $1', [s.endpoint]);
    }
  }
  return sent;
}

// grava alerta (sem repetir pelo dedupe) e, se pedido, manda push
async function alert({ kind, severity = 'warn', title, detail, ref, dedupe, push: cat }) {
  const { rows } = await db.query(
    `INSERT INTO alerts (kind, severity, title, detail, ref, dedupe_key) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING RETURNING id`,
    [kind, severity, title, detail, ref, dedupe || null]);
  if (rows.length && cat) await push(cat, title, detail || '', '/#alertas');
  return rows.length > 0;
}

// "ROI do dia está em X" nos horários escolhidos (padrão 12h, 18h e 22h)
async function roiCheckpoint() {
  const cfg = await settings.get('notify');
  if (!cfg || cfg.roi_day === false) return;
  const { hour } = T.parts();
  const hours = Array.isArray(cfg.roi_hours) ? cfg.roi_hours : [];
  if (!hours.includes(hour)) return;
  const day = T.today();
  const key = `roi-${day}-${hour}`;
  const { rows } = await db.query(
    `SELECT (SELECT COALESCE(SUM(spend),0) FROM fb_daily WHERE level='account' AND day=$1)::float AS spend,
            (SELECT COALESCE(revenue,0) FROM app_daily WHERE day=$1)::float AS revenue,
            (SELECT COALESCE(sales,0) FROM app_daily WHERE day=$1)::int AS sales`, [day]);
  const r = rows[0];
  if (!r.spend) return;
  const tax = (await settings.get('targets')).tax_pct / 100;
  const roi = r.revenue / r.spend;
  const profit = r.revenue - r.spend - r.spend * tax;
  const brl = v => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  const created = await db.query(
    `INSERT INTO alerts (kind, severity, title, detail, dedupe_key) VALUES ('roi_day', $1, $2, $3, $4)
     ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING RETURNING id`,
    [roi >= 1.6 ? 'good' : roi >= 1.2 ? 'warn' : 'bad', `ROI do dia às ${hour}h: ${roi.toFixed(2).replace('.', ',')}`,
     `${brl(r.spend)} gastos · ${r.sales} vendas · lucro ${brl(profit)}`, key]);
  if (created.rows.length) await push('roi_day', `ROI do dia às ${hour}h: ${roi.toFixed(2).replace('.', ',')}`, `${brl(r.spend)} gastos · ${r.sales} vendas · lucro ${brl(profit)}`, '/');
}

module.exports = { initVapid, publicKey, push, alert, roiCheckpoint };
