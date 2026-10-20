// lib/rules.js — o Radar vigia as campanhas por você
//
// Modos: notify (só avisa) · approve (pede sua aprovação) · auto (faz sozinho,
// só se você liberar o automático em Conexões). Todas usam o ROI REAL.
//
// Trava importante: se poucas vendas do dia tiverem etiqueta (UTM) — por
// exemplo, link sem os parâmetros — as regras de ROI ficam paradas, pra nunca
// desligar campanha boa achando que ela não vendeu.
const db = require('../db');
const T = require('./time');
const settings = require('./settings');
const metrics = require('./metrics');
const actions = require('./actions');
const notify = require('./notify');

const brl = v => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
const f2 = v => (Number(v) || 0).toFixed(2).replace('.', ',');

async function coverage(day) {
  const { rows } = await db.query(`
    SELECT (SELECT COALESCE(SUM(sales),0) FROM app_attrib WHERE day=$1 AND kind='campaign')::float tagged,
           (SELECT COALESCE(sales,0) FROM app_daily WHERE day=$1)::float total`, [day]);
  const r = rows[0];
  return r.total ? r.tagged / r.total : 0;
}

async function fire(rule, { object, level = 'campaign', action, payload = {}, reason, title }) {
  const day = T.today();
  const dedupe = `rule${rule.id}-${level}-${object.id}-${day}`;
  if (rule.mode === 'notify' || !action) {
    const created = await notify.alert({
      kind: 'rule', severity: rule.kind === 'roi_high' ? 'good' : 'warn',
      title: title || `${rule.name}: ${object.name}`, detail: reason, ref: object.id, dedupe,
      push: rule.kind === 'spend_no_sale' ? 'spend_no_sale' : rule.kind === 'fatigue' ? 'fatigue' : 'roi_day'
    });
    if (created) await mark(rule);
    return;
  }
  const g = await settings.get('guards');
  const req = await actions.request({ source: 'rule', rule_id: rule.id, level, object_id: object.id, action, payload, reason, dedupe, pushIt: !(rule.mode === 'auto' && g.auto_enabled) });
  if (!req) return;
  await mark(rule);
  if (rule.mode === 'auto' && g.auto_enabled && g.edit_enabled) {
    try { await actions.execute(req.id); await notify.push('approval', `Feito: ${actions.LABEL[action]} ${object.name}`, reason, '/#regras'); }
    catch (err) { console.warn('[rules] automático falhou:', err.message); }
  }
}

async function mark(rule) {
  const day = T.today();
  await db.query(`UPDATE rules SET last_fired_at = NOW(), fired_today = CASE WHEN fired_day = $2 THEN fired_today + 1 ELSE 1 END, fired_day = $2 WHERE id = $1`, [rule.id, day]);
}

async function run() {
  const g = await settings.get('guards');
  if (g.paused_all) return;
  const tg = await settings.get('targets');
  const { rows: rules } = await db.query('SELECT * FROM rules WHERE enabled = true ORDER BY id');
  if (!rules.length) return;
  const day = T.today();
  const cov = await coverage(day);
  const roiOk = cov >= 0.3;
  const camps = (await metrics.objectRows('campaign', day, day)).filter(c => c.status === 'ACTIVE');

  for (const rule of rules) {
    const p = rule.params || {};
    try {
      if (rule.kind === 'roi_low' && roiOk) {
        for (const c of camps) {
          if (c.spend >= tg.cpa_target * (p.min_cpa_mult || 3) && c.roi < p.roi) {
            await fire(rule, { object: c, action: 'pause', reason: `ROI real ${f2(c.roi)} com ${brl(c.spend)} gastos (o Face diz ${f2(c.roi_face)}). ${c.sales} vendas reais.` });
          }
        }
      }
      if (rule.kind === 'spend_no_sale' && roiOk) {
        for (const c of camps) {
          if (c.spend > (p.spend || 40) && c.sales === 0) {
            await fire(rule, { object: c, action: 'pause', reason: `${brl(c.spend)} gastos hoje e nenhuma venda real.` });
          }
        }
      }
      if (rule.kind === 'roi_high' && roiOk) {
        const days = Math.max(1, p.days || 2);
        const from = T.addDays(day, -days), to = T.addDays(day, -1);
        const series = await metrics.objectSeries('campaign', camps.map(c => c.id), from, to);
        for (const c of camps) {
          const s = series[c.id] || [];
          const good = s.length >= days && s.every(d => d.roi >= p.roi && d.spend >= tg.cpa_target * 2);
          if (good && c.budget) {
            const pct = Math.min(p.pct || 15, g.max_change_pct);
            const next = Math.round(c.budget * (1 + pct / 100));
            if (next > g.max_campaign_budget) continue;
            await fire(rule, { object: c, action: 'budget', payload: { pct }, reason: `ROI real ${s.map(d => f2(d.roi)).join(' e ')} nos últimos ${days} dias. R$ ${Math.round(c.budget)} → R$ ${next} (+${pct}%).` });
          }
        }
      }
      if (rule.kind === 'fatigue') {
        const ads = (await metrics.objectRows('ad', day, day)).filter(a => a.status === 'ACTIVE');
        const series = await metrics.objectSeries('ad', ads.map(a => a.id), T.addDays(day, -(p.days || 5)), day);
        for (const a of ads) {
          const ft = metrics.fatigue(series[a.id]);
          if (ft.freq >= (p.freq || 3) && ft.ctr_drop >= (p.ctr_drop || 30)) {
            await fire(rule, { object: a, level: 'ad', action: rule.mode === 'notify' ? null : 'pause', title: `${a.name} está cansando`, reason: `Frequência ${f2(ft.freq)} e CTR ${Math.round(ft.ctr_drop)}% menor que há ${p.days || 5} dias (${a.campaign_name}).` });
          }
        }
      }
      if (rule.kind === 'day_roi_low' && roiOk) {
        if (T.parts().hour >= (p.hour || 18)) {
          const [d] = await metrics.daySeries(day, day);
          if (d && d.spend > 0 && d.roi < p.roi) {
            await fire(rule, { object: { id: 'day', name: 'o dia' }, title: `ROI do dia em ${f2(d.roi)}`, reason: `${brl(d.spend)} gastos, ${d.sales} vendas reais, lucro ${brl(d.profit)}.` });
          }
        }
      }
    } catch (err) {
      console.warn(`[rules] ${rule.name}:`, err.message);
    }
  }
  if (!roiOk && camps.length) {
    await notify.alert({ kind: 'coverage', severity: 'info', title: 'Regras de ROI esperando etiquetas', detail: `Só ${Math.round(cov * 100)}% das vendas de hoje vieram com etiqueta do anúncio. Confira os parâmetros de URL das campanhas.`, dedupe: `cov-${day}` });
  }
}

module.exports = { run, coverage };
