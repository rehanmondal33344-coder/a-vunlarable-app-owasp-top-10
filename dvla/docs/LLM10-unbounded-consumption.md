# LLM10 — Unbounded Consumption

## What It Is

Unbounded consumption occurs when there are no rate limits, token caps, or loop detection mechanisms, allowing a single user to trigger unlimited API calls, consume excessive tokens, or create recursive tool-calling loops — resulting in denial of service or runaway costs.

## Where It Lives in the Code

- **Vulnerable:** [`server/security/vulnerable.js`](../server/security/vulnerable.js) — `checkRateLimit()`
  - Returns `{ allowed: true }` unconditionally
  - No token limits on LLM responses
  - No loop detection
- **Hardened:** [`server/security/hardened.js`](../server/security/hardened.js) — `checkRateLimit()`
  - Per-IP rate limiting: 10 requests per minute
  - Max 4096 tokens per response
  - Configurable via environment variables

## Exploit Walkthrough

1. Ensure **Vulnerable Mode** is active
2. Open the browser developer console (F12)
3. Run:
   ```javascript
   for (let i = 0; i < 50; i++) {
     fetch('/api/chat', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ message: 'test ' + i })
     });
   }
   ```
4. All 50 requests are processed — no rate limiting
5. Check the **Logs** panel — see all requests logged
6. Switch to **Hardened Mode** and repeat — after 10 requests, you get 429 errors

## Impact

- Denial of service (resource exhaustion)
- Uncontrolled API costs (runaway spending)
- Service degradation for other users
- Potential for recursive tool loops consuming infinite resources

## Fix (Hardened Mode)

```diff
-function checkRateLimit(req) {
-  return { allowed: true };  // No limits!
-}
+function checkRateLimit(req) {
+  const ip = req.ip;
+  const timestamps = requestCounts.get(ip) || [];
+  const recent = timestamps.filter(t => Date.now() - t < 60000);
+  if (recent.length >= 10) {
+    return { allowed: false, message: 'Rate limit exceeded' };
+  }
+  return { allowed: true };
+}
```

Additional mitigations: max token caps on responses, recursive tool loop detection (max 3 iterations).

## OWASP Reference

[OWASP LLM10:2025 — Unbounded Consumption](https://genai.owasp.org/llmrisk/llm10-unbounded-consumption/)
