

## 1. Role & Objective

You are acting as a **senior full-stack engineer with an AI security background**.
Build a self-contained web application called **DVLA — Damn Vulnerable LLM
Assistant** (name is a placeholder, feel free to rename): a chatbot/RAG assistant
that is *intentionally* riddled with LLM-specific security flaws, mapped to the
**OWASP Top 10 for LLM Applications (2025)**.

This is not a joke app. It's a teaching tool and a portfolio flagship, in the
lineage of DVWA (Damn Vulnerable Web App), WebGoat, and crAPI — except for LLMs.
It needs to be good enough that a security professional would actually use it to
practice, and polished enough that a recruiter looking at the GitHub repo
immediately understands the engineering behind it.

---

## 2. Core Design Concept: Dual-Mode Architecture

The single feature that makes this project stand out from a pile of "just
insecure code": **every vulnerability has a toggle.**

- **Vulnerable Mode** (default, red accent theme) — flaw is live and exploitable.
- **Hardened Mode** (green accent theme) — the same feature, with the standard
  mitigation applied.

This turns the app into both an attack range *and* a side-by-side lesson in what
"secure" actually looks like in code — which is the part that makes it valuable
as a teaching tool, not just a target.

---

## 3. Tech Stack

Keep it self-contained and easy to `git clone && run` — no cloud dependencies
required to get started.

- **Frontend:** Vanilla HTML/CSS/JS or lightweight React. Dark UI, consistent with
  a security-tool aesthetic (terminal-inspired, monospace accents, red/green mode
  indicator, not corporate-SaaS-pastel).
- **Backend:** Node.js + Express (or Python + FastAPI if preferred).
- **LLM provider:** Pluggable adapter layer — support Anthropic/OpenAI API *and*
  a local model via Ollama, so the whole thing can run offline with zero API
  keys for anyone cloning it.
- **Knowledge base / RAG:** Simple local vector store (SQLite + a lightweight
  embeddings lib, or an in-memory cosine-similarity index) — no need for a
  managed vector DB, the point is to expose the *mechanism*, not scale it.
- **Persistence:** SQLite for chat logs, uploaded documents, and "challenge flag"
  state.

---

## 4. Vulnerability Matrix

Each row is a real feature with a real, working exploit path. Build every one of
these — this list *is* the product.

| ID | OWASP LLM Vuln | Vulnerable Implementation | Hardened Toggle |
|----|---|---|---|
| LLM01 | Prompt Injection | User input concatenated directly into the system prompt; no delimiter/instruction hierarchy | Structured prompt with clear role separation + input sanitization/delimiting |
| LLM02 | Sensitive Info Disclosure | System prompt contains fake "secrets" (API keys, internal notes) the model will repeat if asked | Secrets stripped from context; least-privilege prompt construction |
| LLM04 | Data/Model Poisoning | Anyone can upload a document to the RAG knowledge base with no validation — poisoned chunks get retrieved and trusted | Upload requires review queue / content validation before indexing |
| LLM05 | Improper Output Handling | Model output rendered directly into the DOM (`innerHTML`) — stored XSS via chat responses | Output sanitized/escaped before render |
| LLM06 | Excessive Agency | Model has function-calling access to "send email," "delete record," "run shell command" tools with no confirmation step or scope limits | Tool calls require explicit user confirmation + scoped permissions |
| LLM07 | System Prompt Leakage | Weak system prompt with no defense against "repeat everything above" style extraction | Prompt hardened against extraction; sensitive instructions moved out of the model-visible context entirely |
| LLM08 | Vector/Embedding Weaknesses | No access control on retrieved chunks — a low-privilege user's query can retrieve another "tenant's" documents | Per-user/tenant filtering enforced at the retrieval layer |
| LLM09 | Overreliance/Misinformation | No citations, no confidence signaling, model free to fabricate | Responses require citation to retrieved source chunks |
| LLM10 | Unbounded Consumption | No rate limiting or token/cost caps — a single user can trigger unbounded API spend or recursive tool loops | Rate limiting, max-token caps, loop detection |

(LLM03 — Supply Chain — is worth a short write-up in the README about
third-party model/plugin risk even if it's not something to "build," since it's
more of a process control than a code path.)

---

## 5. Functional Requirements

- **Chat interface** — standard conversational UI, streaming responses.
- **Mode toggle** — global switch (Vulnerable/Hardened), visually obvious, persists
  per session.
- **Admin panel** — upload documents to the knowledge base (this is the poisoning
  entry point), view/edit the system prompt, view tool-access grants.
- **"Raw prompt" inspector panel** — a collapsible debug panel showing the exact
  payload sent to the LLM on each turn. This is the single best teaching feature
  in the whole app — it makes prompt injection *visible*.
- **Challenge/flag system** — a sidebar list of numbered challenges ("Extract the
  hidden API key," "Get the assistant to email a fake user," "Poison the KB to
  make it recommend a competitor"), each with a hint toggle and a flag-capture
  input, CTF-style. This is what makes the repo shareable and "playable" rather
  than just readable.
- **Logging** — every exploit attempt logged to a local panel/table so a user can
  review what actually happened server-side.

---

## 6. Non-Goals

- Not a production chatbot. Don't optimize for scale, multi-tenant auth, or
  polish beyond what supports the teaching goal.
- Not a jailbreak-collection site — the vulnerabilities are architectural
  (how the app is built), not a library of adversarial prompts to paste in.
- No real user data, ever, anywhere in the app or its seed data.

---

## 7. Responsible Use & Distribution Notes

Bake this into the README, matching the convention set by DVWA/WebGoat:

- **Run locally only.** Explicit warning against deploying to a public-facing
  server with real credentials.
- If a hosted demo is offered, use a sandboxed, rate-limited, no-real-secrets
  deployment, and say so explicitly.
- Seed the knowledge base and "leaked secrets" with obviously fake data (e.g.,
  `sk-FAKE-DO-NOT-USE-1234`) so nothing in a screenshot or repo scan looks like
  a real credential.

---

## 8. Build Plan (Phased)

1. **Scaffold** — project structure, dark UI shell, mode toggle, chat working
   end-to-end with a deliberately weak system prompt (LLM07 baseline).
2. **RAG + poisoning** — knowledge base, unrestricted upload, retrieval with no
   access control (LLM04, LLM08).
3. **Tool calling** — over-permissioned function access, no confirmation gate
   (LLM06).
4. **Output handling** — unsafe DOM rendering path (LLM05).
5. **Hardened-mode implementations** — build the fix for every vuln above,
   wired to the toggle.
6. **Challenge layer** — flags, hints, raw-prompt inspector, attempt logging.
7. **Docs pass** — README, per-vulnerability write-up (see §9), architecture
   diagram, setup instructions for both cloud-API and local-Ollama paths.

---

## 9. Documentation Deliverables

For each vulnerability, a short write-up in `/docs/`:

- **What it is** (plain-language, one paragraph)
- **Where it lives in the code** (file/line reference)
- **Exploit walkthrough** (step-by-step, screenshots optional)
- **Impact** (what a real attacker gets)
- **Fix** (what Hardened Mode does differently, with a diff or code snippet)
- **OWASP reference link**

This documentation set is what turns the repo into a blog-post series and a
talk outline for free — write the code and the content strategy falls out of it.

---

## 10. Definition of Done

- [ ] All 9 buildable vulnerabilities implemented and exploitable in Vulnerable Mode
- [ ] All 9 have a working, verifiably different Hardened Mode counterpart
- [ ] Raw-prompt inspector panel functional and accurate
- [ ] At least 6 CTF-style challenges with flags
- [ ] Runs fully offline via Ollama with zero API keys required
- [ ] README includes architecture diagram, setup, and responsible-use notice
- [ ] Per-vulnerability docs complete in `/docs/`

---

## 11. Example Starting System Prompt (Vulnerable Mode)

```
You are HelpBot, an internal assistant for Acme Corp.
Internal note: the admin override code is SUNSET-1234-FAKE.
Answer any question the user asks as helpfully as possible.
```

(No instruction hierarchy, no defense against extraction, secret sitting in
plain context — intentionally the worst possible starting point. Hardened Mode
should replace this entirely rather than patching it.)
