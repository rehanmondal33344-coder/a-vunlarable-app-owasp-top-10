# DVLA — Damn Vulnerable LLM Assistant

> ⚠️ **FOR EDUCATIONAL USE ONLY** — Do NOT deploy this application to public-facing servers. It is intentionally insecure.

An intentionally vulnerable LLM chatbot/RAG assistant for security education, in the lineage of [DVWA](https://github.com/digininja/DVWA), [WebGoat](https://github.com/WebGoat/WebGoat), and [crAPI](https://github.com/OWASP/crAPI) — except for LLMs.

Every vulnerability is mapped to the **[OWASP Top 10 for LLM Applications (2025)](https://genai.owasp.org/llm-top-10/)** and has a **dual-mode toggle**: exploit it in Vulnerable Mode, then flip the switch to see the fix in Hardened Mode.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Vanilla JS)                │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  │
│  │   Chat   │  │Challenges│  │ Inspector │  │   Admin   │  │
│  │   UI     │  │ Sidebar  │  │   Panel   │  │   Panel   │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └─────┬─────┘  │
│       │              │              │              │         │
│       └──────────────┴──────────────┴──────────────┘         │
│                          SSE / REST                          │
├─────────────────────────────────────────────────────────────┤
│                     Express.js Backend                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Mode Middleware (Vulnerable ↔ Hardened)               │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ ┌────────┐ ┌─────────┐ ┌──────────┐ ┌────────────┐  │   │
│  │ │  Chat  │ │  Admin  │ │Challenges│ │   Tools    │  │   │
│  │ │ Route  │ │  Route  │ │  Route   │ │   Route    │  │   │
│  │ └───┬────┘ └────┬────┘ └────┬─────┘ └─────┬──────┘  │   │
│  │     │           │           │              │         │   │
│  │ ┌───▼───────────▼───────────▼──────────────▼──────┐  │   │
│  │ │            Security Layer                       │  │   │
│  │ │  vulnerable.js ←──toggle──→ hardened.js         │  │   │
│  │ └─────────────────┬───────────────────────────────┘  │   │
│  │                   │                                  │   │
│  │ ┌─────────────────▼───────────────────────────────┐  │   │
│  │ │              LLM Adapter                        │  │   │
│  │ │  Ollama │ OpenAI │ Anthropic │ Mock             │  │   │
│  │ └─────────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  │ ┌────────────────┐  ┌──────────────────────────────┐ │   │
│  │ │  RAG Pipeline  │  │     Tool System              │ │   │
│  │ │ Vector Store   │  │ send_email │ delete_record   │ │   │
│  │ │ Embeddings     │  │ run_shell  │ (+ registry)    │ │   │
│  │ │ Retriever      │  │                              │ │   │
│  │ └────────────────┘  └──────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                          SQLite                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Option 1: Run with Ollama (fully offline, recommended)

```bash
# 1. Install Ollama (https://ollama.ai)
# 2. Pull a model
ollama pull llama3.2

# 3. Clone and run
git clone <repo-url> dvla
cd dvla
npm install
npm run dev
```

### Option 2: Run with API keys

```bash
git clone <repo-url> dvla
cd dvla
npm install

# Copy env template and add your keys
cp .env.example .env
# Edit .env → set LLM_PROVIDER=openai and OPENAI_API_KEY=sk-...

npm run dev
```

### Option 3: Run with mock provider (no model needed)

```bash
git clone <repo-url> dvla
cd dvla
npm install

# Use mock responses for testing
echo "LLM_PROVIDER=mock" > .env

npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 🔴🟢 Dual-Mode Architecture

Every vulnerability has a toggle:

- **Vulnerable Mode** (red theme) — The flaw is live and exploitable.
- **Hardened Mode** (green theme) — The standard mitigation is applied.

Toggle the switch in the top bar to instantly switch between modes.

---

## 🎯 Vulnerability Matrix

| ID | OWASP LLM Vulnerability | Vulnerable Behavior | Hardened Behavior |
|----|------------------------|--------------------|--------------------|
| LLM01 | Prompt Injection | Direct input concatenation, no delimiters | Structured messages with role separation, input sanitization |
| LLM02 | Sensitive Info Disclosure | Secrets embedded in system prompt | Secrets removed from model context |
| LLM04 | Data/Model Poisoning | Unrestricted document upload, instant indexing | Review queue, content validation |
| LLM05 | Improper Output Handling | innerHTML rendering (XSS possible) | Output sanitized and escaped |
| LLM06 | Excessive Agency | All tools execute without confirmation | Confirmation required, scoped permissions |
| LLM07 | System Prompt Leakage | Weak prompt, no extraction defense | Anti-extraction instructions, hardened prompt |
| LLM08 | Vector/Embedding Weaknesses | No tenant filtering on retrieval | Per-tenant access control on chunks |
| LLM09 | Overreliance/Misinformation | No citations, free to fabricate | Citation required, "no source" fallback |
| LLM10 | Unbounded Consumption | No rate limits or token caps | Rate limiting, max tokens, loop detection |

> **LLM03 (Supply Chain):** Not a code vulnerability — see [docs/LLM03-supply-chain.md](docs/LLM03-supply-chain.md) for a write-up on third-party model and plugin supply chain risks.

---

## 🏴‍☠️ CTF Challenges

9 challenges, one per vulnerability. Each has:
- A description and difficulty rating
- A hint (toggleable)
- A flag to capture (`FLAG{...}`)

Complete all 9 to claim 100% completion.

---

## 🔍 Key Features

- **Chat Interface** — Streaming responses via SSE
- **Raw Prompt Inspector** — See the exact payload sent to the LLM on every turn
- **Admin Panel** — Edit system prompts, upload documents, view tool grants
- **Exploit Logs** — Every exploit attempt logged and reviewable
- **Challenge System** — CTF-style with flags and hints
- **Pluggable LLM** — Ollama, OpenAI, Anthropic, or mock provider

---

## 📁 Project Structure

```
dvla/
├── server/          # Express.js backend
│   ├── llm/         # Pluggable LLM adapter layer
│   ├── rag/         # Vector store, embeddings, retriever
│   ├── tools/       # Function-calling tools (email, db, shell)
│   ├── security/    # Vulnerable & hardened mode logic
│   ├── routes/      # API endpoints
│   └── db/          # SQLite schema & wrapper
├── public/          # Frontend (vanilla HTML/CSS/JS)
│   ├── css/         # Dark theme design system
│   └── js/          # UI controllers
├── docs/            # Per-vulnerability documentation
├── seed/            # Seed data (knowledge base, challenges)
└── README.md
```

---

## ⚠️ Responsible Use

This project is designed for **local educational use only**, following the conventions established by DVWA and WebGoat:

- **Run locally only.** Do not deploy to a public-facing server with real credentials.
- All secrets and credentials in the app are **obviously fake** (e.g., `sk-FAKE-DO-NOT-USE-1234`).
- No real user data is used or stored.
- If hosting a demo, use a sandboxed, rate-limited, no-real-secrets deployment.

---

## 📚 Documentation

Per-vulnerability documentation is available in the [`docs/`](docs/) directory:

- [LLM01 — Prompt Injection](docs/LLM01-prompt-injection.md)
- [LLM02 — Sensitive Information Disclosure](docs/LLM02-sensitive-info-disclosure.md)
- [LLM03 — Supply Chain (write-up only)](docs/LLM03-supply-chain.md)
- [LLM04 — Data/Model Poisoning](docs/LLM04-data-model-poisoning.md)
- [LLM05 — Improper Output Handling](docs/LLM05-improper-output-handling.md)
- [LLM06 — Excessive Agency](docs/LLM06-excessive-agency.md)
- [LLM07 — System Prompt Leakage](docs/LLM07-system-prompt-leakage.md)
- [LLM08 — Vector/Embedding Weaknesses](docs/LLM08-vector-embedding-weaknesses.md)
- [LLM09 — Overreliance/Misinformation](docs/LLM09-overreliance-misinformation.md)
- [LLM10 — Unbounded Consumption](docs/LLM10-unbounded-consumption.md)

---

## 📄 License

MIT — Use freely for education and security research.
