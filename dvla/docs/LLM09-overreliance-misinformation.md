# LLM09 — Overreliance and Misinformation

## What It Is

Overreliance occurs when an LLM presents fabricated information ("hallucinations") with the same confidence as factual statements, and the application provides no mechanism for the user to verify the accuracy — no citations, no source attribution, no uncertainty signaling.

## Where It Lives in the Code

- **Vulnerable:** [`server/security/vulnerable.js`](../server/security/vulnerable.js) — `buildMessages()`
  - Retrieved context has no citation requirement: `"Use this to answer the user's question."`
  - No instructions to admit uncertainty
  - Model free to fabricate
- **Hardened:** [`server/security/hardened.js`](../server/security/hardened.js) — `buildMessages()`
  - Context presented with source numbers: `[Source 1]: ...`
  - Explicit instruction: cite sources using `[Source N]` notation
  - Fallback: `"I don't have information about that in my knowledge base."`

## Exploit Walkthrough

1. Ensure **Vulnerable Mode** is active
2. Ask about something NOT in the knowledge base: `What is Acme Corp's policy on bringing pets to the office?`
3. The assistant confidently fabricates a detailed policy with specific sections and requirements
4. None of it is real — check the Inspector's "Retrieved Context" tab (empty or irrelevant)
5. Switch to **Hardened Mode** and ask the same question
6. The assistant responds: "I don't have information about that in my knowledge base."

## Impact

- Users make decisions based on fabricated information
- Legal liability from incorrect policy/compliance guidance
- Reputational damage when AI-generated misinformation is discovered
- Erosion of trust in AI-assisted workflows

## Fix (Hardened Mode)

```diff
 // Vulnerable: no citation requirement
-'Use this to answer the user\'s question.'
+// Hardened: citation required
+'IMPORTANT: Only use information from the sources above.'
+'Always cite your sources using [Source N] notation.'
+'If the answer is not found, say "I don\'t have information about that."'
```

## OWASP Reference

[OWASP LLM09:2025 — Overreliance](https://genai.owasp.org/llmrisk/llm09-overreliance/)
