// lib/time.js — tudo no horário de Brasília (o dia do Face e das vendas)
const TZ = 'America/Sao_Paulo';

function parts(d = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const o = Object.fromEntries(f.formatToParts(d).map(p => [p.type, p.value]));
  return { day: `${o.year}-${o.month}-${o.day}`, hour: parseInt(o.hour, 10) % 24, minute: parseInt(o.minute, 10) };
}
const today = () => parts().day;
function addDays(day, n) {
  const d = new Date(day + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const yesterday = () => addDays(today(), -1);
function daysBetween(a, b) { return Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000); }
function range(from, to) { const out = []; for (let d = from; d <= to; d = addDays(d, 1)) out.push(d); return out; }
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDay = s => DAY_RE.test(String(s || ''));

module.exports = { TZ, parts, today, yesterday, addDays, daysBetween, range, isDay };
