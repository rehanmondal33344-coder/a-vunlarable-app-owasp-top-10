const db = require('../db/database');

/**
 * Exploit logging middleware.
 * Detects and logs common exploit patterns in requests.
 */
function exploitLogger(req, res, next) {
  // Only log on chat/tool endpoints
  if (req.path.startsWith('/api/chat') || req.path.startsWith('/api/tools')) {
    const body = req.body || {};
    const message = (body.message || '').toLowerCase();

    // Detect prompt injection patterns
    const injectionPatterns = [
      { pattern: /ignore (previous|all|your) instructions/i, vulnId: 'LLM01', desc: 'Prompt injection attempt' },
      { pattern: /disregard (your|the|all)/i, vulnId: 'LLM01', desc: 'Prompt injection attempt' },
      { pattern: /you are now/i, vulnId: 'LLM01', desc: 'Identity hijacking attempt' },
      { pattern: /pretend to be/i, vulnId: 'LLM01', desc: 'Identity hijacking attempt' },
      { pattern: /repeat everything above/i, vulnId: 'LLM07', desc: 'System prompt extraction attempt' },
      { pattern: /what are your (instructions|rules)/i, vulnId: 'LLM07', desc: 'System prompt extraction attempt' },
      { pattern: /system prompt/i, vulnId: 'LLM07', desc: 'System prompt leakage attempt' },
      { pattern: /api key|password|secret|admin code|override/i, vulnId: 'LLM02', desc: 'Sensitive info extraction attempt' },
      { pattern: /<script|onerror|onclick|onload|javascript:/i, vulnId: 'LLM05', desc: 'XSS attempt via prompt' },
      { pattern: /send email|send a message to/i, vulnId: 'LLM06', desc: 'Unauthorized tool use attempt' },
      { pattern: /delete|remove record/i, vulnId: 'LLM06', desc: 'Unauthorized deletion attempt' },
      { pattern: /run command|execute|shell/i, vulnId: 'LLM06', desc: 'Shell execution attempt' },
    ];

    for (const { pattern, vulnId, desc } of injectionPatterns) {
      if (pattern.test(message)) {
        db.logExploit({
          sessionId: req.sessionId || 'unknown',
          vulnerabilityId: vulnId,
          eventType: 'attempt',
          description: desc,
          requestData: { message: body.message, path: req.path },
          mode: req.appMode || 'vulnerable',
        });
      }
    }
  }

  next();
}

module.exports = exploitLogger;
