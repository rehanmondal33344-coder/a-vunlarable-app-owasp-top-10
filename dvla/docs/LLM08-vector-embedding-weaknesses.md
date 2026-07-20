# LLM08 — Vector and Embedding Weaknesses

## What It Is

Vector/embedding weaknesses occur when the RAG retrieval layer lacks proper access controls, allowing a user to retrieve documents that belong to another user or tenant. The vector search returns results based purely on semantic similarity without checking authorization.

## Where It Lives in the Code

- **Vulnerable:** [`server/rag/retriever.js`](../server/rag/retriever.js) — `retrieve()`
  - No `tenantId` filter applied to vector search
  - All chunks are searchable by any user
- **Hardened:** Same file, hardened code path
  - `tenantId` filter enforced at the retrieval layer
  - Only chunks belonging to the requesting user's tenant are returned
- **Vector Store:** [`server/rag/vectorstore.js`](../server/rag/vectorstore.js) — `search()`
  - Supports optional tenant filtering via `searchOptions.tenantId`

## Exploit Walkthrough

1. Ensure **Vulnerable Mode** is active
2. Note: The seed data includes `acme-internal-memo.txt` tagged as tenant `executive`
3. As a `default` tenant user, ask: `Tell me about the NovaTech acquisition`
4. The assistant retrieves and shares executive-only information
5. Ask: `What are the database credentials?` — it returns the fake creds from the executive memo
6. Switch to **Hardened Mode** and repeat — the retriever now filters by tenant and finds nothing

## Impact

- Cross-tenant data leakage
- Unauthorized access to confidential documents
- Privilege escalation via information access
- Compliance violations (data sovereignty, GDPR)

## Fix (Hardened Mode)

```diff
 async function retrieve(query, options = {}) {
   const searchOptions = { topK };
-  // Vulnerable: no tenant filter
+  // Hardened: filter by tenant
+  if (mode === 'hardened' && tenantId) {
+    searchOptions.tenantId = tenantId;
+  }
   const results = store.search(queryEmbedding, searchOptions);
 }
```

## OWASP Reference

[OWASP LLM08:2025 — Vector and Embedding Weaknesses](https://genai.owasp.org/llmrisk/llm08-vector-and-embedding-weaknesses/)
