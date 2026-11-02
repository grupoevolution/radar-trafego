/* Argos — Laboratório de Criativos (Campeões · Imagens · Testes) + Estúdio (editor de criativo no navegador).
   Carregado depois do app.js; usa as funções que ele expõe em window.ARGOS. */
(function () {
'use strict';
const A = window.ARGOS;
const { $, $$, ic, esc, nf, brl, f2, api, toast, sheet } = A;

const W = 1080, H1 = 1080, H2 = 1920;
const GREEN = '#25D366';
const BANDS = [['#25D366', 'Verde'], ['#FFC21A', 'Amarelo'], ['#E8212E', 'Vermelho'], ['#111111', 'Preto']];
const FONTS = [['Archivo Black', 'Grossa (padrão)'], ['Anton', 'Alta e fina'], ['Montserrat', 'Redonda']];
const TERMS = ['Casada', 'Solteira', 'Divorciada', 'Viúva'];
const ST = { pronto: ['info', 'Pronto pra subir'], testando: ['warn', 'Testando'], campeao: ['good', 'Campeão'], morreu: ['bad', 'Morreu'] };
const DEF = { line1: '2 KM DE VOCÊ!', line2: 'Eliene 36, Casada!', band: 'CLICA NO BOTÃO', pin: true, wa: true, arrow: true, flip: false, pure: false, pos: 'baixo', fy: 0.2, color: GREEN, font: 'Archivo Black', size: 100 };

let LAB = null, tab = 'campeoes', imgSub = 'todas', tstSt = 'todos';
const url = (it, v) => `/api/lab/file/${it.id}/${v}?v=${new Date(it.updated_at).getTime()}`;
const has = (it, v) => (it.files || []).some(f => f.variant === v);
const thumbV = it => has(it, '1x1') ? '1x1' : has(it, 'orig') ? 'orig' : '9x16';
const termOf = s => (TERMS.find(t => new RegExp(t.normalize('NFD').replace(/[̀-ͯ]/g, ''), 'i').test(String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, ''))) || null);

/* ───────── leitura de arquivo → JPEG reduzido (dataURL) ───────── */
function loadImg(src) { return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('Não consegui abrir a imagem')); i.src = src; }); }
async function fileToJpeg(file, max = 1600) {
  const src = URL.createObjectURL(file);
  try {
    const im = await loadImg(src);
    const r = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * r); c.height = Math.round(im.naturalHeight * r);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    return { data: c.toDataURL('image/jpeg', 0.9), w: c.width, h: c.height };
  } finally { URL.revokeObjectURL(src); }
}

/* ───────── desenho do criativo (mesmo modelo das campeãs) ───────── */
function cover(ctx, img, w, h, fy, flip) {
  const r = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const iw = img.naturalWidth * r, ih = img.naturalHeight * r;
  const x = (w - iw) / 2, y = -(ih - h) * fy;
  ctx.save();
  if (flip) { ctx.translate(w, 0); ctx.scale(-1, 1); }
  ctx.drawImage(img, x, y, iw, ih);
  ctx.restore();
}
function fitFont(ctx, txt, family, px, maxW) {
  let s = px;
  do { ctx.font = `${family === 'Montserrat' ? '900 ' : ''}${s}px "${family}", "Arial Black", Arial, sans-serif`; s -= 2; } while (ctx.measureText(txt).width > maxW && s > 20);
  return s + 2;
}
function stroked(ctx, txt, x, y, lw) { ctx.lineJoin = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = '#000'; ctx.strokeText(txt, x, y); ctx.fillStyle = '#fff'; ctx.fillText(txt, x, y); }
function pin(ctx, cx, cy, s) {
  ctx.fillStyle = '#E61E28';
  ctx.beginPath(); ctx.arc(cx, cy, s, Math.PI * 0.85, Math.PI * 2.15); ctx.lineTo(cx, cy + s * 2.3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#780000'; ctx.beginPath(); ctx.arc(cx, cy, s * 0.38, 0, Math.PI * 2); ctx.fill();
}
function waIcon(ctx, cx, cy, r) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = GREEN; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  const ri = r * 0.68;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(4, r / 9);
  ctx.beginPath(); ctx.arc(cx, cy, ri, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(cx - ri * 0.75, cy + ri * 0.55); ctx.lineTo(cx - ri * 1.05, cy + ri * 1.1); ctx.lineTo(cx - ri * 0.25, cy + ri * 0.92); ctx.closePath(); ctx.fill();
  // fone
  const p = ri * 0.52, lw = Math.max(10, r * 0.2);
  ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, p, Math.PI * 0.55, Math.PI * 1.2); ctx.stroke();
  ctx.lineCap = 'butt';
}
function draw(cv, img, p, h) {
  cv.width = W; cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, h);
  if (!img) { ctx.fillStyle = '#888'; ctx.font = '40px Arial'; ctx.textAlign = 'center'; ctx.fillText('Escolha uma foto', W / 2, h / 2); return; }
  cover(ctx, img, W, h, p.fy, p.flip);
  if (p.pure) return;
  const sq = h === W, k = (p.size || 100) / 100;
  const ty = p.pos === 'cima' ? h * (sq ? 0.17 : 0.2) : p.pos === 'meio' ? h * 0.45 : h * (sq ? 0.6 : 0.6);
  // sombra atrás do texto pra ler bem
  const g = ctx.createLinearGradient(0, ty - h * 0.12, 0, ty + h * (sq ? 0.25 : 0.16));
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.35, 'rgba(0,0,0,.42)'); g.addColorStop(0.75, 'rgba(0,0,0,.42)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, ty - h * 0.12, W, h * (sq ? 0.37 : 0.28));
  ctx.textBaseline = 'middle';
  let y = ty;
  if (p.line1) {
    const s1 = fitFont(ctx, p.line1, p.font, Math.round(92 * k), W * (p.pin ? 0.8 : 0.9));
    const tw = ctx.measureText(p.line1).width, x0 = (W - tw - (p.pin ? 70 : 0)) / 2;
    if (p.pin) pin(ctx, x0 + 26, y - 20, 24 * k);
    ctx.textAlign = 'left'; stroked(ctx, p.line1, x0 + (p.pin ? 70 : 0), y, Math.max(6, s1 * 0.13));
    y += s1 * 0.5 + 44 * k;
  }
  if (p.line2) {
    ctx.textAlign = 'center';
    const s2 = fitFont(ctx, p.line2, p.font === 'Anton' ? 'Anton' : 'Montserrat', Math.round(64 * k), W * 0.9);
    stroked(ctx, p.line2, W / 2, y, Math.max(5, s2 * 0.12));
    y += s2 * 0.5 + 34 * k;
  }
  if (p.band) {
    const fb = fitFont(ctx, p.band, p.font, Math.round(46 * k), W * 0.7);
    const bw = ctx.measureText(p.band).width + (p.arrow ? 110 : 64), bh = fb * 1.55, bx = (W - bw) / 2;
    ctx.fillStyle = p.color; roundRect(ctx, bx, y, bw, bh, 14); ctx.fill();
    const dark = p.color === '#FFC21A';
    ctx.fillStyle = dark ? '#111' : '#fff'; ctx.textAlign = 'left';
    if (!dark) { ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.strokeText(p.band, bx + 30, y + bh / 2); }
    ctx.fillText(p.band, bx + 30, y + bh / 2);
    if (p.arrow) {
      const ax = bx + bw - 50, ay = y + bh / 2; ctx.fillStyle = p.color === '#E8212E' ? '#fff' : '#E61E28';
      ctx.fillRect(ax - 7, ay - 22, 14, 18); ctx.beginPath(); ctx.moveTo(ax - 18, ay - 6); ctx.lineTo(ax + 18, ay - 6); ctx.lineTo(ax, ay + 20); ctx.closePath(); ctx.fill();
    }
  }
  if (p.wa) waIcon(ctx, p.pos === 'cima' ? W * 0.16 : W * 0.84, p.pos === 'cima' ? h * (sq ? 0.86 : 0.76) : h * (sq ? 0.13 : 0.17), 78 * k);
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
let fontsReady = null;
function loadFonts() {
  if (fontsReady) return fontsReady;
  if (!$('#labFonts')) { const l = document.createElement('link'); l.id = 'labFonts'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Montserrat:wght@800;900&display=swap'; document.head.appendChild(l); }
  fontsReady = Promise.all(['92px "Archivo Black"', '92px "Anton"', '900 64px "Montserrat"'].map(f => document.fonts.load(f).catch(() => null))).then(() => true);
  return fontsReady;
}

/* ───────── tela ───────── */
async function view() {
  LAB = await api('/lab');
  if ($('#vSub')) A.sub('Campeões que já venderam · fotos pra criar · criativos em teste ligados às vendas pelo código no nome do anúncio');
  if ($('#topRight')) A.topRight(`<button class="btn sm primary" data-act="labNew">${ic('plus')}Novo criativo</button>`);
  const it = LAB.items;
  const champs = it.filter(x => x.kind === 'campeao' || (x.kind === 'teste' && x.status === 'campeao'))
    .sort((a, b) => (a.rank || 999) - (b.rank || 999) || ((b.result && b.result.sales) || 0) - ((a.result && a.result.sales) || 0) || new Date(b.created_at) - new Date(a.created_at));
  const imgs = it.filter(x => x.kind === 'imagem' && (imgSub === 'todas' || x.sub === imgSub));
  const tests = it.filter(x => x.kind === 'teste' && (tstSt === 'todos' || x.status === tstSt));
  const cnt = { campeoes: champs.length, imagens: it.filter(x => x.kind === 'imagem').length, testes: it.filter(x => x.kind === 'teste').length };
  const R = LAB.rules, wk = LAB.week;
  host().innerHTML = `
  <div class="toolbar"><div class="seg" role="group" aria-label="Aba">${[['campeoes', 'Criativos campeões'], ['imagens', 'Imagens'], ['testes', 'Testes (Estúdio)']].map(([k, l]) => `<button aria-pressed="${tab === k}" data-act="labTab" data-v="${k}">${l} <span class="faint num">${cnt[k]}</span></button>`).join('')}</div></div>
  ${tab === 'campeoes' ? `
    <div class="toolbar"><button class="btn sm" data-act="labUp" data-v="campeao">${ic('plus')}Subir criativo campeão</button>
      <span class="faint" style="font-size:12.5px">Criativo pronto (com texto) que já vendeu. Teste que bater a regra entra aqui sozinho.</span></div>
    ${champs.length ? `<div class="lab-grid">${champs.map(cardChamp).join('')}</div>` : empty('Nenhum campeão ainda. Suba os criativos que mais venderam (pode ser de contas antigas).')}` : ''}
  ${tab === 'imagens' ? `
    <div class="toolbar"><div class="seg small" role="group">${[['todas', 'Todas'], ['campeoes', 'Dos campeões'], ['banco', 'Banco (novas)']].map(([k, l]) => `<button aria-pressed="${imgSub === k}" data-act="labImgSub" data-v="${k}">${l}</button>`).join('')}</div>
      <button class="btn sm" data-act="labUp" data-v="imagem">${ic('plus')}Subir imagens</button>
      <span class="pill ${wk.owner_images >= R.weekly_images ? 'p-good' : 'p-warn'}">Esta semana: ${wk.owner_images} de ${R.weekly_images} imagens suas</span></div>
    ${imgs.length ? `<div class="lab-grid img">${imgs.map(cardImg).join('')}</div>` : empty('Nenhuma imagem aqui. Suba fotos puras (sem texto): as dos campeões e as novas que você acha que dão bom.')}` : ''}
  ${tab === 'testes' ? `
    <div class="banner note">${ic('info')}<div><p style="margin:0">Ao subir no Face, coloque o <b>código</b> (ex.: <b>LAB-012</b>) no <b>nome do anúncio</b>. O Argos liga gasto e vendas reais sozinho. Regra: depois de ${R.min_days} dias, ROI ≥ ${f2(R.win_roi)} e custo por venda ≤ ${brl(R.win_cpa)} → campeão. Gastou ${brl(R.kill_spend)} sem venda → morreu.</p></div></div>
    <div class="toolbar"><div class="seg small" role="group">${[['todos', 'Todos'], ['pronto', 'Prontos'], ['testando', 'Testando'], ['campeao', 'Campeões'], ['morreu', 'Morreram']].map(([k, l]) => `<button aria-pressed="${tstSt === k}" data-act="labTst" data-v="${k}">${l}</button>`).join('')}</div>
      <button class="btn sm primary" data-act="labNew">${ic('plus')}Novo criativo</button></div>
    ${tests.length ? `<div class="lab-grid">${tests.map(cardTest).join('')}</div>` : empty('Nenhum criativo de teste. Toque em "Novo criativo" ou em "Criar criativo" numa imagem.')}` : ''}`;
}
const host = () => $('#view') || $('#mBody'); // PC ou celular
const empty = t => `<div class="card"><div class="empty">${ic('image')}${esc(t)}</div></div>`;
const dlBtns = it => ['1x1', '9x16', 'orig'].filter(v => has(it, v)).map(v => `<a class="btn sm" href="${url(it, v)}&dl=1" download>${ic('download')}${v === '1x1' ? 'Quadrado' : v === '9x16' ? 'Stories' : 'Baixar'}</a>`).join('');
const resLine = r => !r ? '<span class="faint" style="font-size:12px">Sem anúncio com esse código no Face ainda</span>'
  : `<div class="lab-k"><div><small>Gasto</small><b>${brl(r.spend)}</b></div><div><small>Vendas</small><b>${nf(r.sales)}</b></div><div><small>ROI</small><b style="color:${r.roi >= 1.3 ? 'var(--good)' : r.roi >= 1 ? 'var(--warn)' : 'var(--bad)'}">${r.roi == null ? '—' : f2(r.roi)}</b></div><div><small>Custo/venda</small><b>${r.cpa ? brl(r.cpa) : '—'}</b></div><div><small>CTR</small><b>${nf(r.ctr, 1)}%</b></div><div><small>Dias</small><b>${r.days_on}</b></div></div>`;
const period = it => [it.good_from && it.good_to ? `${A.shortDay(it.good_from)} a ${A.shortDay(it.good_to)}` : it.good_from ? `desde ${A.shortDay(it.good_from)}` : '', it.period_note].filter(Boolean).join(' · ');
function cardChamp(it, i) {
  return `<div class="card lab-c"><div class="lab-img" style="background-image:url('${url(it, thumbV(it))}')"><span class="rk">#${i + 1}</span>${has(it, '9x16') && has(it, '1x1') ? '<span class="lab-v">quadrado + stories</span>' : ''}</div>
    <div class="lab-b"><div class="lab-t"><b>${esc(it.title || it.headline || it.code)}</b><span class="faint num">${it.code}</span></div>
      ${it.headline ? `<span class="lab-h">${esc(it.headline)}</span>` : ''}
      ${period(it) ? `<span class="faint" style="font-size:12px">${ic('calendar')}Bom: ${esc(period(it))}</span>` : ''}
      ${it.kind === 'teste' ? resLine(it.result) : ''}
      ${it.tags && it.tags.length ? `<div class="lab-tags">${it.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.notes ? `<p class="faint" style="font-size:12px;margin:0">${esc(it.notes)}</p>` : ''}
      <div class="btns">${dlBtns(it)}<button class="btn sm" data-act="labEdit" data-v="${it.id}">${ic('edit')}Editar</button>${it.kind === 'teste' ? `<button class="btn sm" data-act="labStudio" data-v="${it.id}">${ic('image')}Abrir no Estúdio</button>` : ''}<button class="btn sm danger" data-act="labDel" data-v="${it.id}" aria-label="Apagar">${ic('trash')}</button></div></div></div>`;
}
function cardImg(it) {
  return `<div class="card lab-c"><div class="lab-img tall" style="background-image:url('${url(it, thumbV(it))}')">${it.used ? '<span class="lab-v">já usada</span>' : ''}</div>
    <div class="lab-b"><div class="lab-t"><b>${esc(it.title || it.code)}</b><span class="faint num">${it.code}</span></div>
      <span class="faint" style="font-size:12px">${it.sub === 'campeoes' ? 'Foto de campeão' : 'Banco'} · ${it.added_by === 'claude' ? 'Claude' : 'você'}</span>
      ${it.tags && it.tags.length ? `<div class="lab-tags">${it.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="btns"><button class="btn sm primary" data-act="labNewFrom" data-v="${it.id}">${ic('plus')}Criar criativo</button>${dlBtns(it)}<button class="btn sm" data-act="labEdit" data-v="${it.id}">${ic('edit')}</button><button class="btn sm danger" data-act="labDel" data-v="${it.id}" aria-label="Apagar">${ic('trash')}</button></div></div></div>`;
}
function cardTest(it) {
  const st = ST[it.status] || ST.pronto;
  return `<div class="card lab-c"><div class="lab-pair">${has(it, '1x1') ? `<img loading="lazy" src="${url(it, '1x1')}" alt="">` : ''}${has(it, '9x16') ? `<img loading="lazy" class="st" src="${url(it, '9x16')}" alt="">` : ''}</div>
    <div class="lab-b"><div class="lab-t"><b class="num" style="font-size:16px">${it.code}</b><span class="pill p-${st[0]}">${st[1]}</span></div>
      ${it.headline ? `<span class="lab-h">${esc(it.headline)}</span>` : ''}
      ${it.notes ? `<p class="faint" style="font-size:12px;margin:0">${esc(it.notes)}</p>` : ''}
      ${resLine(it.result)}
      <div class="btns">${dlBtns(it)}<button class="btn sm" data-act="labStudio" data-v="${it.id}">${ic('edit')}Editar</button>
        <select class="btn sm" data-labst="${it.id}" aria-label="Situação">${Object.entries(ST).map(([k, v]) => `<option value="${k}" ${it.status === k ? 'selected' : ''}>${v[1]}</option>`).join('')}</select>
        <button class="btn sm danger" data-act="labDel" data-v="${it.id}" aria-label="Apagar">${ic('trash')}</button></div></div></div>`;
}

/* ───────── subir campeão / imagens ───────── */
function upload(kind) {
  const champ = kind === 'campeao';
  sheet({ title: champ ? 'Subir criativo campeão' : 'Subir imagens', wide: true, ok: 'Subir',
    body: `<p>${champ ? 'Pode mandar o quadrado e o stories juntos: o Argos separa pelo formato.' : 'Fotos puras, sem texto. Pode escolher várias de uma vez.'}</p>
      <div class="field"><label for="lF">Arquivo(s)</label><input id="lF" type="file" accept="image/*" ${champ ? '' : 'multiple'} ${champ ? 'multiple' : ''}></div>
      ${champ ? `<div class="form-row"><div class="field"><label>Nome</label><input name="title" placeholder="Ex.: Carol de óculos"></div><div class="field"><label>Texto do criativo</label><input name="headline" placeholder="Ex.: Carol 26, Solteira!"></div></div>
        <div class="form-row"><div class="field"><label>Período que foi bom</label><input name="period_note" placeholder="Ex.: ~7 dias, set/2026"></div><div class="field"><label>De (opcional)</label><input type="date" name="good_from"></div><div class="field"><label>Até (opcional)</label><input type="date" name="good_to"></div></div>
        <div class="form-row"><div class="field"><label>Posição no ranking</label><input name="rank" type="number" min="1" placeholder="1 = o melhor"></div><div class="field"><label>Observações</label><input name="notes" placeholder="Vendeu muito na conta X…"></div></div>`
      : `<div class="form-row"><div class="field"><label>Pasta</label><select name="sub"><option value="banco">Banco (novas)</option><option value="campeoes">Imagem de campeão</option></select></div><div class="field"><label>Etiquetas (opcional)</label><input name="tags" placeholder="espelho, corpo inteiro…"></div></div>`}`,
    onOk: async v => {
      const fs = [...($('#lF').files || [])];
      if (!fs.length) throw new Error('Escolha pelo menos uma imagem');
      toast('Enviando…');
      if (champ) {
        const files = [];
        for (const f of fs.slice(0, 2)) { const j = await fileToJpeg(f, 1920); files.push({ variant: j.h / j.w > 1.4 ? '9x16' : '1x1', data: j.data }); }
        await api('/lab', { body: { kind: 'campeao', ...v, term: termOf(v.headline), files } });
      } else {
        for (const f of fs) { const j = await fileToJpeg(f, 1600); await api('/lab', { body: { kind: 'imagem', sub: v.sub, tags: v.tags, title: f.name.replace(/\.[^.]+$/, '').slice(0, 60), files: [{ variant: 'orig', data: j.data }] } }); }
      }
      toast(champ ? 'Campeão salvo' : `${fs.length} imagem(ns) salvas`);
      view();
    } });
}

function editMeta(id) {
  const it = LAB.items.find(x => x.id === id); if (!it) return;
  sheet({ title: `Editar ${it.code}`, wide: true, ok: 'Salvar',
    body: `<div class="form-row"><div class="field"><label>Nome</label><input name="title" value="${esc(it.title || '')}"></div>${it.kind !== 'imagem' ? `<div class="field"><label>Texto do criativo</label><input name="headline" value="${esc(it.headline || '')}"></div>` : `<div class="field"><label>Pasta</label><select name="sub"><option value="banco" ${it.sub === 'banco' ? 'selected' : ''}>Banco (novas)</option><option value="campeoes" ${it.sub === 'campeoes' ? 'selected' : ''}>Imagem de campeão</option></select></div>`}</div>
      ${it.kind !== 'imagem' ? `<div class="form-row"><div class="field"><label>Período que foi bom</label><input name="period_note" value="${esc(it.period_note || '')}"></div><div class="field"><label>De</label><input type="date" name="good_from" value="${esc(it.good_from || '')}"></div><div class="field"><label>Até</label><input type="date" name="good_to" value="${esc(it.good_to || '')}"></div></div>
        <div class="form-row"><div class="field"><label>Posição no ranking</label><input name="rank" type="number" min="1" value="${it.rank || ''}"></div></div>` : ''}
      <div class="field"><label>Etiquetas (separadas por vírgula)</label><input name="tags" value="${esc((it.tags || []).join(', '))}"></div>
      <div class="field"><label>Observações</label><input name="notes" value="${esc(it.notes || '')}"></div>`,
    onOk: async v => { if (v.headline !== undefined) v.term = termOf(v.headline); await api('/lab/' + id, { method: 'PATCH', body: v }); toast('Salvo'); view(); } });
}

/* ───────── Estúdio (editor) ───────── */
async function studio({ id, sourceId } = {}) {
  await loadFonts();
  const ed = id ? LAB.items.find(x => x.id === id) : null;
  const p = { ...DEF, ...((ed && ed.params) || {}) };
  let src = sourceId || (ed && ed.source_id) || null, img = null, ownFile = null;
  const pool = LAB.items.filter(x => x.kind === 'imagem' || (x.kind === 'campeao' && !has(x, 'orig')));
  const s = $('#sheet');
  s.innerHTML = `<div class="sheet studio" role="dialog" aria-modal="true"><h3>${ed ? `Editar ${ed.code}` : 'Novo criativo'}</h3>
    <div class="st-wrap"><div class="st-prev"><canvas id="c1"></canvas><canvas id="c2"></canvas></div>
    <div class="st-form">
      <div class="field"><label>Foto</label><div class="st-pick" id="stPick">${pool.filter(x => x.kind === 'imagem').map(x => `<button type="button" data-src="${x.id}" aria-pressed="${x.id === src}" style="background-image:url('${url(x, thumbV(x))}')" title="${esc(x.code)}"></button>`).join('') || '<span class="faint" style="font-size:12px">Sem imagens no banco ainda</span>'}</div>
        <input type="file" id="stFile" accept="image/*"></div>
      <div class="form-row"><div class="field"><label>Linha 1</label><input id="sL1" value="${esc(p.line1)}"></div><div class="field"><label>Linha 2</label><input id="sL2" value="${esc(p.line2)}"></div></div>
      <div class="field"><label>Termo rápido</label><div class="seg small">${TERMS.map(t => `<button type="button" data-term="${t}">${t}</button>`).join('')}</div></div>
      <div class="form-row"><div class="field"><label>Faixa</label><input id="sB" value="${esc(p.band)}"></div><div class="field"><label>Cor da faixa</label><select id="sC">${BANDS.map(([c, l]) => `<option value="${c}" ${p.color === c ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
      <div class="form-row"><div class="field"><label>Fonte</label><select id="sF">${FONTS.map(([f, l]) => `<option value="${f}" ${p.font === f ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div class="field"><label>Texto em</label><select id="sP">${[['baixo', 'Baixo'], ['meio', 'Meio'], ['cima', 'Cima']].map(([k, l]) => `<option value="${k}" ${p.pos === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
      <div class="form-row"><div class="field"><label>Enquadrar foto (cima ↔ baixo)</label><input id="sY" type="range" min="0" max="1" step="0.02" value="${p.fy}"></div><div class="field"><label>Tamanho do texto</label><input id="sS" type="range" min="70" max="130" step="5" value="${p.size}"></div></div>
      <div class="st-checks">${[['flip', 'Inverter foto'], ['pin', 'Alfinete'], ['wa', 'Ícone verde'], ['arrow', 'Seta'], ['pure', 'Só a foto (sem texto)']].map(([k, l]) => `<label><input type="checkbox" id="k_${k}" ${p[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div>
      <div class="field"><label>Observação do teste</label><input id="sN" value="${esc((ed && ed.notes) || '')}" placeholder="Ex.: mesma foto da LAB-003 com Viúva"></div>
    </div></div>
    <div class="err" id="sheetErr"></div>
    <div class="btns"><button class="btn primary" id="stSave">${ic('check')}${ed ? 'Salvar alterações' : 'Salvar criativo'}</button>${ed ? '<button class="btn" id="stCopy">Salvar como novo</button>' : ''}<button class="btn" id="stClose">Fechar</button></div></div>`;
  s.hidden = false;
  const close = () => { s.hidden = true; s.innerHTML = ''; };
  $('#stClose').onclick = close;
  s.onclick = e => { if (e.target === s) close(); };
  const c1 = $('#c1'), c2 = $('#c2');
  const read = () => Object.assign(p, { line1: $('#sL1').value, line2: $('#sL2').value, band: $('#sB').value, color: $('#sC').value, font: $('#sF').value, pos: $('#sP').value, fy: +$('#sY').value, size: +$('#sS').value,
    ...Object.fromEntries(['flip', 'pin', 'wa', 'arrow', 'pure'].map(k => [k, $('#k_' + k).checked])) });
  const redraw = () => { read(); draw(c1, img, p, H1); draw(c2, img, p, H2); };
  const setSrc = async id2 => {
    const x = LAB.items.find(y => y.id === id2); if (!x) return;
    src = id2; ownFile = null; img = await loadImg(url(x, thumbV(x)));
    $$('#stPick button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.src === id2)));
    redraw();
  };
  $$('input,select', s).forEach(el => { if (el.id !== 'stFile') el.addEventListener('input', redraw); });
  $('#stPick').onclick = e => { const b = e.target.closest('[data-src]'); if (b) setSrc(+b.dataset.src); };
  $$('[data-term]', s).forEach(b => b.onclick = () => { const v = $('#sL2'); v.value = /,/.test(v.value) ? v.value.replace(/,.*$/, `, ${b.dataset.term}!`) : `${v.value} ${b.dataset.term}!`; redraw(); });
  $('#stFile').onchange = async e => { const f = e.target.files[0]; if (!f) return; const j = await fileToJpeg(f, 1600); ownFile = j.data; src = null; img = await loadImg(j.data); $$('#stPick button').forEach(b => b.setAttribute('aria-pressed', 'false')); redraw(); };
  if (src) await setSrc(src); else if (ed && has(ed, '1x1')) { /* sem foto de origem: mostra o próprio criativo */ img = null; redraw(); } else redraw();
  const save = async asNew => {
    if (!img) { $('#sheetErr').textContent = 'Escolha uma foto'; return; }
    read();
    $('#stSave').disabled = true;
    try {
      if (ownFile) { // foto subida aqui entra no banco também
        const r = await api('/lab', { body: { kind: 'imagem', sub: 'banco', title: 'Subida no Estúdio', files: [{ variant: 'orig', data: ownFile }] } });
        src = r.id; ownFile = null;
      }
      const files = [{ variant: '1x1', data: c1.toDataURL('image/jpeg', 0.9) }, { variant: '9x16', data: c2.toDataURL('image/jpeg', 0.88) }];
      const body = { params: { ...p }, headline: p.pure ? '(só a foto)' : p.line2, term: p.pure ? null : termOf(p.line2), source_id: src, notes: $('#sN').value, files };
      const r = ed && !asNew ? await api('/lab/' + ed.id, { method: 'PATCH', body }) : await api('/lab', { body: { kind: 'teste', ...body } });
      toast(`${r.code || (ed && ed.code)} salvo`);
      close(); tab = 'testes'; view();
    } catch (err) { $('#sheetErr').textContent = err.message; $('#stSave').disabled = false; }
  };
  $('#stSave').onclick = () => save(false);
  if ($('#stCopy')) $('#stCopy').onclick = () => save(true);
}

/* ───────── ações ───────── */
Object.assign(A.ACT, {
  labTab(el) { tab = el.dataset.v; view(); },
  labImgSub(el) { imgSub = el.dataset.v; view(); },
  labTst(el) { tstSt = el.dataset.v; view(); },
  labUp(el) { upload(el.dataset.v); },
  labEdit(el) { editMeta(+el.dataset.v); },
  labNew() { return studio({}); },
  labNewFrom(el) { return studio({ sourceId: +el.dataset.v }); },
  labStudio(el) { return studio({ id: +el.dataset.v }); },
  labDel(el) {
    const it = LAB.items.find(x => x.id === +el.dataset.v);
    sheet({ title: `Apagar ${it ? it.code : ''}?`, body: '<p>Some do Laboratório (o anúncio no Face não muda).</p>', ok: 'Apagar', danger: true,
      onOk: async () => { await api('/lab/' + el.dataset.v, { method: 'DELETE' }); toast('Apagado'); view(); } });
  }
});
document.addEventListener('change', async e => {
  const s = e.target.closest && e.target.closest('[data-labst]');
  if (!s) return;
  try { await api('/lab/' + s.dataset.labst, { method: 'PATCH', body: { status: s.value } }); toast('Situação atualizada'); view(); } catch (err) { toast(err.message, true); }
});

A.RENDER.lab = view;
})();
