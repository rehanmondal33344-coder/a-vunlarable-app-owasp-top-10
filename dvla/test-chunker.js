const { chunkDocument } = require('./server/rag/chunker');
const fs = require('fs');

const text = fs.readFileSync('seed/knowledge-base/acme-employee-handbook.txt', 'utf-8');
console.log('length:', text.length);
const chunks = chunkDocument(text);
console.log('chunks:', chunks.length);
