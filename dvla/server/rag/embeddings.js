/**
 * Simple TF-IDF Embeddings
 * A self-contained embedding implementation — no ML dependencies required.
 * Optionally uses Ollama's /api/embeddings endpoint when available.
 */
const config = require('../config');

// Global vocabulary built from all indexed documents
const vocabulary = new Map(); // word -> index
let vocabSize = 0;

/**
 * Tokenize text into words.
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
}

/**
 * Build/update vocabulary from a set of documents.
 */
function updateVocabulary(documents) {
  for (const doc of documents) {
    const words = tokenize(doc);
    for (const word of words) {
      if (!vocabulary.has(word)) {
        vocabulary.set(word, vocabSize++);
      }
    }
  }
}

/**
 * Generate a TF-IDF-inspired embedding for a text string.
 * Returns a fixed-dimension vector.
 */
function embed(text) {
  const words = tokenize(text);
  const dimension = Math.max(vocabSize, 100); // minimum dimension of 100
  const vector = new Array(dimension).fill(0);

  // Term frequency
  const tf = new Map();
  for (const word of words) {
    tf.set(word, (tf.get(word) || 0) + 1);
  }

  // Build vector
  for (const [word, count] of tf) {
    const idx = vocabulary.get(word);
    if (idx !== undefined && idx < dimension) {
      vector[idx] = count / words.length; // normalized TF
    }
  }

  // L2 normalize
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= norm;
    }
  }

  return vector;
}

/**
 * Batch embed multiple texts.
 */
function embedBatch(texts) {
  updateVocabulary(texts);
  return texts.map(t => embed(t));
}

/**
 * Try to use Ollama for embeddings (better quality, but requires Ollama running).
 */
async function embedWithOllama(text) {
  try {
    const response = await fetch(`${config.llm.ollama.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.llm.ollama.model,
        prompt: text,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.embedding) {
        return data.embedding;
      }
    }
  } catch (e) {
    // Ollama not available — fall back to TF-IDF
  }

  return embed(text);
}

module.exports = {
  tokenize,
  updateVocabulary,
  embed,
  embedBatch,
  embedWithOllama,
};
