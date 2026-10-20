// lib/collector.js — o "relógio" do Radar
//
//   a cada 30 min (configurável): lê o Face (todas as BMs) + o app → guarda →
//     manda o gasto total pro Andrômeda → roda as regras
//   00:05: fecha o dia anterior (números finais) e manda o fechamento
//   04:00: confere o dia anterior de novo (o Face ainda ajusta de madrugada)
const db = require('../db');
const T = require('./time');
const settings = require('./settings');
const meta = require('./meta');
const appdb = require('../appdb');
const appdata = require('./appdata');
const { decrypt } = require('./crypto');
const andromeda = require('./andromeda');
const rules = require('./rules');
const notify = require('./notify');

const DEMO = () => process.env.DEMO_MODE === '1';
let running = false;
let lastRun = 0;

async function log(kind, ok, detail, ms) {
  await db.query('INSERT INTO sync_log (kind, ok, detail, ms) VALUES ($1,$2,$3,$4)', [kind, ok, String(detail || '').slice(0, 1000), ms]).catch(() => {});
}

// ── estrutura (contas, campanhas, conjuntos, anúncios) ──────────────────
async function upsertAccount(acc, bmId) {
  const prev = await db.query('SELECT account_status FROM ad_accounts WHERE id = $1', [acc.id]);
  await db.query(
    `INSERT INTO ad_accounts (id, bm_id, name, account_status, disable_reason, currency, timezone_name, spend_cap, amount_spent, funding_label, last_sync_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
     ON CONFLICT (id) DO UPDATE SET bm_id = COALESCE(ad_accounts.bm_id, $2), name=$3, account_status=$4, disable_reason=$5, currency=$6,
       timezone_name=$7, spend_cap=$8, amount_spent=$9, funding_label=COALESCE($10, ad_accounts.funding_label), last_sync_at=NOW(),
       status_changed_at = CASE WHEN ad_accounts.account_status IS DISTINCT FROM $4 THEN NOW() ELSE ad_accounts.status_changed_at END`,
    [acc.id, bmId, acc.name, acc.account_status, acc.disable_reason, acc.currency, acc.timezone_name, acc.spend_cap, acc.amount_spent, acc.funding_label]);
  const before = prev.rows[0] && prev.rows[0].account_status;
  if (before === 1 && acc.account_status !== 1) await accountDown(acc);
}

async function accountDown(acc) {
  const { rows } = await db.query(
    `SELECT COALESCE(SUM(c.daily_budget), 0) + COALESCE((SELECT SUM(s.daily_budget) FROM adsets s JOIN campaigns c2 ON c2.id = s.campaign_id
        WHERE s.account_id = $1 AND c2.status = 'ACTIVE' AND s.status = 'ACTIVE'), 0) AS budget, b.name AS bm
     FROM ad_accounts a LEFT JOIN bms b ON b.id = a.bm_id LEFT JOIN campaigns c ON c.account_id = a.id AND c.status = 'ACTIVE'
     WHERE a.id = $1 GROUP BY b.name`, [acc.id]);
  const r = rows[0] || {};
  const title = `${acc.name} ${acc.account_status === 2 ? 'foi desativada' : 'saiu do ar'}`;
  const detail = `${r.bm || 'BM'} · ficaram R$ ${Math.round(r.budget || 0)}/dia sem conta`;
  await notify.alert({ kind: 'account_down', severity: 'bad', title, detail, ref: acc.id, dedupe: `down-${acc.id}-${T.today()}`, push: 'account_down' });
  await db.query('INSERT INTO notes (day, title, detail, kind) VALUES ($1,$2,$3,$4)', [T.today(), title, 'Detectado automaticamente pelo Radar', 'conta']);
}

async function syncStructure(token, accId) {
  const [cs, ss, as] = await Promise.all([meta.campaigns(token, accId), meta.adsets(token, accId), meta.ads(token, accId)]);
  await db.transaction(async c => {
    for (const x of cs) {
      await c.query(
        `INSERT INTO campaigns (id, account_id, name, status, effective_status, daily_budget, objective, created_time, start_time, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
         ON CONFLICT (id) DO UPDATE SET name=$3, status=$4, effective_status=$5, daily_budget=$6, objective=$7, start_time=$9, updated_at=NOW()`,
        [x.id, accId, x.name, x.status, x.effective_status, x.daily_budget, x.objective, x.created_time, x.start_time || x.created_time]);
    }
    for (const x of ss) {
      await c.query(
        `INSERT INTO adsets (id, campaign_id, account_id, name, status, effective_status, daily_budget, created_time, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
         ON CONFLICT (id) DO UPDATE SET name=$4, status=$5, effective_status=$6, daily_budget=$7, updated_at=NOW()`,
        [x.id, x.campaign_id, accId, x.name, x.status, x.effective_status, x.daily_budget, x.created_time]);
    }
    for (const x of as) {
      await c.query(
        `INSERT INTO ads (id, adset_id, campaign_id, account_id, name, status, effective_status, thumb_url, created_time, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
         ON CONFLICT (id) DO UPDATE SET name=$5, status=$6, effective_status=$7, thumb_url=COALESCE($8, ads.thumb_url), updated_at=NOW()`,
        [x.id, x.adset_id, x.campaign_id, accId, x.name, x.status, x.effective_status, x.thumb_url, x.created_time]);
    }
  });
}

// ── métricas ─────────────────────────────────────────────────────────────
async function saveInsights(rows) {
  for (const r of rows) {
    await db.query(
      `INSERT INTO fb_daily (level, object_id, day, account_id, campaign_id, spend, impressions, reach, frequency, link_clicks, lpv, fb_purchases, fb_revenue, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
       ON CONFLICT (level, object_id, day) DO UPDATE SET spend=$6, impressions=$7, reach=$8, frequency=$9, link_clicks=$10, lpv=$11,
         fb_purchases=$12, fb_revenue=$13, updated_at=NOW()`,
      [r.level, r.object_id, r.day, r.account_id, r.campaign_id, r.spend, r.impressions, r.reach, r.frequency, r.link_clicks, r.lpv, r.fb_purchases, r.fb_revenue]);
  }
}

async function syncAccountMetrics(token, accId, days, { hourly = true, placement = true } = {}) {
  const since = days[0], until = days[days.length - 1];
  for (const level of ['account', 'campaign', 'ad']) {
    await saveInsights(await meta.insights(token, accId, level, since, until));
  }
  for (const day of days) {
    if (hourly) {
      for (const h of await meta.hourly(token, accId, day)) {
        await db.query(
          `INSERT INTO fb_hourly (account_id, day, hour, spend, impressions, link_clicks, fb_purchases, fb_revenue) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (account_id, day, hour) DO UPDATE SET spend=$4, impressions=$5, link_clicks=$6, fb_purchases=$7, fb_revenue=$8`,
          [h.account_id, h.day, h.hour, h.spend, h.impressions, h.link_clicks, h.fb_purchases, h.fb_revenue]);
      }
    }
    if (placement) {
      for (const p of await meta.placements(token, accId, day)) {
        await db.query(
          `INSERT INTO fb_placement (account_id, day, placement, spend, impressions, link_clicks) VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (account_id, day, placement) DO UPDATE SET spend=$4, impressions=$5, link_clicks=$6`,
          [p.account_id, p.day, p.placement, p.spend, p.impressions, p.link_clicks]);
      }
    }
  }
}

// lê TODAS as BMs conectadas
async function syncMeta(days, { structure = true } = {}) {
  const { rows: bms } = await db.query('SELECT * FROM bms WHERE token_enc IS NOT NULL ORDER BY id');
  const errors = [];
  for (const bm of bms) {
    let token;
    try { token = decrypt(bm.token_enc); } catch (_) { errors.push(`${bm.name}: chave não abre (SECRET_KEY mudou?)`); continue; }
    try {
      const accs = await meta.adAccounts(token);
      for (const a of accs) await upsertAccount(a, bm.id);
      for (const a of accs) {
        try {
          if (structure) await syncStructure(token, a.id);
          await syncAccountMetrics(token, a.id, days);
        } catch (err) {
          errors.push(`${a.name}: ${err.message}`);
          if (err.tokenInvalid) throw err;
        }
      }
      await db.query('UPDATE bms SET token_ok = true, last_error = NULL, last_sync_at = NOW() WHERE id = $1', [bm.id]);
    } catch (err) {
      errors.push(`${bm.name}: ${err.message}`);
      await db.query('UPDATE bms SET token_ok = $2, last_error = $3 WHERE id = $1', [bm.id, err.tokenInvalid ? false : bm.token_ok, err.message.slice(0, 500)]);
      if (err.tokenInvalid) {
        await notify.alert({ kind: 'token', severity: 'bad', title: `A chave da ${bm.name} parou de funcionar`, detail: 'A BM pode ter caído ou a chave foi revogada. Gere outra em Conexões.', ref: String(bm.id), dedupe: `token-${bm.id}-${T.today()}`, push: 'account_down' });
      }
    }
  }
  return errors;
}

async function syncApp(days, opts) {
  if (!appdb.enabled()) return 'app não configurado';
  for (const d of days) await appdata.syncDay(d, opts);
  return null;
}

// ── ciclos ───────────────────────────────────────────────────────────────
async function collect({ force = false } = {}) {
  if (running) return { skipped: true };
  running = true;
  const t0 = Date.now();
  try {
    const today = T.today();
    let errors = [];
    if (DEMO()) {
      await require('./demo').tick();
    } else {
      // até 04:00 ainda vale atualizar ontem junto
      const days = T.parts().hour < 4 ? [T.yesterday(), today] : [today];
      errors = await syncMeta(days);
      const appErr = await syncApp(days).catch(e => e.message);
      if (appErr && appErr !== 'app não configurado') errors.push('App: ' + appErr);
    }
    await log('collect', errors.length === 0, errors.join(' | '), Date.now() - t0);
    lastRun = Date.now();
    await andromeda.sendDay(today, false).catch(e => console.warn('[andromeda]', e.message));
    await rules.run().catch(e => console.warn('[rules]', e.message));
    await notify.roiCheckpoint().catch(e => console.warn('[notify]', e.message));
    return { ok: true, errors, ms: Date.now() - t0 };
  } catch (err) {
    await log('collect', false, err.message, Date.now() - t0);
    console.error('[collector]', err);
    return { ok: false, error: err.message };
  } finally {
    running = false;
  }
}

async function closeDay(day, label) {
  const t0 = Date.now();
  try {
    let errors = [];
    if (!DEMO()) {
      errors = await syncMeta([day], { structure: false });
      await syncApp([day]);
      if (appdb.enabled()) await appdata.syncCohort(T.addDays(day, -45), day).catch(e => errors.push('Recompra: ' + e.message));
    }
    await andromeda.sendDay(day, true);
    await log(label, errors.length === 0, errors.join(' | '), Date.now() - t0);
  } catch (err) {
    await log(label, false, err.message, Date.now() - t0);
  }
}

async function loop() {
  try {
    const now = T.parts();
    const s = await settings.all();
    const state = s.collector_state || {};
    const y = T.yesterday();
    if (now.hour === 0 && now.minute >= 5 && state.closed !== y) {
      await settings.set('collector_state', { ...state, closed: y });
      await closeDay(y, 'close');
    } else if (now.hour === 4 && state.rechecked !== y) {
      await settings.set('collector_state', { ...state, rechecked: y });
      await closeDay(y, 'recheck');
    }
    const every = Math.max(10, Number(s.collect.interval_min) || 30) * 60000;
    if (Date.now() - lastRun >= every) await collect();
  } catch (err) {
    console.error('[collector] loop:', err.message);
  }
}

function start() {
  setTimeout(loop, 3000);
  setInterval(loop, 60000);
}

const status = () => ({ running, last_run: lastRun ? new Date(lastRun).toISOString() : null });

module.exports = { start, collect, closeDay, syncStructure, status };
