// lib/crypto.js — guarda as chaves do Facebook criptografadas no banco
const crypto = require('crypto');

function key() {
  const s = process.env.SECRET_KEY;
  if (!s || s.length < 16) throw new Error('SECRET_KEY ausente ou curto demais');
  return crypto.createHash('sha256').update(s).digest();
}
function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(String(text), 'utf8'), c.final()]);
  return [iv.toString('base64'), c.getAuthTag().toString('base64'), enc.toString('base64')].join('.');
}
function decrypt(blob) {
  if (!blob) return null;
  const [iv, tag, enc] = blob.split('.').map(b => Buffer.from(b, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
}
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
module.exports = { encrypt, decrypt, safeEqual };
