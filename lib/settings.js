// lib/settings.js — configurações do Radar (editáveis no painel), com cache curto
const db = require('../db');

const DEFAULTS = {
  // metas e contas do negócio
  targets: {
    roi_goal: 1.6,          // ROI real que você busca
    daily_budget_goal: 3000,// meta de gasto do dia (barra na Visão geral)
    cpa_target: 9,          // custo por venda "normal" (usado nas travas das regras)
    tax_pct: 12.15,         // imposto sobre o valor investido (o mesmo do Andrômeda)
    max_account_share: 20   // % máximo do gasto do dia numa conta só
  },
  // travas de segurança da edição
  guards: {
    edit_enabled: false,    // etapa 4: liga quando você confiar
    auto_enabled: false,    // permite regras no modo automático
    max_change_pct: 20,
    max_campaign_budget: 300,
    max_day_spend: 4000,
    paused_all: false
  },
  // gasto: leitura leve a cada light_min (Argos + Andrômeda); completa só nas horas de full_hours
  collect: { interval_min: 30, light_min: 15, full_hours: [7, 9, 11, 13, 15, 17, 19, 21, 23] },
  andromeda: { url: '', secret: '', enabled: false },
  notify: {
    roi_hours: [12, 18, 22],
    roi_day: true,
    account_down: true,
    approval: true,
    spend_no_sale: true,
    fatigue: false,
    report: true
  }
};

let cache = null, cacheAt = 0;

async function all() {
  if (cache && Date.now() - cacheAt < 15000) return cache;
  const { rows } = await db.query('SELECT key, value FROM settings');
  const out = JSON.parse(JSON.stringify(DEFAULTS));
  for (const r of rows) {
    if (out[r.key] && typeof out[r.key] === 'object' && !Array.isArray(out[r.key])) out[r.key] = { ...out[r.key], ...r.value };
    else out[r.key] = r.value;
  }
  cache = out; cacheAt = Date.now();
  return out;
}

async function get(key) { return (await all())[key]; }

async function set(key, value) {
  await db.query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`, [key, value]);
  cache = null;
}

async function merge(key, patch) {
  const cur = (await all())[key] || {};
  await set(key, { ...cur, ...patch });
}

module.exports = { DEFAULTS, all, get, set, merge };
