const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const modeMiddleware = require('./middleware/mode');
const exploitLogger = require('./middleware/logging');

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(modeMiddleware);
app.use(exploitLogger);

// ─── Static Files ────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── API Routes ──────────────────────────────────────────────
app.use('/api/chat', require('./routes/chat'));
app.use('/api/admin', require('./routes/admin').router);
app.use('/api/mode', require('./routes/mode'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/tools', require('./routes/tools'));
app.use('/api/logs', require('./routes/logs'));

// ─── Health Check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const db = require('./db/database');
  const llm = require('./llm/adapter');

  res.json({
    status: 'ok',
    mode: db.getSetting('mode') || 'vulnerable',
    provider: llm.getProvider().name,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── SPA Fallback ────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ─── Seed Knowledge Base ─────────────────────────────────────
async function seedKnowledgeBase() {
  const db = require('./db/database');
  const { indexDocument } = require('./routes/admin');

  // Check if already seeded
  const docs = db.getDocuments();
  if (docs.length > 0) {
    console.log(`[Seed] Knowledge base already populated (${docs.length} documents)`);
    return;
  }

  const seedDir = path.join(__dirname, '..', 'seed', 'knowledge-base');
  if (!fs.existsSync(seedDir)) {
    console.log('[Seed] No seed directory found, skipping');
    return;
  }

  const files = fs.readdirSync(seedDir).filter(f => f.endsWith('.txt'));
  console.log(`[Seed] Indexing ${files.length} seed documents...`);

  for (const file of files) {
    const content = fs.readFileSync(path.join(seedDir, file), 'utf-8');
    const tenantId = file.includes('confidential') || file.includes('internal')
      ? 'executive' : 'default';

    const docId = db.saveDocument({
      filename: file,
      content,
      uploadedBy: 'system',
      tenantId,
      status: 'indexed',
    });

    await indexDocument(docId, content, tenantId);
    console.log(`[Seed]   ✓ ${file} (tenant: ${tenantId})`);
  }

  console.log('[Seed] Knowledge base seeded successfully');
}

// ─── Start Server ────────────────────────────────────────────
app.listen(config.port, config.host, async () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║                                                      ║');
  console.log('║   ██████╗ ██╗   ██╗██╗      █████╗                   ║');
  console.log('║   ██╔══██╗██║   ██║██║     ██╔══██╗                  ║');
  console.log('║   ██║  ██║██║   ██║██║     ███████║                  ║');
  console.log('║   ██║  ██║╚██╗ ██╔╝██║     ██╔══██║                  ║');
  console.log('║   ██████╔╝ ╚████╔╝ ███████╗██║  ██║                  ║');
  console.log('║   ╚═════╝   ╚═══╝  ╚══════╝╚═╝  ╚═╝                  ║');
  console.log('║                                                      ║');
  console.log('║   Damn Vulnerable LLM Assistant                      ║');
  console.log('║   ─────────────────────────────                      ║');
  console.log('║                                                      ║');
  console.log(`║   🌐 http://${config.host}:${config.port}                        ║`);
  console.log(`║   🤖 LLM Provider: ${config.llm.provider.padEnd(33)}║`);
  console.log('║                                                      ║');
  console.log('║   ⚠️  FOR EDUCATIONAL USE ONLY                       ║');
  console.log('║   ⚠️  DO NOT DEPLOY TO PUBLIC SERVERS                ║');
  console.log('║                                                      ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  // Seed the knowledge base
  await seedKnowledgeBase();
});

module.exports = app;
