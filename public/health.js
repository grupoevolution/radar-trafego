/* Argos — Saúde do app: cada alarme com a causa provável + vendas × app, hora a hora.
   Carregado depois do app.js; usa as funções que ele expõe em window.ARGOS. */
(function () {
'use strict';
const A = window.ARGOS;
const { $, ic, esc, nf, api, shortDay } = A;
const host = () => $('#view') || $('#mBody');
const secs = ms => ms == null ? '—' : (ms / 1000).toFixed(1).replace('.', ',') + 's';
const hh = h => String(h).padStart(2, '0') + 'h';
const APP = { ok: ['good', 'Normal'], atencao: ['warn', 'Atenção'], ruim: ['bad', 'Lento'], sem_dado: ['', 'Sem dado'] };
let day = null, open = {};

function verdict(d) {
  const out = [];
  if (!d.summary.alarms) out.push(`Nenhum alarme ${d.is_today ? 'hoje' : 'neste dia'}.`);
  else out.push(`${d.summary.alarms} alarme(s), somando ${d.summary.slow_minutes} minuto(s) de app lento.`);
  for (const s of d.slumps) {
    const per = s.from === s.to ? `Às ${hh(s.from)}` : `Das ${hh(s.from)} às ${hh(s.to + 1)}`;
    const why = !s.has_data ? 'ainda sem medição do app nesse horário.' : s.app_bad ? 'o app teve lentidão nesse período: pode ter pesado.' : 'o app estava normal: a queda não veio dele.';
    out.push(`${per}: ${nf(s.sales)} venda(s), a média dessas horas é ${nf(s.avg, 1)}. ${why[0].toUpperCase() + why.slice(1)}`);
  }
  return out;
}

function incident(i) {
  const isOpen = !!open[i.id];
  const tone = t => t === 'bad' ? 'down' : t === 'warn' ? 'w' : '';
  return `<div class="card card-b hl-inc">
    <div class="hl-inc-top"><b class="num">${esc(i.time)}</b><span class="faint">${i.mins ? `${nf(i.mins)} min` : 'em andamento'}</span>
      <span class="pill p-${i.errors ? 'bad' : 'warn'}">${i.errors ? `${nf(i.errors)} erros` : 'sem erros'}</span></div>
    <p class="hl-body">${esc(i.body)} · pior resposta ${secs(i.p90_max)} (90% dos pedidos)</p>
    <div class="eyebrow">Causa provável</div>
    <ul class="hl-causes">${i.causes.map(c => `<li class="${tone(c.tone)}">${esc(c.text)}</li>`).join('')}</ul>
    <button class="linkbtn" data-act="hlToggle" data-v="${i.id}">${isOpen ? 'Esconder detalhes' : 'Ver minuto a minuto'}</button>
    ${isOpen ? `<div class="tbl-wrap"><table><thead><tr><th>Hora</th><th class="r">Pedidos</th><th class="r">Fila</th><th class="r">Resposta</th><th class="r">Notificações</th></tr></thead><tbody>
        ${i.minutes.map(m => `<tr><td class="num">${esc(m.time)}</td><td class="r num">${nf(m.reqs)}</td><td class="r num ${m.queue > 12 ? 'down' : ''}">${nf(m.queue)}</td><td class="r num">${secs(m.p90)}</td><td class="r num">${m.pushes == null ? '—' : nf(m.pushes)}</td></tr>`).join('')}
      </tbody></table></div>
      ${i.top.length ? `<div class="eyebrow">Telas que mais pesaram</div><div class="hl-list">${i.top.map(r => `<div><span>${esc(r.rota.replace('/api/user', ''))}</span><span class="num faint">${nf(r.pedidos)} pedidos · média ${secs(r.media_ms)} · até ${secs(r.max_ms)}</span></div>`).join('')}</div>` : ''}
      ${i.admin.length ? `<div class="eyebrow">Painel em uso</div><div class="hl-list">${i.admin.map(r => `<div><span>${esc(r.rota.replace('/api/admin', ''))}</span><span class="num faint">${nf(r.pedidos)} pedidos · até ${secs(r.max_ms)}</span></div>`).join('')}</div>` : ''}
      ${i.running.length ? `<div class="eyebrow">O que o banco rodava na hora</div><div class="hl-list">${i.running.map(q => `<div><code>${esc(q.sql || '')}</code><span class="num faint">${secs(q.ms)}${q.wait ? ' · esperando ' + esc(q.wait) : ''}</span></div>`).join('')}</div>` : ''}` : ''}
  </div>`;
}

function hourRow(h) {
  const a = APP[h.app] || APP.sem_dado;
  return `<tr class="${h.low_sales ? 'hl-low' : ''}"><td class="num">${hh(h.hour)}</td>
    <td class="r num ${h.low_sales ? 'down' : ''}">${nf(h.sales)}</td><td class="r num faint">${nf(h.avg_sales, 1)}</td>
    <td>${a[0] ? `<span class="pill p-${a[0]}">${a[1]}${h.alarms ? ` · ${h.alarms} alarme` : ''}</span>` : `<span class="faint">${a[1]}</span>`}</td>
    <td class="r num">${h.queue_max == null ? '—' : nf(h.queue_max)}</td>
    <td class="r num">${secs(h.probe_max_ms)}</td>
    <td class="r num">${nf(h.pix)}<span class="faint"> / ${nf(h.avg_pix, 0)}</span></td>
    <td class="r num">${nf(h.visitors)}<span class="faint"> / ${nf(h.avg_visitors, 0)}</span></td>
    <td class="r num">R$ ${nf(h.spend)}</td>
    <td class="r num">${h.pushes ? nf(h.pushes) : '—'}</td></tr>`;
}

async function view() {
  const d = await api('/apphealth' + (day ? `?day=${day}` : ''));
  day = d.day;
  if ($('#vSub')) A.sub('O que causou cada alarme e se a venda caiu porque o app travou');
  const s = d.summary, prev = addDay(d.day, -1), next = addDay(d.day, 1);
  host().innerHTML = `<div class="hl-root">
    <div class="toolbar"><button class="btn sm" data-act="hlDay" data-v="${prev}">‹ ${shortDay(prev)}</button><b class="num">${d.is_today ? 'Hoje' : shortDay(d.day)}</b>${d.is_today ? '' : `<button class="btn sm" data-act="hlDay" data-v="${next}">${shortDay(next)} ›</button>`}</div>
    ${!d.raio_x_ready ? `<div class="banner note">${ic('info')}<div><p style="margin:0">O raio-x completo só existe a partir do deploy do app. Os alarmes de antes mostram só parte dos detalhes.</p></div></div>` : ''}
    <div class="hl-kpis">
      ${kpi('Alarmes', nf(s.alarms), s.alarms ? 'down' : 'up')}
      ${kpi('Minutos lentos', nf(s.slow_minutes), s.slow_minutes ? 'w' : 'up')}
      ${kpi('Pior fila no banco', nf(s.queue_max), s.queue_max > 12 ? 'w' : 'up')}
      ${kpi('Pior abertura, testada de fora', s.probe_max_ms ? secs(s.probe_max_ms) : '—', s.probe_max_ms >= 8000 ? 'down' : '')}
    </div>
    <div class="card card-b hl-verdict"><div class="eyebrow">Resumo</div>${verdict(d).map(t => `<p>${esc(t)}</p>`).join('')}</div>
    ${d.incidents.length ? `<div class="eyebrow">Alarmes</div>${d.incidents.map(incident).join('')}` : ''}
    <div class="eyebrow">Vendas × app, hora a hora</div>
    <div class="card"><div class="tbl-wrap"><table class="hl-hours"><thead><tr><th>Hora</th><th class="r">Vendas</th><th class="r">Média 7d</th><th>App</th><th class="r">Fila</th><th class="r">Abertura</th><th class="r">Pix / média</th><th class="r">Entradas / média</th><th class="r">Gasto</th><th class="r">Notif.</th></tr></thead>
      <tbody>${d.hours.map(hourRow).join('') || '<tr><td colspan="10" class="faint">Sem dados.</td></tr>'}</tbody></table></div></div>
    <p class="faint hl-note">Vermelho = hora com menos de 60% das vendas da média dos 7 dias anteriores. Abertura = pior tempo do teste que o Argos faz de fora a cada minuto, como um lead.</p>
  </div>`;
}
const kpi = (l, v, cls) => `<div class="card kpi"><span class="eyebrow">${esc(l)}</span><div class="v ${cls || ''}">${v}</div></div>`;
function addDay(d, n) { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }

Object.assign(A.ACT, {
  hlDay(el) { day = el.dataset.v; open = {}; return view(); },
  hlToggle(el) { open[el.dataset.v] = !open[el.dataset.v]; return view(); }
});
A.RENDER.saude = view;
})();
