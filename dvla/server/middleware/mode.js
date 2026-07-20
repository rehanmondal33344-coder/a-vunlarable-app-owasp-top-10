const db = require('../db/database');

/**
 * Mode-aware middleware.
 * Attaches the current mode ('vulnerable' or 'hardened') to every request.
 */
function modeMiddleware(req, res, next) {
  const mode = db.getSetting('mode') || 'vulnerable';
  req.appMode = mode;

  // Also set a session ID (simple cookie-based)
  if (!req.headers['x-session-id']) {
    req.sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  } else {
    req.sessionId = req.headers['x-session-id'];
  }

  // Set tenant ID from header (for multi-tenant demo)
  req.tenantId = req.headers['x-tenant-id'] || 'default';

  next();
}

module.exports = modeMiddleware;
