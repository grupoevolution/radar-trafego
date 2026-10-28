// lib/appwatch.js — VIGIA DA ÁREA DE MEMBROS (out/2026)
//
// Depois do travamento de 27/10 (app lento no pico e ninguém percebeu), o Argos
// passou a vigiar o app e mandar notificação no celular do dono:
//   1. A cada minuto testa o app DE FORA (como um lead): /health e a lista leve
//      de conversas. 2 falhas/lentidões seguidas → "App fora do ar / lento".
//      Voltou → "App normalizado".
//   2. Lê os avisos que o próprio app grava (tabela ops_alerts — o app se mede
//      por dentro: fila do banco, tempo das rotas) pela conexão SÓ LEITURA e
//      repassa cada aviso novo como notificação.
// Categoria da notificação: 'app_health' (liga/desliga em Notificações).
const appdb = require('../appdb');
const notify = require('./notify');
const settings = require('./settings');

const APP_URL = (process.env.APP_PUBLIC_URL || 'https://m.membrosvips.com').replace(/\/+$/, '');
const SLOW_MS = 8000;      // pedido do lado de fora acima disso conta como "lento"
const TIMEOUT_MS = 15000;  // sem resposta em 15s = fora do ar

let badStreak = 0, goodStreak = 0, down = false, downSince = 0, lastReason = '';

async function probe(path) {
  const t = Date.now();
  try {
    const r = await fetch(APP_URL + path, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 12) ArgosWatch/1.0' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    await r.text();
    return { ok: r.ok, ms: Date.now() - t, status: r.status };
  } catch (err) {
    return { ok: false, ms: Date.now() - t, status: 0, err: err.name === 'TimeoutError' ? 'sem resposta em 15s' : 'não respondeu' };
  }
}

async function checkOutside() {
  const h = await probe('/health');
  const c = h.ok ? await probe('/api/user/chats?light=1&visitor_id=argoswatch') : null;
  let reason = '';
  if (!h.ok) reason = h.status ? `site respondeu erro ${h.status}` : `site ${h.err || 'não respondeu'}`;
  else if (!c.ok) reason = c.status ? `conversas com erro ${c.status}` : `conversas ${c.err || 'não responderam'}`;
  else if (h.ms > SLOW_MS || c.ms > SLOW_MS) reason = `app lento: conversas levando ${(c.ms / 1000).toFixed(1)}s`;

  if (reason) { badStreak++; goodStreak = 0; lastReason = reason; } else { goodStreak++; badStreak = 0; }
  if (!down && badStreak >= 2) {
    down = true; downSince = Date.now();
    await notify.alert({ kind: 'app_down', severity: 'bad', title: '⚠️ Área de membros com problema',
      detail: reason + ' (testado de fora agora)', dedupe: `appdown-${downSince}`, push: 'app_health' });
  } else if (down && goodStreak >= 3) {
    down = false;
    const mins = Math.max(1, Math.round((Date.now() - downSince) / 60000));
    await notify.alert({ kind: 'app_down', severity: 'info', title: '✅ Área de membros normalizada',
      detail: `Respondendo rápido de novo (problema durou ${mins} min: ${lastReason}).`, dedupe: `appup-${Date.now()}`, push: 'app_health' });
  }
}

async function checkInside() {
  if (!appdb.enabled()) return;
  let st = (await settings.get('appwatch')) || {};
  let rows;
  try {
    if (st.last_id == null) {
      // 1ª vez: começa do último aviso existente (não despeja o histórico)
      const { rows: m } = await appdb.read(`SELECT COALESCE(MAX(id), 0)::int AS id FROM ops_alerts`);
      await settings.set('appwatch', { ...st, last_id: m[0].id });
      return;
    }
    ({ rows } = await appdb.read(
      `SELECT id, kind, title, body FROM ops_alerts WHERE id > $1 ORDER BY id LIMIT 10`, [st.last_id]));
  } catch (err) {
    // tabela ainda não existe (app sem o deploy do alarme) → tenta de novo depois
    return;
  }
  for (const a of rows) {
    await notify.alert({ kind: 'app_slow', severity: a.kind === 'ok' ? 'info' : 'bad',
      title: a.title || 'Aviso da área de membros', detail: a.body || '', dedupe: `opsalert-${a.id}`, push: 'app_health' });
    st = { ...st, last_id: a.id };
  }
  if (rows.length) await settings.set('appwatch', st);
}

async function tick() {
  try { await checkOutside(); } catch (err) { console.error('[appwatch] fora:', err.message); }
  try { await checkInside(); } catch (err) { console.error('[appwatch] dentro:', err.message); }
}

function start() {
  setTimeout(tick, 20000);
  setInterval(tick, 60000);
  console.log(`[appwatch] vigiando ${APP_URL} a cada 1 min`);
}

const status = () => ({ url: APP_URL, down, badStreak, goodStreak, lastReason });

module.exports = { start, status, _tick: tick };
