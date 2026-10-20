// lib/actions.js — mudanças nas campanhas (ligar, desligar, orçamento)
//
// Tudo passa por aqui: pedido de regra, sugestão do relatório ou clique seu.
// Nada vai pro Face se a "Edição" estiver desligada em Conexões (etapa 4).
// Cada mudança guarda o valor anterior → botão Desfazer.
const db = require('../db');
const settings = require('./settings');
const meta = require('./meta');
const { decrypt } = require('./crypto');
const notify = require('./notify');

const DEMO = () => process.env.DEMO_MODE === '1';
const LABEL = { pause: 'Desligar', activate: 'Ligar', budget: 'Mudar orçamento' };

async function tokenFor(accountId) {
  const { rows } = await db.query(`SELECT b.token_enc FROM ad_accounts a JOIN bms b ON b.id = a.bm_id WHERE a.id = $1`, [accountId]);
  if (!rows[0] || !rows[0].token_enc) throw new Error('Conta sem BM conectada');
  return decrypt(rows[0].token_enc);
}

async function objectInfo(level, id) {
  if (level === 'campaign') {
    const { rows } = await db.query(`SELECT id, name, account_id, status, daily_budget::float FROM campaigns WHERE id = $1`, [id]);
    if (!rows[0]) throw new Error('Campanha não encontrada');
    const sets = await db.query(`SELECT id, daily_budget::float, status FROM adsets WHERE campaign_id = $1 AND status = 'ACTIVE' AND daily_budget IS NOT NULL`, [id]);
    const c = rows[0];
    c.adsets = sets.rows;
    c.budget = c.daily_budget != null ? c.daily_budget : sets.rows.reduce((s, x) => s + x.daily_budget, 0) || null;
    return c;
  }
  const t = level === 'ad' ? 'ads' : 'adsets';
  const { rows } = await db.query(`SELECT id, name, account_id, status FROM ${t} WHERE id = $1`, [id]);
  if (!rows[0]) throw new Error('Objeto não encontrado');
  return rows[0];
}

// cria um pedido (pendente). dedupe evita pedir a mesma coisa duas vezes no dia.
async function request({ source, rule_id = null, report_id = null, level = 'campaign', object_id, action, payload = {}, reason, dedupe = null, pushIt = true }) {
  const obj = await objectInfo(level, object_id);
  const { rows } = await db.query(
    `INSERT INTO actions (source, rule_id, report_id, level, object_id, object_name, action, payload, reason, dedupe_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING RETURNING *`,
    [source, rule_id, report_id, level, object_id, obj.name, action, payload, reason, dedupe]);
  if (rows[0] && pushIt) {
    await notify.push('approval', `Aprovação: ${LABEL[action]} ${obj.name}`, reason || '', '/#aprovar');
  }
  return rows[0] || null;
}

function newBudget(cur, payload) {
  if (payload.value) return Number(payload.value);
  if (payload.pct) return Math.round(cur * (1 + Number(payload.pct) / 100));
  throw new Error('Orçamento novo não informado');
}

// executa no Face (ou só no banco, em demonstração)
async function apply(level, id, action, payload, { source } = {}) {
  const g = await settings.get('guards');
  if (!g.edit_enabled) throw new Error('A edição pelo Radar está desligada (ligue em Conexões quando quiser)');
  if (g.paused_all && source === 'rule') throw new Error('Regras pausadas');
  const obj = await objectInfo(level, id);
  const prev = { status: obj.status, budget: obj.budget, adsets: obj.adsets };
  const token = DEMO() ? null : await tokenFor(obj.account_id);
  const table = level === 'campaign' ? 'campaigns' : level === 'ad' ? 'ads' : 'adsets';

  if (action === 'pause' || action === 'activate') {
    const st = action === 'pause' ? 'PAUSED' : 'ACTIVE';
    if (!DEMO()) await meta.setStatus(token, id, st);
    await db.query(`UPDATE ${table} SET status = $2, effective_status = $2, updated_at = NOW() WHERE id = $1`, [id, st]);
    return { prev, next: { status: st } };
  }
  if (action === 'budget') {
    if (level !== 'campaign') throw new Error('Orçamento é mudado na campanha');
    if (!obj.budget) throw new Error('Essa campanha não tem orçamento diário');
    const target = newBudget(obj.budget, payload);
    const pct = Math.abs(target / obj.budget - 1) * 100;
    if (source !== 'user' && pct > g.max_change_pct + 0.01) throw new Error(`Mudança de ${Math.round(pct)}% passa da trava de ${g.max_change_pct}%`);
    if (target > g.max_campaign_budget) throw new Error(`R$ ${target} passa do teto de R$ ${g.max_campaign_budget} por campanha`);
    if (target < 5) throw new Error('Orçamento mínimo é R$ 5');
    if (obj.daily_budget != null) {
      if (!DEMO()) await meta.setDailyBudget(token, id, target);
      await db.query('UPDATE campaigns SET daily_budget = $2, updated_at = NOW() WHERE id = $1', [id, target]);
    } else {
      const f = target / obj.budget;
      for (const s of obj.adsets) {
        const v = Math.max(5, Math.round(s.daily_budget * f * 100) / 100);
        if (!DEMO()) await meta.setDailyBudget(token, s.id, v);
        await db.query('UPDATE adsets SET daily_budget = $2, updated_at = NOW() WHERE id = $1', [s.id, v]);
      }
    }
    return { prev, next: { budget: target } };
  }
  throw new Error('Ação desconhecida');
}

async function execute(actionId) {
  const { rows } = await db.query('SELECT * FROM actions WHERE id = $1', [actionId]);
  const a = rows[0];
  if (!a) throw new Error('Pedido não encontrado');
  if (a.status !== 'pending') throw new Error('Esse pedido já foi resolvido');
  try {
    const r = await apply(a.level, a.object_id, a.action, a.payload, { source: a.source });
    await db.query(`UPDATE actions SET status = 'executed', prev = $2, decided_at = NOW(), executed_at = NOW(), error = NULL WHERE id = $1`, [a.id, r.prev]);
    return { ok: true };
  } catch (err) {
    await db.query(`UPDATE actions SET error = $2 WHERE id = $1`, [a.id, err.message]);
    throw err;
  }
}

// mudança feita direto por você (tabela de campanhas) — já nasce executada
async function direct(level, id, action, payload) {
  const obj = await objectInfo(level, id);
  const r = await apply(level, id, action, payload, { source: 'user' });
  const reason = action === 'budget' ? `R$ ${obj.budget} → R$ ${r.next.budget}` : 'Pelo Radar';
  const { rows } = await db.query(
    `INSERT INTO actions (source, level, object_id, object_name, action, payload, prev, reason, status, decided_at, executed_at)
     VALUES ('user',$1,$2,$3,$4,$5,$6,$7,'executed',NOW(),NOW()) RETURNING *`, [level, id, obj.name, action, payload, r.prev, reason]);
  return rows[0];
}

async function ignore(actionId) {
  await db.query(`UPDATE actions SET status = 'ignored', decided_at = NOW() WHERE id = $1 AND status = 'pending'`, [actionId]);
}

async function undo(actionId) {
  const { rows } = await db.query('SELECT * FROM actions WHERE id = $1', [actionId]);
  const a = rows[0];
  if (!a || a.status !== 'executed' || !a.prev) throw new Error('Não dá pra desfazer esse');
  const p = a.prev;
  const g = await settings.get('guards');
  if (!g.edit_enabled) throw new Error('A edição pelo Radar está desligada');
  if (a.action === 'pause' || a.action === 'activate') {
    await apply(a.level, a.object_id, p.status === 'ACTIVE' ? 'activate' : 'pause', {}, { source: 'user' });
  } else if (a.action === 'budget') {
    const token = DEMO() ? null : await tokenFor((await objectInfo(a.level, a.object_id)).account_id);
    if (p.adsets && p.adsets.length && !(await objectInfo('campaign', a.object_id)).daily_budget) {
      for (const s of p.adsets) {
        if (!DEMO()) await meta.setDailyBudget(token, s.id, s.daily_budget);
        await db.query('UPDATE adsets SET daily_budget = $2 WHERE id = $1', [s.id, s.daily_budget]);
      }
    } else {
      if (!DEMO()) await meta.setDailyBudget(token, a.object_id, p.budget);
      await db.query('UPDATE campaigns SET daily_budget = $2 WHERE id = $1', [a.object_id, p.budget]);
    }
  }
  await db.query(`UPDATE actions SET status = 'undone' WHERE id = $1`, [a.id]);
}

module.exports = { request, execute, direct, ignore, undo, apply, LABEL };
