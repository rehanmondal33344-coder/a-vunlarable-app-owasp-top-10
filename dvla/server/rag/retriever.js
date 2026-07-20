/**
 * RAG Retriever
 * Handles document retrieval with/without access controls.
 */
const { store } = require('./vectorstore');
const embeddings = require('./embeddings');
const db = require('../db/database');

/**
 * Retrieve relevant chunks for a query.
 * @param {string} query - User query text
 * @param {Object} options
 * @param {string} options.mode - 'vulnerable' or 'hardened'
 * @param {string} options.tenantId - User/tenant ID (used in hardened mode)
 * @param {number} options.topK - Number of results to return
 * @returns {Array<{content, score, metadata}>}
 */
async function retrieve(query, options = {}) {
  const { mode = 'vulnerable', tenantId = null, topK = 5 } = options;

  // Generate query embedding
  const queryEmbedding = embeddings.embed(query);

  // Search the vector store
  const searchOptions = { topK };

  if (mode === 'hardened' && tenantId) {
    // LLM08 FIX: Filter by tenant in hardened mode
    searchOptions.tenantId = tenantId;
  }
  // LLM08 VULN: In vulnerable mode, no tenant filter — cross-tenant leak

  const results = store.search(queryEmbedding, searchOptions);

  return results.filter(r => r.score > 0.01); // filter near-zero matches
}

module.exports = { retrieve };
