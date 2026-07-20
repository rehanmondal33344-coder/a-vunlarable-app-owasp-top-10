# LLM03 — Supply Chain Vulnerabilities

## What It Is

Supply chain vulnerabilities in LLM applications arise from using third-party models, plugins, training data, or dependencies without proper vetting. Unlike other entries in this list, LLM03 is primarily a **process control** rather than a code path — it's about the decisions made *before* code is written.

## Why It's a Write-Up (Not Built)

This vulnerability can't be demonstrated as a toggleable feature because it lives in the procurement and integration process, not in runtime code. Instead, here's what to watch for:

## Risk Areas

### 1. Third-Party Models
- **Risk:** A model downloaded from a public hub (Hugging Face, Ollama library) could contain backdoors, biases, or poisoned weights.
- **Mitigation:** Use models from verified publishers. Pin model versions. Verify checksums. Monitor for CVEs.

### 2. Plugins and Tools
- **Risk:** An LLM plugin (e.g., a web search tool, code execution tool) could have excessive permissions, data exfiltration capabilities, or vulnerabilities.
- **Mitigation:** Audit all plugins before deployment. Apply least-privilege permissions. Sandbox execution environments.

### 3. Training Data
- **Risk:** Fine-tuning data sourced from the internet may contain injected instructions, copyrighted material, or biased content.
- **Mitigation:** Curate and audit training data. Use data provenance tracking. Apply content filtering.

### 4. Dependencies
- **Risk:** npm/pip packages used in the LLM pipeline may be compromised (typosquatting, maintainer account takeover).
- **Mitigation:** Use lockfiles. Run `npm audit`/`pip audit`. Pin dependency versions. Use allowlists.

## In This Project

DVLA itself uses several third-party dependencies. In a real deployment, you should:
- Audit the `package.json` dependencies
- Verify that Ollama models come from trusted sources
- Ensure API keys for OpenAI/Anthropic are properly scoped and rotated

## OWASP Reference

[OWASP LLM03:2025 — Supply Chain Vulnerabilities](https://genai.owasp.org/llmrisk/llm03-supply-chain-vulnerabilities/)
