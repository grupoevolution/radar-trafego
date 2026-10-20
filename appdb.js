// appdb.js — conexão SÓ LEITURA com o banco do app de membros.
//
// Regras de segurança (o app é onde o dinheiro entra — nada pode atrapalhar):
//   - no máximo 2 conexões ao mesmo tempo;
//   - toda consulta roda dentro de uma transação READ ONLY (o Postgres recusa
//     qualquer escrita, mesmo que o usuário do banco tivesse permissão);
//   - cada consulta morre sozinha em 15 s (statement_timeout).
// Se APP_DATABASE_URL estiver vazio, o Radar funciona sem os dados do app.
const { Pool } = require('pg');

let pool = null;
if (process.env.APP_DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.APP_DATABASE_URL,
    max: 2,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 8000,
    application_name: 'radar-leitura'
  });
  pool.on('error', err => console.error('[appdb] erro no pool:', err.message));
}

const enabled = () => !!pool;

async function read(text, params) {
  if (!pool) throw new Error('APP_DATABASE_URL não configurado');
  const client = await pool.connect();
  try {
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = '15s'");
    const res = await client.query(text, params);
    await client.query('COMMIT');
    return res;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { enabled, read };
