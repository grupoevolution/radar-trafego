// server.js — Radar: migrações → rotas → coletor
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');
const db = require('./db');
const migrations = require('./lib/migrations');
const notify = require('./lib/notify');
const collector = require('./lib/collector');
const api = require('./routes/api');

const PORT = parseInt(process.env.PORT || '3200', 10);

async function boot() {
  for (const k of ['DATABASE_URL', 'ADMIN_PASSWORD', 'SECRET_KEY']) {
    if (!process.env[k]) throw new Error(`Falta a variável ${k} (veja .env.example)`);
  }
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  app.get('/health', async (req, res) => {
    let dbOk = false;
    try { await db.query('SELECT 1'); dbOk = true; } catch (_) {}
    res.json({ ok: true, db: dbOk, demo: process.env.DEMO_MODE === '1', uptime_s: Math.round(process.uptime()) });
  });

  app.use('/api', api);
  // cada deploy gera uma versão nova dos arquivos: o celular (PWA) nunca fica preso numa cópia velha
  const BUILD = Date.now().toString(36);
  const sendIndex = (req, res) => {
    res.set('Cache-Control', 'no-store, max-age=0');
    res.type('html').send(fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8').replace(/\?v=\w+/g, '?v=' + BUILD));
  };
  app.get(['/', '/index.html'], sendIndex);
  app.use(express.static(path.join(__dirname, 'public'), {
    index: false,
    setHeaders: (res, p) => { if (/\.(js|css|html|json)$/.test(p)) res.set('Cache-Control', 'no-cache'); }
  }));
  app.get('*', sendIndex);

  app.use((err, req, res, next) => {
    console.error('[server]', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
  });

  await migrations.run();
  await notify.initVapid();
  app.listen(PORT, () => console.log(`[server] Radar no ar: http://localhost:${PORT}${process.env.DEMO_MODE === '1' ? '  (MODO DEMONSTRAÇÃO)' : ''}`));
  collector.start();
}

boot().catch(err => {
  console.error('[server] falha no boot:', err);
  process.exit(1);
});
