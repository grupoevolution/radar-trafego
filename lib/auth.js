// lib/auth.js — login do painel (senha única) + chave do Claude
const jwt = require('jsonwebtoken');
const { safeEqual } = require('./crypto');

const COOKIE = 'radar_sess';
const sign = () => jwt.sign({ u: 'admin' }, process.env.SECRET_KEY, { expiresIn: '60d' });

function requireAdmin(req, res, next) {
  const t = req.cookies && req.cookies[COOKIE];
  try { jwt.verify(t, process.env.SECRET_KEY); return next(); }
  catch (_) { return res.status(401).json({ error: 'Faça login de novo' }); }
}

// Claude (relatório diário) usa: Authorization: Bearer <CLAUDE_API_KEY>
function requireClaude(req, res, next) {
  const h = String(req.headers.authorization || '');
  const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (process.env.CLAUDE_API_KEY && tok && safeEqual(tok, process.env.CLAUDE_API_KEY)) return next();
  return requireAdmin(req, res, next); // o painel logado também pode
}

module.exports = { COOKIE, sign, requireAdmin, requireClaude };
