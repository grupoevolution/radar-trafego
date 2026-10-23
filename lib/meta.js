// lib/meta.js — conversa com a API do Facebook (Graph / Marketing API)
//
// Conexão: cada BM gera uma chave de "usuário do sistema". Com ela o Radar
// descobre sozinho as contas de anúncio atribuídas (GET /me/adaccounts) e o
// nome da BM dona de cada conta. Nada de login de perfil: se um perfil cair,
// a chave continua valendo enquanto a BM existir.
const VERSION = process.env.META_API_VERSION || 'v24.0';
const BASE = `https://graph.facebook.com/${VERSION}`;

class MetaError extends Error {
  constructor(msg, code, sub, status) { super(msg); this.code = code; this.sub = sub; this.status = status; }
  get tokenInvalid() { return this.code === 190 || this.code === 102; }
  get rateLimited() { return [4, 17, 32, 613, 80000, 80001, 80002, 80003, 80004, 80005, 80006, 80008, 80014].includes(this.code); }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function call(method, path, token, params = {}, tries = 3) {
  const url = new URL(path.startsWith('http') ? path : BASE + path);
  const body = new URLSearchParams();
  const target = method === 'GET' ? url.searchParams : body;
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    target.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
  if (!path.startsWith('http')) target.set('access_token', token);

  for (let i = 0; i < tries; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    let res, json;
    try {
      res = await fetch(url, { method, body: method === 'GET' ? undefined : body, signal: ctrl.signal });
      json = await res.json().catch(() => ({}));
    } catch (err) {
      clearTimeout(timer);
      if (i === tries - 1) throw new MetaError('Sem resposta do Facebook: ' + err.message, 0, 0, 0);
      await sleep(1500 * (i + 1));
      continue;
    }
    clearTimeout(timer);
    if (res.ok && !json.error) return json;
    const e = json.error || {};
    const err = new MetaError(e.error_user_msg || e.message || `HTTP ${res.status}`, e.code, e.error_subcode, res.status);
    if (err.rateLimited && i < tries - 1) { await sleep(20000 * (i + 1)); continue; }
    if (res.status >= 500 && i < tries - 1) { await sleep(3000 * (i + 1)); continue; }
    throw err;
  }
}

// GET com paginação automática (segue paging.next)
async function all(path, token, params = {}, max = 5000) {
  const out = [];
  let page = await call('GET', path, token, { limit: 500, ...params });
  while (page) {
    out.push(...(page.data || []));
    if (out.length >= max || !page.paging || !page.paging.next) break;
    page = await call('GET', page.paging.next, token);
  }
  return out;
}

// ── leitura ──────────────────────────────────────────────────────────────
async function whoAmI(token) {
  return call('GET', '/me', token, { fields: 'id,name' });
}

const ACCOUNT_FIELDS = 'id,name,account_status,disable_reason,currency,timezone_name,spend_cap,amount_spent,business{id,name}';

async function adAccounts(token) {
  let list;
  try {
    list = await all('/me/adaccounts', token, { fields: ACCOUNT_FIELDS + ',funding_source_details' });
  } catch (err) {
    // funding_source_details pede permissão extra em algumas BMs — tenta sem
    list = await all('/me/adaccounts', token, { fields: ACCOUNT_FIELDS });
  }
  return list.map(a => ({
    id: a.id,
    name: a.name,
    account_status: a.account_status,
    disable_reason: a.disable_reason,
    currency: a.currency,
    timezone_name: a.timezone_name,
    spend_cap: a.spend_cap ? Number(a.spend_cap) / 100 : null,
    amount_spent: a.amount_spent ? Number(a.amount_spent) / 100 : null,
    funding_label: a.funding_source_details && a.funding_source_details.display_string || null,
    business: a.business || null
  }));
}

const LIVE = ['ACTIVE', 'PAUSED', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'IN_PROCESS', 'WITH_ISSUES', 'PENDING_REVIEW', 'DISAPPROVED', 'PREAPPROVED', 'PENDING_BILLING_INFO'];
const cents = v => (v === undefined || v === null || v === '') ? null : Number(v) / 100;

async function campaigns(token, acc) {
  const rows = await all(`/${acc}/campaigns`, token, {
    fields: 'id,name,status,effective_status,daily_budget,objective,created_time,start_time',
    effective_status: LIVE
  });
  return rows.map(c => ({ ...c, daily_budget: cents(c.daily_budget) }));
}
async function adsets(token, acc) {
  const rows = await all(`/${acc}/adsets`, token, {
    fields: 'id,name,campaign_id,status,effective_status,daily_budget,created_time',
    effective_status: LIVE
  });
  return rows.map(a => ({ ...a, daily_budget: cents(a.daily_budget) }));
}
async function ads(token, acc) {
  const rows = await all(`/${acc}/ads`, token, {
    fields: 'id,name,adset_id,campaign_id,status,effective_status,created_time,creative{thumbnail_url,image_url}',
    effective_status: LIVE
  });
  return rows.map(a => ({ ...a, thumb_url: a.creative && (a.creative.image_url || a.creative.thumbnail_url) || null }));
}

// anúncios reprovados ou com problema e conjuntos com erro (leitura pequena, roda a cada 15 min)
async function problems(token, acc) {
  const [ads, sets] = await Promise.all([
    all(`/${acc}/ads`, token, { fields: 'id,name,status,effective_status,campaign{name},ad_review_feedback', effective_status: ['DISAPPROVED', 'WITH_ISSUES'] }),
    all(`/${acc}/adsets`, token, { fields: 'id,name,status,effective_status,campaign{name},issues_info', effective_status: ['WITH_ISSUES'] })
  ]);
  return { ads, sets };
}

// ── métricas ─────────────────────────────────────────────────────────────
const PURCHASE_TYPES = ['omni_purchase', 'offsite_conversion.fb_pixel_purchase', 'purchase'];
function pick(actions, types) {
  if (!Array.isArray(actions)) return 0;
  for (const t of types) {
    const a = actions.find(x => x.action_type === t);
    if (a) return Number(a.value) || 0;
  }
  return 0;
}
function metricRow(r) {
  return {
    spend: Number(r.spend) || 0,
    impressions: Number(r.impressions) || 0,
    reach: Number(r.reach) || 0,
    frequency: Number(r.frequency) || 0,
    link_clicks: Number(r.inline_link_clicks) || 0,
    lpv: pick(r.actions, ['landing_page_view', 'omni_landing_page_view']),
    fb_purchases: Math.round(pick(r.actions, PURCHASE_TYPES)),
    fb_revenue: pick(r.action_values, PURCHASE_TYPES)
  };
}

// level: account | campaign | adset | ad — um registro por objeto por dia
async function insights(token, acc, level, since, until) {
  const idField = level === 'account' ? 'account_id' : `${level}_id`;
  const rows = await all(`/${acc}/insights`, token, {
    level,
    time_range: { since, until },
    time_increment: 1,
    fields: `account_id,campaign_id,${level === 'ad' ? 'adset_id,ad_id,' : ''}${level === 'adset' ? 'adset_id,' : ''}spend,impressions,reach,frequency,inline_link_clicks,actions,action_values`
  });
  return rows.map(r => ({
    level,
    object_id: level === 'account' ? acc : r[idField],
    day: r.date_start,
    account_id: acc,
    campaign_id: r.campaign_id || null,
    ...metricRow(r)
  }));
}

async function hourly(token, acc, day) {
  const rows = await all(`/${acc}/insights`, token, {
    level: 'account',
    time_range: { since: day, until: day },
    breakdowns: 'hourly_stats_aggregated_by_advertiser_time_zone',
    fields: 'spend,impressions,inline_link_clicks,actions,action_values'
  });
  return rows.map(r => {
    const m = metricRow(r);
    return { account_id: acc, day, hour: parseInt(String(r.hourly_stats_aggregated_by_advertiser_time_zone).slice(0, 2), 10), spend: m.spend, impressions: m.impressions, link_clicks: m.link_clicks, fb_purchases: m.fb_purchases, fb_revenue: m.fb_revenue };
  });
}

async function placements(token, acc, day) {
  const rows = await all(`/${acc}/insights`, token, {
    level: 'account',
    time_range: { since: day, until: day },
    breakdowns: 'publisher_platform,platform_position',
    fields: 'spend,impressions,inline_link_clicks'
  });
  return rows.map(r => ({
    account_id: acc, day,
    placement: `${r.publisher_platform}_${r.platform_position}`.toLowerCase(),
    spend: Number(r.spend) || 0, impressions: Number(r.impressions) || 0, link_clicks: Number(r.inline_link_clicks) || 0
  }));
}

// ── edição (só usada quando a edição estiver ligada no painel) ───────────
async function setStatus(token, objectId, status) {
  return call('POST', `/${objectId}`, token, { status });
}
async function setDailyBudget(token, objectId, reais) {
  return call('POST', `/${objectId}`, token, { daily_budget: Math.round(reais * 100) });
}

module.exports = { VERSION, MetaError, whoAmI, adAccounts, campaigns, adsets, ads, problems, insights, hourly, placements, setStatus, setDailyBudget };
