const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { chunkDocument } = require('../rag/chunker');
const { embed, updateVocabulary } = require('../rag/embeddings');
const { store } = require('../rag/vectorstore');

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/**
 * GET /api/admin/system-prompt
 * Get the current system prompt for the active mode.
 */
router.get('/system-prompt', (req, res) => {
  const mode = req.appMode;
  const promptKey = `system_prompt_${mode}`;
  const prompt = db.getSetting(promptKey) || '';
  res.json({ prompt, mode });
});

/**
 * PUT /api/admin/system-prompt
 * Update the system prompt.
 */
router.put('/system-prompt', (req, res) => {
  const { prompt } = req.body;
  const mode = req.appMode;

  if (prompt === undefined) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const promptKey = `system_prompt_${mode}`;
  db.setSetting(promptKey, prompt);
  res.json({ success: true, mode });
});

/**
 * POST /api/admin/upload
 * Upload a document to the knowledge base.
 * LLM04 VULN: In vulnerable mode, no validation or review — document is immediately indexed.
 * LLM04 FIX: In hardened mode, documents go to a review queue.
 */
router.post('/upload', upload.single('document'), async (req, res) => {
  const mode = req.appMode;
  const tenantId = req.tenantId;

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Read file content
    const content = fs.readFileSync(req.file.path, 'utf-8');
    const filename = req.file.originalname || req.file.filename;

    // In hardened mode, require review before indexing
    const status = mode === 'hardened' ? 'pending' : 'indexed';

    // Check for injection patterns in hardened mode
    if (mode === 'hardened') {
      const injectionPatterns = [
        /ignore (previous|all) instructions/i,
        /you are now/i,
        /system prompt/i,
        /<script/i,
        /onerror/i,
      ];

      const hasInjection = injectionPatterns.some(p => p.test(content));
      if (hasInjection) {
        db.logExploit({
          sessionId: req.sessionId,
          vulnerabilityId: 'LLM04',
          eventType: 'blocked',
          description: `Potentially poisoned document rejected: ${filename}`,
          requestData: { filename, contentPreview: content.slice(0, 200) },
          mode,
        });

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        return res.status(400).json({
          error: 'Document contains potentially malicious content and has been rejected.',
          flagged: true,
        });
      }
    }

    // Save document to database
    const docId = db.saveDocument({
      filename,
      content,
      uploadedBy: req.headers['x-user'] || 'admin',
      tenantId,
      status,
    });

    // In vulnerable mode, immediately index
    if (status === 'indexed') {
      await indexDocument(docId, content, tenantId);

      // Log exploit for vulnerable mode
      db.logExploit({
        sessionId: req.sessionId,
        vulnerabilityId: 'LLM04',
        eventType: 'success',
        description: `Document indexed without review: ${filename}`,
        requestData: { filename, contentPreview: content.slice(0, 200) },
        mode,
      });
    }

    // Clean up uploaded file (content is stored in DB)
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      documentId: docId,
      filename,
      status,
      message: status === 'pending'
        ? 'Document uploaded and pending review.'
        : 'Document uploaded and indexed immediately.',
    });

  } catch (error) {
    console.error('[Admin] Upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

/**
 * Index a document: chunk it, embed it, and add to vector store.
 */
async function indexDocument(docId, content, tenantId) {
  const chunks = chunkDocument(content);

  // Update vocabulary and embed
  updateVocabulary(chunks);

  for (let i = 0; i < chunks.length; i++) {
    const embedding = embed(chunks[i]);

    // Save chunk to database
    db.saveChunk({
      documentId: docId,
      content: chunks[i],
      chunkIndex: i,
      tenantId,
      embedding,
    });

    // Add to in-memory vector store
    store.add({
      id: `${docId}-chunk-${i}`,
      content: chunks[i],
      embedding,
      metadata: {
        documentId: docId,
        tenantId,
        chunkIndex: i,
      },
    });
  }
}

/**
 * GET /api/admin/documents
 * List all documents in the knowledge base.
 */
router.get('/documents', (req, res) => {
  const status = req.query.status || null;
  const documents = db.getDocuments(status);
  res.json({
    documents: documents.map(d => ({
      id: d.id,
      filename: d.filename,
      contentPreview: d.content.slice(0, 200) + (d.content.length > 200 ? '...' : ''),
      uploadedBy: d.uploaded_by,
      tenantId: d.tenant_id,
      status: d.status,
      createdAt: d.created_at,
    })),
  });
});

/**
 * POST /api/admin/documents/:id/approve
 * Approve a pending document (hardened mode).
 */
router.post('/documents/:id/approve', async (req, res) => {
  const { id } = req.params;
  const doc = db.getDocuments().find(d => d.id === id);

  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  db.updateDocumentStatus(id, 'indexed');
  await indexDocument(id, doc.content, doc.tenant_id);

  res.json({ success: true, message: 'Document approved and indexed.' });
});

/**
 * POST /api/admin/documents/:id/reject
 * Reject a pending document.
 */
router.post('/documents/:id/reject', (req, res) => {
  const { id } = req.params;
  db.updateDocumentStatus(id, 'rejected');
  res.json({ success: true, message: 'Document rejected.' });
});

/**
 * DELETE /api/admin/documents/:id
 * Delete a document and its chunks.
 */
router.delete('/documents/:id', (req, res) => {
  const { id } = req.params;
  store.removeByDocumentId(id);
  db.deleteChunksByDocumentId(id);
  db.deleteDocument(id);
  res.json({ success: true });
});

/**
 * GET /api/admin/tools
 * Get available tools and their permissions.
 */
router.get('/tools', (req, res) => {
  const { getAvailableTools } = require('../tools/registry');
  const tools = getAvailableTools(req.appMode);
  res.json({ tools, mode: req.appMode });
});

module.exports = { router, indexDocument };
