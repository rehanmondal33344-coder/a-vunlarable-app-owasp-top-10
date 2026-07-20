/**
 * Document Chunker
 * Splits uploaded documents into overlapping chunks for the vector store.
 */

const DEFAULT_CHUNK_SIZE = 512;   // characters
const DEFAULT_OVERLAP = 64;       // characters

/**
 * Split a document into overlapping chunks.
 * @param {string} text - Full document text
 * @param {Object} options - { chunkSize, overlap }
 * @returns {string[]} Array of chunk strings
 */
function chunkDocument(text, options = {}) {
  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  const overlap = options.overlap || DEFAULT_OVERLAP;

  if (!text || text.length === 0) return [];
  if (text.length <= chunkSize) return [text.trim()];

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // Try to break at a sentence/paragraph boundary
    if (end < text.length) {
      const searchWindow = text.slice(end - 50, end + 50);
      const breakPoints = ['\n\n', '.\n', '. ', '\n'];

      for (const bp of breakPoints) {
        const idx = searchWindow.indexOf(bp);
        if (idx !== -1) {
          end = end - 50 + idx + bp.length;
          break;
        }
      }
    }

    end = Math.min(end, text.length);
    const chunk = text.slice(start, end).trim();

    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = end - overlap;
    if (end >= text.length) break;
  }

  return chunks;
}

module.exports = { chunkDocument };
