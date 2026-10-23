// lib/migrations.js — cria/atualiza as tabelas do Radar no boot (idempotente)
const db = require('../db');

const STEPS = [
  `CREATE TABLE IF NOT EXISTS settings (
     key        TEXT PRIMARY KEY,
     value      JSONB NOT NULL,
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,

  // ── ESTRUTURA: perfis → BMs → contas de anúncio ─────────────────────────
  `CREATE TABLE IF NOT EXISTS profiles (
     id         SERIAL PRIMARY KEY,
     name       TEXT NOT NULL,
     role       TEXT NOT NULL DEFAULT 'operador',   -- cofre | operador
     status     TEXT NOT NULL DEFAULT 'ativo',      -- ativo | verificacao | caiu
     notes      TEXT,
     last_used_at DATE,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS bms (
     id          SERIAL PRIMARY KEY,
     meta_id     TEXT UNIQUE,
     name        TEXT NOT NULL,
     profile_id  INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
     token_enc   TEXT,
     token_ok    BOOLEAN,
     token_scopes TEXT,
     last_error  TEXT,
     last_sync_at TIMESTAMPTZ,
     created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS domains (
     id         SERIAL PRIMARY KEY,
     domain     TEXT NOT NULL UNIQUE,
     status     TEXT NOT NULL DEFAULT 'ok',   -- ok | reserva | marcado
     notes      TEXT,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS ad_accounts (
     id             TEXT PRIMARY KEY,            -- act_123
     bm_id          INTEGER REFERENCES bms(id) ON DELETE SET NULL,
     name           TEXT,
     account_status INTEGER,                     -- 1 ativa, 2 desativada, 3 pendente pagamento, 7/9 em análise...
     disable_reason INTEGER,
     currency       TEXT,
     timezone_name  TEXT,
     spend_cap      NUMERIC(14,2),
     amount_spent   NUMERIC(14,2),
     funding_label  TEXT,                         -- vindo do Face (ex.: "Visa *1234")
     card_label     TEXT,                         -- digitado por você
     is_reserve     BOOLEAN NOT NULL DEFAULT false,
     domain_id      INTEGER REFERENCES domains(id) ON DELETE SET NULL,
     notes          TEXT,
     status_changed_at TIMESTAMPTZ,
     last_sync_at   TIMESTAMPTZ,
     created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,

  // ── OBJETOS DO FACE ─────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS campaigns (
     id               TEXT PRIMARY KEY,
     account_id       TEXT REFERENCES ad_accounts(id) ON DELETE CASCADE,
     name             TEXT,
     status           TEXT,
     effective_status TEXT,
     daily_budget     NUMERIC(12,2),               -- em reais (CBO); NULL = orçamento nos conjuntos
     objective        TEXT,
     created_time     TIMESTAMPTZ,
     start_time       TIMESTAMPTZ,
     updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS adsets (
     id               TEXT PRIMARY KEY,
     campaign_id      TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
     account_id       TEXT,
     name             TEXT,
     status           TEXT,
     effective_status TEXT,
     daily_budget     NUMERIC(12,2),
     created_time     TIMESTAMPTZ,
     updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS ads (
     id               TEXT PRIMARY KEY,
     adset_id         TEXT,
     campaign_id      TEXT,
     account_id       TEXT,
     name             TEXT,
     status           TEXT,
     effective_status TEXT,
     thumb_url        TEXT,
     created_time     TIMESTAMPTZ,
     updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_ads_campaign ON ads(campaign_id)`,
  `CREATE INDEX IF NOT EXISTS idx_adsets_campaign ON adsets(campaign_id)`,

  // ── MÉTRICAS DO FACE ────────────────────────────────────────────────────
  // level: account | campaign | adset | ad
  `CREATE TABLE IF NOT EXISTS fb_daily (
     level        TEXT NOT NULL,
     object_id    TEXT NOT NULL,
     day          DATE NOT NULL,
     account_id   TEXT,
     campaign_id  TEXT,
     spend        NUMERIC(14,2) NOT NULL DEFAULT 0,
     impressions  BIGINT NOT NULL DEFAULT 0,
     reach        BIGINT NOT NULL DEFAULT 0,
     frequency    NUMERIC(8,3) NOT NULL DEFAULT 0,
     link_clicks  BIGINT NOT NULL DEFAULT 0,
     lpv          BIGINT NOT NULL DEFAULT 0,          -- visualizações da página de destino
     fb_purchases INTEGER NOT NULL DEFAULT 0,         -- o que o Face diz
     fb_revenue   NUMERIC(14,2) NOT NULL DEFAULT 0,
     updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     PRIMARY KEY (level, object_id, day)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_fb_daily_day ON fb_daily(day, level)`,
  `CREATE TABLE IF NOT EXISTS fb_hourly (
     account_id  TEXT NOT NULL,
     day         DATE NOT NULL,
     hour        SMALLINT NOT NULL,
     spend       NUMERIC(14,2) NOT NULL DEFAULT 0,
     impressions BIGINT NOT NULL DEFAULT 0,
     link_clicks BIGINT NOT NULL DEFAULT 0,
     fb_purchases INTEGER NOT NULL DEFAULT 0,
     fb_revenue  NUMERIC(14,2) NOT NULL DEFAULT 0,
     PRIMARY KEY (account_id, day, hour)
   )`,
  `CREATE TABLE IF NOT EXISTS fb_placement (
     account_id  TEXT NOT NULL,
     day         DATE NOT NULL,
     placement   TEXT NOT NULL,          -- ex.: instagram_reels, facebook_feed, audience_network
     spend       NUMERIC(14,2) NOT NULL DEFAULT 0,
     impressions BIGINT NOT NULL DEFAULT 0,
     link_clicks BIGINT NOT NULL DEFAULT 0,
     PRIMARY KEY (account_id, day, placement)
   )`,

  // ── DADOS DO APP (copiados em resumo; o app em si nunca é tocado) ───────
  `CREATE TABLE IF NOT EXISTS app_daily (
     day         DATE PRIMARY KEY,
     visitors    INTEGER NOT NULL DEFAULT 0,
     chatted     INTEGER NOT NULL DEFAULT 0,
     checkout    INTEGER NOT NULL DEFAULT 0,
     pix         INTEGER NOT NULL DEFAULT 0,
     sales       INTEGER NOT NULL DEFAULT 0,
     revenue     NUMERIC(14,2) NOT NULL DEFAULT 0,
     refunds     INTEGER NOT NULL DEFAULT 0,
     refund_value NUMERIC(14,2) NOT NULL DEFAULT 0,
     tagged_visitors INTEGER NOT NULL DEFAULT 0,      -- entradas com etiqueta do Face
     updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS app_hourly (
     day      DATE NOT NULL,
     hour     SMALLINT NOT NULL,
     visitors INTEGER NOT NULL DEFAULT 0,
     chatted  INTEGER NOT NULL DEFAULT 0,
     checkout INTEGER NOT NULL DEFAULT 0,
     pix      INTEGER NOT NULL DEFAULT 0,
     sales    INTEGER NOT NULL DEFAULT 0,
     revenue  NUMERIC(14,2) NOT NULL DEFAULT 0,
     PRIMARY KEY (day, hour)
   )`,
  // vendas reais e entradas por etiqueta (utm) → liga venda com campanha/anúncio
  // kind: campaign | adset | ad | placement ; key: id (ou nome) que veio no link
  `CREATE TABLE IF NOT EXISTS app_attrib (
     day      DATE NOT NULL,
     kind     TEXT NOT NULL,
     key      TEXT NOT NULL,
     visitors INTEGER NOT NULL DEFAULT 0,
     sales    INTEGER NOT NULL DEFAULT 0,
     revenue  NUMERIC(14,2) NOT NULL DEFAULT 0,
     PRIMARY KEY (day, kind, key)
   )`,
  // recompra: faturamento dos compradores "nascidos" no dia, no dia / até 7 / até 30 dias
  `CREATE TABLE IF NOT EXISTS app_cohort (
     day      DATE PRIMARY KEY,
     rev_d0   NUMERIC(14,2) NOT NULL DEFAULT 0,
     rev_d7   NUMERIC(14,2) NOT NULL DEFAULT 0,
     rev_d30  NUMERIC(14,2) NOT NULL DEFAULT 0,
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,

  // ── OPERAÇÃO ────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS notes (
     id         SERIAL PRIMARY KEY,
     day        DATE NOT NULL,
     title      TEXT NOT NULL,
     detail     TEXT,
     kind       TEXT NOT NULL DEFAULT 'mudanca',    -- mudanca | criativo | conta | auto
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS rules (
     id         SERIAL PRIMARY KEY,
     name       TEXT NOT NULL,
     kind       TEXT NOT NULL,          -- roi_low | roi_high | spend_no_sale | fatigue | day_roi_low
     params     JSONB NOT NULL DEFAULT '{}',
     mode       TEXT NOT NULL DEFAULT 'notify',   -- notify | approve | auto
     enabled    BOOLEAN NOT NULL DEFAULT true,
     last_fired_at TIMESTAMPTZ,
     fired_today INTEGER NOT NULL DEFAULT 0,
     fired_day  DATE,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS actions (
     id          SERIAL PRIMARY KEY,
     source      TEXT NOT NULL,          -- rule | report | user
     rule_id     INTEGER,
     report_id   INTEGER,
     level       TEXT NOT NULL,          -- campaign | adset
     object_id   TEXT NOT NULL,
     object_name TEXT,
     action      TEXT NOT NULL,          -- pause | activate | budget
     payload     JSONB NOT NULL DEFAULT '{}',
     prev        JSONB,
     reason      TEXT,
     status      TEXT NOT NULL DEFAULT 'pending',  -- pending | ignored | executed | failed | undone
     error       TEXT,
     dedupe_key  TEXT,
     created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     decided_at  TIMESTAMPTZ,
     executed_at TIMESTAMPTZ
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_actions_dedupe ON actions(dedupe_key) WHERE dedupe_key IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS alerts (
     id         SERIAL PRIMARY KEY,
     kind       TEXT NOT NULL,
     severity   TEXT NOT NULL DEFAULT 'warn',   -- bad | warn | good | info
     title      TEXT NOT NULL,
     detail     TEXT,
     ref        TEXT,
     dedupe_key TEXT,
     seen       BOOLEAN NOT NULL DEFAULT false,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_alerts_dedupe ON alerts(dedupe_key) WHERE dedupe_key IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS reports (
     id         SERIAL PRIMARY KEY,
     day        DATE NOT NULL,           -- dia analisado
     title      TEXT NOT NULL,
     summary    TEXT,
     content    JSONB NOT NULL DEFAULT '{}',
     source     TEXT NOT NULL DEFAULT 'claude',
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS push_subs (
     endpoint   TEXT PRIMARY KEY,
     keys       JSONB NOT NULL,
     user_agent TEXT,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS andromeda_log (
     id          SERIAL PRIMARY KEY,
     day         DATE NOT NULL,
     total       NUMERIC(14,2) NOT NULL,
     closing     BOOLEAN NOT NULL DEFAULT false,
     ok          BOOLEAN NOT NULL,
     status_code INTEGER,
     error       TEXT,
     sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS sync_log (
     id         SERIAL PRIMARY KEY,
     kind       TEXT NOT NULL,           -- meta | app | close
     ok         BOOLEAN NOT NULL,
     detail     TEXT,
     ms         INTEGER,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  // out/2026: orçamento ativo por dia (base da "meta de gasto") e metas do mês
  `CREATE TABLE IF NOT EXISTS budget_log (
     day        DATE NOT NULL,
     bm_id      INTEGER NOT NULL,
     total      NUMERIC(14,2) NOT NULL DEFAULT 0,
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     PRIMARY KEY (day, bm_id)
   )`,
  `CREATE TABLE IF NOT EXISTS goals (
     month      TEXT PRIMARY KEY,
     invest     NUMERIC(14,2),
     sales      INTEGER,
     revenue    NUMERIC(14,2),
     profit     NUMERIC(14,2),
     roi        NUMERIC(6,2),
     notes      TEXT,
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
];

async function run() {
  for (const sql of STEPS) await db.query(sql);
  await seedDefaults();
  await oneTimeFixes();
  console.log(`[migrations] ${STEPS.length} passos ok`);
}

// ajustes de uma vez só (marcados em settings pra não repetir)
async function oneTimeFixes() {
  const done = async key => (await db.query('SELECT 1 FROM settings WHERE key = $1', [key])).rows.length > 0;
  const mark = key => db.query(`INSERT INTO settings (key, value) VALUES ($1, 'true') ON CONFLICT (key) DO NOTHING`, [key]);
  // imposto real do dono: 12,15% sobre o investido (o mesmo do Andrômeda)
  if (!(await done('fix_tax_1215'))) {
    await db.query(`UPDATE settings SET value = jsonb_set(value, '{tax_pct}', '12.15') WHERE key = 'targets' AND (value->>'tax_pct')::numeric IN (12, 12.25)`);
    await mark('fix_tax_1215');
  }
  // o dono gerencia as campanhas sozinho: regras automáticas ficam desligadas
  if (!(await done('fix_rules_off'))) {
    await db.query('UPDATE rules SET enabled = false');
    await mark('fix_rules_off');
  }
}

// regras e configurações iniciais (só cria se ainda não existir)
async function seedDefaults() {
  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM rules');
  if (rows[0].n === 0) {
    const R = [
      ['Desligar campanha que dá prejuízo', 'roi_low', { roi: 0.8, min_cpa_mult: 3 }, 'approve'],
      ['Subir orçamento de campanha boa', 'roi_high', { roi: 1.8, days: 2, pct: 15 }, 'approve'],
      ['Gastou sem vender', 'spend_no_sale', { spend: 40 }, 'notify'],
      ['Criativo saturado', 'fatigue', { freq: 3, ctr_drop: 30, days: 5 }, 'notify'],
      ['ROI do dia baixo', 'day_roi_low', { roi: 1.2, hour: 18 }, 'notify'],
    ];
    for (const [name, kind, params, mode] of R) {
      await db.query('INSERT INTO rules (name, kind, params, mode) VALUES ($1,$2,$3,$4)', [name, kind, params, mode]);
    }
  }
}

module.exports = { run };
