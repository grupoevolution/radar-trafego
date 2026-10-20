// db.js — banco PRÓPRIO do Radar (tudo que o Radar guarda mora aqui)
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 8,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});
pool.on('error', err => console.error('[db] erro no pool:', err.message));

const query = (text, params) => pool.query(text, params);

async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, transaction };
