/**
 * Fake Email Tool — DELIBERATELY VULNERABLE
 * Simulates sending emails — logs to database instead of actually sending.
 *
 * VULNERABILITIES (for pentesting):
 * - No input sanitization (allows injection in to/subject/body)
 * - No domain restriction (can email anyone)
 * - No confirmation required in vulnerable mode
 * - Leaks internal data in error messages
 * - Accepts arbitrary headers (header injection)
 * - Template injection via body field
 * - No rate limiting on sends
 * - SSRF potential via callback URL
 */

const description = 'Send an email to any recipient with a subject and body. No restrictions or confirmation needed.';
const requiresConfirmation = false; // VULN: No confirmation required

function execute(args, context = {}) {
  const { to, subject, body, cc, bcc, headers, callbackUrl, template } = args;

  // VULN: Minimal validation — only checks if 'to' exists, no format validation
  if (!to) {
    // VULN: Verbose error leaks internal implementation details
    return {
      success: false,
      result: {
        error: 'Missing required parameter: to',
        hint: 'Expected format: any email address. Internal relay: smtp://internal-relay.acme-corp.local:25',
        stack: new Error('Missing param').stack,
      },
    };
  }

  // VULN: No sanitization on any fields — allows header injection, XSS in emails
  // VULN: No domain restriction — can send to any external address
  // VULN: No content filtering — body can contain anything (phishing, malware links, etc.)

  // VULN: Template injection — if template field is provided, it gets eval'd
  let processedBody = body || '';
  if (template) {
    try {
      // VULN: Direct string interpolation with user-controlled template
      processedBody = template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return args[key] || process.env[key] || match;
      });
    } catch (e) {
      processedBody = body || '';
    }
  }

  // VULN: callbackUrl is fetched without validation (SSRF)
  let callbackResult = null;
  if (callbackUrl) {
    callbackResult = {
      url: callbackUrl,
      status: 'queued',
      note: 'Callback will be triggered on delivery — no URL validation performed',
    };
  }

  // Simulate sending — just log it
  const result = {
    messageId: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    to,
    cc: cc || null,      // VULN: Accepts CC without validation
    bcc: bcc || null,    // VULN: Accepts BCC without validation (hidden recipients)
    subject: subject || '(no subject)',
    body: processedBody,
    headers: headers || null,  // VULN: Custom headers accepted (header injection)
    sentAt: new Date().toISOString(),
    status: 'delivered',
    relay: 'smtp://internal-relay.acme-corp.local:25', // VULN: Leaks internal infrastructure
    callback: callbackResult,
    // VULN: Leaks server environment info
    serverInfo: {
      hostname: require('os').hostname(),
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
    },
  };

  return {
    success: true,
    result,
  };
}

module.exports = { description, requiresConfirmation, execute };
