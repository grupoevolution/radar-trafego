// lib/appdata.js — lê o app de membros (SÓ LEITURA) e guarda o resumo no Radar
//
// Definições (as mesmas do Dashboard do app, pra os números baterem):
//   entrou no app   = pessoa única com session_start no dia (e-mail ou visitor_id)
//   conversou       = pessoa única que mandou mensagem em algum chat
//   clicou comprar  = e-mail único em checkout_intents
//   gerou Pix       = Pix pendente avisado pela Kirvano (pix_pending_notices)
//   venda real      = AVISO de venda aprovada que o gateway mandou (webhook_logs), sem duplicar
//                     (gateway + sale_id) — igual à Andrômeda: conta Pix, cartão, Google Pay, recompra
//                     do mesmo produto e produto que nem existe no app (a tabela de acessos perdia esses)
//   faturamento     = valor LÍQUIDO do próprio aviso (comissão = o que cai pro produtor); sem ele, o bruto
//   etiqueta        = ad_attributions (utm do link do anúncio) do comprador
const appdb = require('../appdb');
const db = require('../db');

const TZ = 'America/Sao_Paulo';
const WIN = (col, a = '$1', b = '$2') =>
  `${col} >= ((${a}::date)::timestamp AT TIME ZONE '${TZ}') AND ${col} < (((${b}::date) + 1)::timestamp AT TIME ZONE '${TZ}')`;
const IDENT = `COALESCE(LOWER(customer_email), metadata->>'vid', metadata->>'visitor_id')`;
const HOUR = col => `EXTRACT(HOUR FROM ${col} AT TIME ZONE '${TZ}')::int`;
const DAYOF = col => `(${col} AT TIME ZONE '${TZ}')::date`;
// número de um campo do aviso: aceita 12.5, "12.50" e "R$ 12,50"
const NUM = x => `(CASE WHEN ${x} ~ ',' THEN NULLIF(REPLACE(REGEXP_REPLACE(${x}, '[^0-9,-]', '', 'g'), ',', '.'), '')
                        ELSE NULLIF(REGEXP_REPLACE(${x}, '[^0-9.-]', '', 'g'), '') END)::numeric`;
const P = k => `raw_payload #>> '{${k}}'`;
const NET = `COALESCE(${NUM(P('fiscal,commission'))}, ${NUM(P('commission'))}, ${NUM(P('fiscal,total_commissions'))}, ${NUM(P('commission_amount'))},
                      ${NUM(P('fiscal,total_value'))}, ${NUM(P('total_price'))}, ${NUM(P('sale_amount'))}, 0)`;
const KIND = `UPPER(COALESCE(event_type, raw_payload->>'sale_status_enum_key', raw_payload->>'status', ''))`;
// aviso confiável: assinatura válida OU o app aceitou e processou (aviso forjado fica de fora)
const OK = `(signature_valid IS TRUE OR processed IS TRUE)`;
const EVENTS = (kinds, a, b) => `
  SELECT DISTINCT ON (gateway, COALESCE(sale_id, 'wl_' || id))
         LOWER(COALESCE(customer_email, raw_payload #>> '{customer,email}', raw_payload #>> '{customer,email_address}')) AS email,
         ${NET}::float AS amount, received_at AS granted_at
  FROM webhook_logs
  WHERE ${WIN('received_at', a, b)} AND ${OK} AND (${kinds})
  ORDER BY gateway, COALESCE(sale_id, 'wl_' || id), received_at`;
const SALES = (a = '$1', b = '$2') => EVENTS(`${KIND} LIKE '%APPROVED%'`, a, b);
const REFUNDS = (a = '$1', b = '$2') => EVENTS(`${KIND} LIKE '%REFUND%' OR ${KIND} LIKE '%CHARGEBACK%'`, a, b);

// resiliente: se uma consulta falhar (tabela diferente, timeout), as outras seguem
async function q(sql, params) {
  try { return (await appdb.read(sql, params)).rows; }
  catch (err) { console.warn('[appdata] consulta falhou:', err.message.slice(0, 160)); return null; }
}

async function dayTotals(day) {
  const p = [day, day];
  const [v, c, k, x, s, r, t] = await Promise.all([
    q(`SELECT COUNT(DISTINCT ${IDENT})::int AS n FROM tracking_events WHERE event_type = 'session_start' AND ${WIN('created_at')}`, p),
    q(`SELECT COUNT(DISTINCT COALESCE(LOWER(s.customer_email), s.visitor_id))::int AS n
       FROM chat_messages m JOIN chat_sessions s ON s.id = m.session_id
       WHERE m.sender = 'user' AND ${WIN('m.created_at')}`, p),
    q(`SELECT COUNT(DISTINCT LOWER(customer_email))::int AS n FROM checkout_intents WHERE ${WIN('created_at')}`, p),
    q(`SELECT COUNT(*)::int AS n FROM pix_pending_notices WHERE ${WIN('created_at')}`, p),
    q(`SELECT COUNT(*)::int AS n, COALESCE(SUM(amount), 0)::float AS gross FROM (${SALES()}) s`, p),
    q(`SELECT COUNT(*)::int AS n, COALESCE(SUM(amount), 0)::float AS gross FROM (${REFUNDS()}) z`, p),
    q(`SELECT COUNT(*)::int AS n FROM ad_attributions WHERE (fbclid IS NOT NULL OR utm_campaign IS NOT NULL) AND ${WIN('created_at')}`, p),
  ]);
  const n = rows => rows && rows[0] ? rows[0].n : 0;
  return {
    day,
    visitors: n(v), chatted: n(c), checkout: n(k), pix: n(x),
    sales: n(s), revenue: s && s[0] ? s[0].gross : 0,
    refunds: n(r), refund_value: r && r[0] ? r[0].gross : 0,
    tagged_visitors: n(t)
  };
}

async function dayHourly(day) {
  const p = [day, day];
  const [v, c, k, x, s] = await Promise.all([
    q(`SELECT ${HOUR('created_at')} AS h, COUNT(DISTINCT ${IDENT})::int AS n FROM tracking_events WHERE event_type = 'session_start' AND ${WIN('created_at')} GROUP BY 1`, p),
    q(`SELECT ${HOUR('m.created_at')} AS h, COUNT(DISTINCT COALESCE(LOWER(s.customer_email), s.visitor_id))::int AS n
       FROM chat_messages m JOIN chat_sessions s ON s.id = m.session_id WHERE m.sender = 'user' AND ${WIN('m.created_at')} GROUP BY 1`, p),
    q(`SELECT ${HOUR('created_at')} AS h, COUNT(DISTINCT LOWER(customer_email))::int AS n FROM checkout_intents WHERE ${WIN('created_at')} GROUP BY 1`, p),
    q(`SELECT ${HOUR('created_at')} AS h, COUNT(*)::int AS n FROM pix_pending_notices WHERE ${WIN('created_at')} GROUP BY 1`, p),
    q(`SELECT ${HOUR('granted_at')} AS h, COUNT(*)::int AS n, COALESCE(SUM(amount), 0)::float AS gross FROM (${SALES()}) s GROUP BY 1`, p),
  ]);
  const hours = Array.from({ length: 24 }, (_, h) => ({ day, hour: h, visitors: 0, chatted: 0, checkout: 0, pix: 0, sales: 0, revenue: 0 }));
  const fill = (rows, key, val = 'n') => (rows || []).forEach(r => { if (hours[r.h]) hours[r.h][key] = r[val]; });
  fill(v, 'visitors'); fill(c, 'chatted'); fill(k, 'checkout'); fill(x, 'pix'); fill(s, 'sales'); fill(s, 'revenue', 'gross');
  return hours;
}

// vendas reais e entradas por etiqueta do link (utm). Cada venda conta 1x,
// na etiqueta mais recente do comprador (clique do Face tem prioridade).
async function dayAttrib(day) {
  const p = [day, day];
  const sales = await q(`
    WITH s AS (${SALES()}),
    a AS (
      SELECT DISTINCT ON (LOWER(email)) LOWER(email) AS email, utm_campaign, utm_medium, utm_content, utm_term
      FROM ad_attributions
      WHERE email IS NOT NULL AND LOWER(email) IN (SELECT email FROM s)
      ORDER BY LOWER(email), (utm_campaign IS NOT NULL) DESC, (fbclid IS NOT NULL) DESC, updated_at DESC
    ),
    j AS (SELECT s.amount, a.utm_campaign, a.utm_medium, a.utm_content, a.utm_term FROM s JOIN a ON a.email = s.email)
    SELECT 'campaign' AS kind, utm_campaign AS key, COUNT(*)::int AS n, SUM(amount)::float AS gross FROM j WHERE utm_campaign IS NOT NULL GROUP BY 2
    UNION ALL SELECT 'adset', utm_medium, COUNT(*)::int, SUM(amount)::float FROM j WHERE utm_medium IS NOT NULL GROUP BY 2
    UNION ALL SELECT 'ad', utm_content, COUNT(*)::int, SUM(amount)::float FROM j WHERE utm_content IS NOT NULL GROUP BY 2
    UNION ALL SELECT 'placement', LOWER(utm_term), COUNT(*)::int, SUM(amount)::float FROM j WHERE utm_term IS NOT NULL GROUP BY 2`, p);
  const visits = await q(`
    WITH v AS (SELECT utm_campaign, utm_medium, utm_content, utm_term FROM ad_attributions WHERE ${WIN('created_at')})
    SELECT 'campaign' AS kind, utm_campaign AS key, COUNT(*)::int AS n FROM v WHERE utm_campaign IS NOT NULL GROUP BY 2
    UNION ALL SELECT 'adset', utm_medium, COUNT(*)::int FROM v WHERE utm_medium IS NOT NULL GROUP BY 2
    UNION ALL SELECT 'ad', utm_content, COUNT(*)::int FROM v WHERE utm_content IS NOT NULL GROUP BY 2
    UNION ALL SELECT 'placement', LOWER(utm_term), COUNT(*)::int FROM v WHERE utm_term IS NOT NULL GROUP BY 2`, p);
  if (sales === null && visits === null) return null;
  const map = new Map();
  const k = r => r.kind + '|' + r.key;
  for (const r of visits || []) map.set(k(r), { day, kind: r.kind, key: r.key, visitors: r.n, sales: 0, revenue: 0 });
  for (const r of sales || []) {
    const cur = map.get(k(r)) || { day, kind: r.kind, key: r.key, visitors: 0, sales: 0, revenue: 0 };
    cur.sales = r.n; cur.revenue = r.gross; map.set(k(r), cur);
  }
  return [...map.values()];
}

// recompra: faturamento do dia + o que os compradores daquele dia gastaram depois
async function cohort(from, to) {
  return q(`
    WITH sales AS (
      SELECT email, amount, ${DAYOF('granted_at')} AS day FROM (${SALES('$1', '($2::date + 30)')}) z
    ),
    b AS (SELECT DISTINCT day, email FROM sales WHERE day BETWEEN $1::date AND $2::date),
    d0 AS (SELECT day, SUM(amount)::float AS rev FROM sales WHERE day BETWEEN $1::date AND $2::date GROUP BY 1),
    ex AS (
      SELECT b.day,
             COALESCE(SUM(s.amount) FILTER (WHERE s.day <= b.day + 7), 0)::float AS e7,
             COALESCE(SUM(s.amount), 0)::float AS e30
      FROM b JOIN sales s ON s.email = b.email AND s.day > b.day AND s.day <= b.day + 30
      GROUP BY 1
    )
    SELECT to_char(d0.day, 'YYYY-MM-DD') AS day, d0.rev AS d0, d0.rev + COALESCE(ex.e7, 0) AS d7, d0.rev + COALESCE(ex.e30, 0) AS d30
    FROM d0 LEFT JOIN ex ON ex.day = d0.day ORDER BY 1`, [from, to]);
}

// ── grava no banco do Radar ─────────────────────────────────────────────
async function syncDay(day, { withAttrib = true } = {}) {
  const t = await dayTotals(day);
  await db.query(
    `INSERT INTO app_daily (day, visitors, chatted, checkout, pix, sales, revenue, refunds, refund_value, tagged_visitors, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
     ON CONFLICT (day) DO UPDATE SET visitors=$2, chatted=$3, checkout=$4, pix=$5, sales=$6, revenue=$7,
       refunds=$8, refund_value=$9, tagged_visitors=$10, updated_at=NOW()`,
    [day, t.visitors, t.chatted, t.checkout, t.pix, t.sales, t.revenue, t.refunds, t.refund_value, t.tagged_visitors]);
  const hours = await dayHourly(day);
  for (const h of hours) {
    await db.query(
      `INSERT INTO app_hourly (day, hour, visitors, chatted, checkout, pix, sales, revenue) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (day, hour) DO UPDATE SET visitors=$3, chatted=$4, checkout=$5, pix=$6, sales=$7, revenue=$8`,
      [day, h.hour, h.visitors, h.chatted, h.checkout, h.pix, h.sales, h.revenue]);
  }
  if (withAttrib) {
    const rows = await dayAttrib(day);
    if (rows) {
      await db.transaction(async c => {
        await c.query('DELETE FROM app_attrib WHERE day = $1', [day]);
        for (const r of rows) {
          await c.query('INSERT INTO app_attrib (day, kind, key, visitors, sales, revenue) VALUES ($1,$2,$3,$4,$5,$6)',
            [day, r.kind, String(r.key).slice(0, 300), r.visitors, r.sales, r.revenue]);
        }
      });
    }
  }
  return t;
}

async function syncCohort(from, to) {
  const rows = await cohort(from, to);
  if (!rows) return;
  for (const r of rows) {
    await db.query(
      `INSERT INTO app_cohort (day, rev_d0, rev_d7, rev_d30, updated_at) VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (day) DO UPDATE SET rev_d0=$2, rev_d7=$3, rev_d30=$4, updated_at=NOW()`,
      [r.day, r.d0, r.d7, r.d30]);
  }
}

module.exports = { dayTotals, dayHourly, dayAttrib, cohort, syncDay, syncCohort };
