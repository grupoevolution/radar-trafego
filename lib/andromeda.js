// lib/andromeda.js — manda pro Andrômeda SÓ o gasto total do dia
//
// POST <url>  com cabeçalho  X-Radar-Secret: <segredo>
// corpo: { "dia": "2026-10-19", "gasto_total": 2410.22, "atualizado_em": "2026-10-19T21:30:00-03:00", "fechado": false }
// Sempre o TOTAL do dia (nunca a diferença): se um envio falhar, o próximo corrige.
const db = require('../db');
const settings = require('./settings');

async function totalSpend(day) {
  const { rows } = await db.query(`SELECT COALESCE(SUM(spend), 0)::float AS t FROM fb_daily WHERE level = 'account' AND day = $1`, [day]);
  return Math.round(rows[0].t * 100) / 100;
}

function isoBrt(d = new Date()) {
  const s = d.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
  return s + '-03:00';
}

async function sendDay(day, closing) {
  const cfg = await settings.get('andromeda');
  const total = await totalSpend(day);
  if (!cfg || !cfg.enabled || !cfg.url) return { skipped: true, total };
  const body = { dia: day, gasto_total: total, atualizado_em: isoBrt(), fechado: !!closing };
  let ok = false, code = null, error = null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Radar-Secret': cfg.secret || '' },
      body: JSON.stringify(body), signal: ctrl.signal
    });
    clearTimeout(t);
    code = res.status; ok = res.ok;
    if (!ok) error = (await res.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
  } catch (err) { error = err.message; }
  await db.query('INSERT INTO andromeda_log (day, total, closing, ok, status_code, error) VALUES ($1,$2,$3,$4,$5,$6)', [day, total, !!closing, ok, code, error]);
  return { ok, total, code, error };
}

module.exports = { sendDay, totalSpend };
