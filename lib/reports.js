// lib/reports.js — a análise diária do Claude
//
// Fluxo (todo dia às 07:00, rotina na nuvem):
//   1) Claude lê  GET /api/claude/snapshot   (Face + app + vendas, já cruzados)
//   2) Claude escreve a análise e publica  POST /api/reports  (JSON abaixo)
//   3) o Radar guarda, transforma sugestões em botões "Aprovar" e manda
//      a notificação pro celular.
const db = require('../db');
const T = require('./time');
const settings = require('./settings');
const metrics = require('./metrics');
const actions = require('./actions');
const notify = require('./notify');

const r2 = v => Math.round((Number(v) || 0) * 100) / 100;
const r1 = v => Math.round((Number(v) || 0) * 10) / 10;

function compactDay(d) {
  return {
    day: d.day, spend: r2(d.spend), impressions: Math.round(d.impressions), cpm: r2(d.cpm), clicks: Math.round(d.clicks), ctr: r2(d.ctr), cpc: r2(d.cpc),
    visitors: d.visitors, arrival_pct: r1(d.arrival), chatted: d.chatted, chat_pct: r1(d.chat_rate), checkout: d.checkout, checkout_pct: r1(d.checkout_rate),
    pix: d.pix, pix_pct: r1(d.pix_rate), sales: d.sales, pay_pct: r1(d.pay_rate), conv_pct: r2(d.conv), revenue: r2(d.revenue), ticket: r2(d.ticket),
    roi_real: r2(d.roi), roi_face: r2(d.roi_face), fb_purchases: d.fb_purchases, cpa_real: r2(d.cpa), refunds: d.refunds, profit: r2(d.profit)
  };
}

// por BM: gasto do dia e dos 7 dias, vendas com etiqueta, contas ativas
async function byBm(day, from7) {
  const { rows } = await db.query(`
    SELECT b.id, b.name,
      COUNT(DISTINCT a.id) FILTER (WHERE a.account_status = 1)::int accounts_active, COUNT(DISTINCT a.id)::int accounts_total,
      COALESCE((SELECT SUM(f.spend) FROM fb_daily f JOIN ad_accounts x ON x.id = f.object_id WHERE f.level='account' AND x.bm_id = b.id AND f.day = $1),0)::float spend_day,
      COALESCE((SELECT SUM(f.spend) FROM fb_daily f JOIN ad_accounts x ON x.id = f.object_id WHERE f.level='account' AND x.bm_id = b.id AND f.day BETWEEN $2 AND $1),0)::float spend_7d,
      COALESCE((SELECT SUM(t.sales) FROM app_attrib t WHERE t.kind='campaign' AND t.day = $1 AND t.key IN (SELECT c.id FROM campaigns c JOIN ad_accounts y ON y.id=c.account_id WHERE y.bm_id=b.id)),0)::int tagged_sales_day,
      COALESCE((SELECT SUM(t.revenue) FROM app_attrib t WHERE t.kind='campaign' AND t.day = $1 AND t.key IN (SELECT c.id FROM campaigns c JOIN ad_accounts y ON y.id=c.account_id WHERE y.bm_id=b.id)),0)::float tagged_revenue_day
    FROM bms b LEFT JOIN ad_accounts a ON a.bm_id = b.id GROUP BY b.id ORDER BY b.name`, [day, from7]);
  return rows.map(r => ({ ...r, spend_day: r2(r.spend_day), spend_7d: r2(r.spend_7d), tagged_revenue_day: r2(r.tagged_revenue_day) }));
}

// meta do mês do dia analisado + quanto já foi feito
async function monthGoal(day) {
  const month = day.slice(0, 7);
  const { rows } = await db.query('SELECT invest, sales, revenue, profit, roi, notes FROM goals WHERE month = $1', [month]);
  const sum = await metrics.sumDays(await metrics.daySeries(month + '-01', day));
  return { month, goal: rows[0] || null, done_until_day: { invest: r2(sum.spend), cost_with_tax: r2(sum.cost), sales: sum.sales, revenue: r2(sum.revenue), profit: r2(sum.profit), roi_real: r2(sum.roi) } };
}

async function snapshot(day) {
  const from14 = T.addDays(day, -13), from7 = T.addDays(day, -6);
  const s = await settings.all();
  const days = (await metrics.daySeries(from14, day)).map(compactDay);
  const last7 = days.slice(-8, -1); // os 7 dias ANTES do dia analisado
  const avg = k => r2(last7.reduce((a, d) => a + (Number(d[k]) || 0), 0) / Math.max(1, last7.length));
  const camps = await metrics.objectRows('campaign', day, day);
  const cser = await metrics.objectSeries('campaign', camps.map(c => c.id), from7, day);
  const ads = (await metrics.objectRows('ad', from7, day)).filter(a => a.spend > 0);
  const aser = await metrics.objectSeries('ad', ads.map(a => a.id), from7, day);
  const { rows: accs } = await db.query(`SELECT a.id, a.name, a.account_status, a.is_reserve, b.name bm, a.status_changed_at FROM ad_accounts a LEFT JOIN bms b ON b.id = a.bm_id ORDER BY a.name`);
  const { rows: notes } = await db.query(`SELECT to_char(day,'YYYY-MM-DD') AS day, title, detail FROM notes WHERE day >= $1 ORDER BY day DESC`, [T.addDays(day, -30)]);
  const { rows: acts } = await db.query(`SELECT object_name, action, status, reason, source, created_at FROM actions WHERE created_at > NOW() - INTERVAL '3 days' ORDER BY created_at DESC LIMIT 30`);
  const { rows: alerts } = await db.query(`SELECT title, detail, severity, created_at FROM alerts WHERE created_at > NOW() - INTERVAL '48 hours' ORDER BY created_at DESC LIMIT 20`);
  const { rows: cov } = await db.query(`SELECT (SELECT COALESCE(SUM(sales),0) FROM app_attrib WHERE day=$1 AND kind='campaign')::int tagged, (SELECT COALESCE(sales,0) FROM app_daily WHERE day=$1)::int total`, [day]);
  return {
    about: 'Argos — dados do Face (todas as BMs) cruzados com o app de membros e as vendas reais da Kirvano. ROI real = faturamento real / (gasto + imposto sobre o investido, targets.tax_pct). "face" = o que o Gerenciador mostra (inflado por pixels duplicados). Só contas ativas aparecem em campanhas/anúncios; o gasto total do dia inclui contas que caíram no dia. Vendas por campanha/BM só existem quando o link tem utm_campaign={{campaign.id}} (campanhas antigas não têm). Horário de Brasília.',
    day, generated_at: new Date().toISOString(), demo: process.env.DEMO_MODE === '1',
    targets: s.targets,
    attribution_coverage: { tagged_sales: cov[0].tagged, total_sales: cov[0].total },
    days,
    avg_7d: { cpm: avg('cpm'), ctr: avg('ctr'), arrival_pct: avg('arrival_pct'), chat_pct: avg('chat_pct'), checkout_pct: avg('checkout_pct'), pix_pct: avg('pix_pct'), pay_pct: avg('pay_pct'), conv_pct: avg('conv_pct'), ticket: avg('ticket'), roi_real: avg('roi_real'), profit: avg('profit'), spend: avg('spend') },
    hourly: (await metrics.hourly(day)).filter(h => h.has).map(h => ({ hour: h.hour, spend: r2(h.spend), revenue: r2(h.revenue), sales: h.sales, visitors: h.visitors })),
    campaigns: camps.filter(c => c.spend > 0 || c.status === 'ACTIVE').map(c => ({
      id: c.id, name: c.name, account: c.account_name, bm: c.bm_name, status: c.status, days_on: c.days_on, budget: c.budget, active_ads: c.active_ads,
      spend: r2(c.spend), cpm: r2(c.cpm), ctr: r2(c.ctr), frequency: r2(c.frequency), clicks: c.clicks, visitors: c.visitors,
      sales_real: c.sales, sales_face: c.fb_purchases, cpa_real: c.cpa ? r2(c.cpa) : null, roi_real: r2(c.roi), roi_face: r2(c.roi_face),
      last7: (cser[c.id] || []).map(x => ({ day: x.day, spend: r2(x.spend), roi: r2(x.roi), ctr: r2(x.ctr), freq: r2(x.freq) }))
    })),
    ads_7d: ads.sort((a, b) => b.spend - a.spend).slice(0, 40).map(a => {
      const sr = aser[a.id] || [];
      const ft = metrics.fatigue(sr);
      return { id: a.id, name: a.name, campaign: a.campaign_name, account: a.account_name, bm: a.bm_name, status: a.status, days_on: a.days_on, spend: r2(a.spend), ctr: r2(a.ctr), cpc: r2(a.cpc), sales_face: a.fb_purchases, cpa_face: a.cpa_face ? r2(a.cpa_face) : null, sales_real: a.sales, roi_real: r2(a.roi), thumb: a.thumb_url || null, ctr_by_day: sr.map(x => r2(x.ctr)), freq_by_day: sr.map(x => r2(x.freq)), fatigue_score: ft.score, ctr_drop_pct: Math.round(ft.ctr_drop) };
    }),
    placements_day: (await metrics.placements(day, day)).map(p => ({ name: p.name, share_pct: r1(p.share), cpm: r2(p.cpm), ctr: r2(p.ctr), conv_pct: r2(p.conv), roi_real: r2(p.roi), has_sales_tag: p.has_sales })),
    placements_7d: (await metrics.placements(from7, day)).map(p => ({ name: p.name, share_pct: r1(p.share), roi_real: r2(p.roi) })),
    budget_active_today: r2(await metrics.budgetToday(null)),
    by_bm: await byBm(day, from7),
    month_goal: await monthGoal(day),
    accounts: accs, notes, recent_actions: acts, recent_alerts: alerts,
    report_format: 'GET /api/claude/guide'
  };
}

const TONES = ['good', 'gold', 'warn', 'bad', 'face', 'info'];
const str = (v, max = 400) => (v === undefined || v === null ? '' : String(v).slice(0, max));

async function create(body) {
  if (!body || !body.title) throw Object.assign(new Error('Falta "title"'), { status: 400 });
  const day = T.isDay(body.day) ? body.day : T.yesterday();
  const c = body.content || body;
  const content = {
    kpis: (c.kpis || []).slice(0, 6).map(k => ({ label: str(k.label, 40), value: str(k.value, 20), note: str(k.note, 60), tone: TONES.includes(k.tone) ? k.tone : 'face' })),
    changes: (c.changes || []).slice(0, 6).map(k => ({ title: str(k.title, 60), value: str(k.value, 20), note: str(k.note, 100), tone: TONES.includes(k.tone) ? k.tone : 'warn', series: (k.series || []).slice(-14).map(Number).filter(Number.isFinite), hint: str(k.hint, 140) })),
    normal: (c.normal || []).slice(0, 10).map(x => str(x, 40)),
    campaigns: (c.campaigns || []).slice(0, 20).map(k => ({ id: str(k.id, 40), suggestion: str(k.suggestion, 60), tone: TONES.includes(k.tone) ? k.tone : 'gold', action: k.action && ['pause', 'activate', 'budget'].includes(k.action.type) ? { type: k.action.type, pct: Number(k.action.pct) || undefined, value: Number(k.action.value) || undefined } : null })),
    analysis: (Array.isArray(c.analysis) ? c.analysis : [c.analysis]).filter(Boolean).slice(0, 8).map(x => str(x, 2000)),
    todo: (c.todo || []).slice(0, 10).map(x => str(x, 200))
  };
  const { rows } = await db.query('INSERT INTO reports (day, title, summary, content, source) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [day, str(body.title, 200), str(body.summary, 300), content, body.source === 'demo' ? 'demo' : 'claude']);
  const id = rows[0].id;
  let made = 0;
  for (const k of content.campaigns) {
    if (!k.action) continue;
    try {
      const a = await actions.request({
        source: 'report', report_id: id, level: 'campaign', object_id: k.id,
        action: k.action.type, payload: { pct: k.action.pct, value: k.action.value }, reason: `Sugestão do relatório: ${k.suggestion}`,
        dedupe: `report-${id}-${k.id}`, pushIt: false
      });
      if (a) made++;
    } catch (err) { console.warn('[reports] sugestão ignorada:', k.id, err.message); }
  }
  await notify.push('report', 'Análise do dia', str(body.summary || body.title, 180), '/#rel');
  return { ok: true, id, actions_created: made };
}

async function full(id) {
  const { rows } = await db.query(`SELECT id, to_char(day,'YYYY-MM-DD') AS day, title, summary, content, source, created_at FROM reports WHERE id = $1`, [id]);
  const r = rows[0];
  if (!r) throw Object.assign(new Error('Relatório não encontrado'), { status: 404 });
  const from7 = T.addDays(r.day, -6);
  r.days7 = (await metrics.daySeries(from7, r.day)).map(compactDay);
  const ids = (r.content.campaigns || []).map(c => c.id);
  if (ids.length) {
    const rowsC = await metrics.objectRows('campaign', r.day, r.day);
    const ser = await metrics.objectSeries('campaign', ids, from7, r.day);
    const { rows: acts } = await db.query(`SELECT id, object_id, status, error FROM actions WHERE report_id = $1`, [r.id]);
    r.content.campaigns = r.content.campaigns.map(c => {
      const o = rowsC.find(x => x.id === c.id) || {};
      const a = acts.find(x => x.object_id === c.id);
      return { ...c, name: o.name || c.id, days_on: o.days_on, roi: o.roi, status: o.status, series: (ser[c.id] || []).map(s => r2(s.roi)), action_id: a && a.id, action_status: a && a.status };
    });
  }
  return r;
}

const GUIDE = `RADAR — como publicar a análise diária

1) Leia os dados:
   GET /api/claude/snapshot?day=AAAA-MM-DD   (padrão: ontem)
   Cabeçalho: Authorization: Bearer <CLAUDE_API_KEY>

2) Analise como um gestor de tráfego sênior:
   - Compare o dia com a véspera e com a média dos 7 dias (avg_7d).
   - Fale SÓ do que mudou de verdade. O que ficou normal vai em "normal" (uma etiqueta curta cada).
   - Separe "o Face piorou" (CPM, CTR, chegada) de "o app/oferta piorou" (conversa, clique em comprar, Pix, pagamento, ticket).
   - Campanha por campanha: há quantos dias está no ar, ROI real dos 7 dias, cansaço das imagens (ads_7d).
   - Se attribution_coverage.tagged_sales for bem menor que total_sales, avise que o ROI por campanha está incompleto.
   - Sempre em português simples, frases curtas, números com vírgula (1,35) e R$.

3) Publique:
   POST /api/reports   (mesmo cabeçalho; Content-Type: application/json)
   {
     "day": "AAAA-MM-DD",
     "title": "Frase-manchete do dia (até 120 caracteres)",
     "summary": "Uma linha pra notificação do celular",
     "content": {
       "kpis":    [{"label":"ROI real","value":"1,05","note":"média 7d 1,41","tone":"bad"}],          // 4 itens
       "changes": [{"title":"Pix pago caiu","value":"38%","note":"média 7d 59%","tone":"bad","series":[61,58,57,60,59,62,38],"hint":"o que provavelmente causou"}],
       "normal":  ["CPM R$ 23,00","CTR 8,8%"],
       "campaigns": [{"id":"<id da campanha>","suggestion":"Subir +15%","tone":"good","action":{"type":"budget","pct":15}},
                     {"id":"<id>","suggestion":"Desligar","tone":"bad","action":{"type":"pause"}},
                     {"id":"<id>","suggestion":"Manter","tone":"gold"}],
       "analysis": ["parágrafo 1", "parágrafo 2"],
       "todo": ["ação concreta 1", "ação concreta 2"]
     }
   }
   tone: good | gold | warn | bad | face | info
   action (opcional) vira um botão "Aprovar" no Argos: type = pause | activate | budget (pct ou value em R$).
   Respeite a trava de no máximo 20% de mudança de orçamento.
`;

module.exports = { snapshot, create, full, GUIDE };
