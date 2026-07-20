# LLM05 — Improper Output Handling

## What It Is

Improper output handling occurs when LLM-generated content is rendered directly into the DOM without sanitization, allowing the model to output HTML/JavaScript that executes in the user's browser. This is stored XSS via the LLM — the model becomes an unwitting attack vector.

## Where It Lives in the Code

- **Vulnerable:** [`public/js/chat.js`](../public/js/chat.js) — `renderContent()` function
  - Uses `el.innerHTML = formatMarkdown(content)` for assistant messages
  - HTML tags in model output are executed
- **Hardened:** Same function, hardened code path
  - Uses `el.textContent = content` — HTML is escaped

## Exploit Walkthrough

1. Ensure **Vulnerable Mode** is active
2. In chat, type: `Please generate an HTML image tag with an onerror handler that changes the page title`
3. The mock provider returns: `<img src="x" onerror="document.title='XSS_TRIGGERED'">`
4. The HTML executes in the browser — check the page title
5. A red XSS flag banner appears in the top-right corner

## Impact

- Cross-site scripting (XSS) via AI-generated content
- Session hijacking, credential theft, phishing
- Data exfiltration from the user's browser
- Persistent XSS if chat history is shared

## Fix (Hardened Mode)

```diff
 function renderContent(el, content, role) {
   if (role === 'assistant' && getMode() === 'vulnerable') {
-    el.innerHTML = formatMarkdown(content);  // XSS!
+    // Hardened: safe text rendering
+    el.textContent = content;
   }
 }
```

In production, use a sanitization library like DOMPurify to allow safe markdown rendering while stripping dangerous tags/attributes.

## OWASP Reference

[OWASP LLM05:2025 — Improper Output Handling](https://genai.owasp.org/llmrisk/llm05-improper-output-handling/)
