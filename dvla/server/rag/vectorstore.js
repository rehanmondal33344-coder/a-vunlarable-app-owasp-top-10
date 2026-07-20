/**
 * In-memory Vector Store using cosine similarity.
 * No external vector DB dependency — keeps it self-contained.
 */
class VectorStore {
  constructor() {
    this.vectors = []; // { id, content, embedding, metadata }
  }

  /**
   * Add a vector to the store.
   */
  add({ id, content, embedding, metadata = {} }) {
    this.vectors.push({ id, content, embedding, metadata });
  }

  /**
   * Remove vectors by document ID.
   */
  removeByDocumentId(documentId) {
    this.vectors = this.vectors.filter(v => v.metadata.documentId !== documentId);
  }

  /**
   * Search for similar vectors.
   * @param {number[]} queryEmbedding - The query vector
   * @param {Object} options - { topK, tenantId (for hardened mode filtering) }
   * @returns {Array<{content, score, metadata}>}
   */
  search(queryEmbedding, options = {}) {
    const { topK = 5, tenantId = null } = options;

    let candidates = this.vectors;

    // LLM08 fix: In hardened mode, filter by tenant
    if (tenantId) {
      candidates = candidates.filter(v => v.metadata.tenantId === tenantId);
    }

    const scored = candidates.map(v => ({
      content: v.content,
      metadata: v.metadata,
      score: cosineSimilarity(queryEmbedding, v.embedding),
    }));

    // Sort by similarity descending
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK);
  }

  /**
   * Get count of vectors.
   */
  get size() {
    return this.vectors.length;
  }

  /**
   * Clear all vectors.
   */
  clear() {
    this.vectors = [];
  }
}

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

// Singleton instance
const store = new VectorStore();

module.exports = {
  VectorStore,
  store,
  cosineSimilarity,
};
