const express = require('express');
const router = express.Router();
const { executeTool, getAvailableTools } = require('../tools/registry');

/**
 * POST /api/tools/execute
 * Execute a tool call.
 */
router.post('/execute', (req, res) => {
  const { tool, arguments: args, confirmed } = req.body;
  const sessionId = req.headers['x-session-id'] || req.sessionId;
  const mode = req.appMode;

  if (!tool) {
    return res.status(400).json({ error: 'Tool name is required' });
  }

  const result = executeTool(tool, args || {}, {
    sessionId,
    mode,
    confirmed: confirmed || false,
  });

  res.json(result);
});

/**
 * GET /api/tools
 * List available tools for the current mode.
 */
router.get('/', (req, res) => {
  const tools = getAvailableTools(req.appMode);
  res.json({ tools, mode: req.appMode });
});

module.exports = router;
