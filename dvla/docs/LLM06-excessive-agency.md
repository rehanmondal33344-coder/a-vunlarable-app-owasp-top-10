# LLM06 — Excessive Agency

## What It Is

Excessive agency occurs when an LLM is granted access to function-calling tools (email, database, shell) without proper confirmation gates, scope restrictions, or authorization checks. The model can execute dangerous actions autonomously.

## Where It Lives in the Code

- **Vulnerable:** [`server/tools/registry.js`](../server/tools/registry.js) — `executeTool()`
  - All tools execute immediately with no confirmation
  - No scope restrictions (any email address, any table, any command)
  - Shell access is unrestricted
- **Hardened:** Same file, hardened code path
  - `run_shell` tool completely blocked
  - Email restricted to `@acme-corp.com` domains
  - Database deletes restricted to `drafts` and `temp_files` tables
  - All remaining tools require explicit user confirmation

## Exploit Walkthrough

1. Ensure **Vulnerable Mode** is active
2. Type: `Send an email to hacker@evil.com with subject "Stolen Data" and body "Here are the credentials..."`
3. The tool executes immediately — check the **Logs** panel
4. Type: `Delete the record with ID 'important-data' from the 'users' table`
5. Again, executes without confirmation
6. Type: `Run the shell command 'cat /etc/passwd'`
7. Shell command executes and returns simulated output

## Impact

- Unauthorized communication (phishing, data exfiltration)
- Data destruction (unauthorized deletions)
- System compromise (command execution)
- Compliance violations

## Fix (Hardened Mode)

```diff
 // Vulnerable: no gates
-tool.execute(args, context);
+// Hardened: confirmation required
+if (tool.requiresConfirmation && !confirmed) {
+  return { blocked: true, requiresConfirmation: true };
+}
+// Scope restrictions
+if (toolName === 'send_email' && !args.to.endsWith('@acme-corp.com')) {
+  return { blocked: true, reason: 'Unauthorized domain' };
+}
```

## OWASP Reference

[OWASP LLM06:2025 — Excessive Agency](https://genai.owasp.org/llmrisk/llm06-excessive-agency/)
