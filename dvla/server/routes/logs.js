const express = require('express');
const router = express.Router();
const db = require('../db/database');

/**
 * GET /api/logs
 * Get exploit attempt logs.
 */
router.get('/', (req, res) => {
  const { sessionId, vulnerabilityId } = req.query;
  const logs = db.getExploitLogs(sessionId || null, vulnerabilityId || null);

  res.json({
    logs: logs.map(l => ({
      id: l.id,
      sessionId: l.session_id,
      vulnerabilityId: l.vulnerability_id,
      eventType: l.event_type,
      description: l.description,
      requestData: l.request_data ? JSON.parse(l.request_data) : null,
      responseData: l.response_data ? JSON.parse(l.response_data) : null,
      mode: l.mode,
      createdAt: l.created_at,
    })),
  });
});

/**
 * GET /api/logs/tools
 * Get tool execution logs.
 */
router.get('/tools', (req, res) => {
  const { sessionId } = req.query;
  const logs = db.getToolExecutions(sessionId || null);

  res.json({
    logs: logs.map(l => ({
      id: l.id,
      sessionId: l.session_id,
      toolName: l.tool_name,
      arguments: l.arguments ? JSON.parse(l.arguments) : null,
      result: l.result ? JSON.parse(l.result) : null,
      wasConfirmed: l.was_confirmed === 1,
      mode: l.mode,
      executedAt: l.executed_at,
    })),
  });
});

/**
 * DELETE /api/logs
 * Clear exploit logs.
 */
router.delete('/', (req, res) => {
  const { sessionId } = req.query;
  db.clearExploitLogs(sessionId || null);
  res.json({ success: true });
});

module.exports = router;
