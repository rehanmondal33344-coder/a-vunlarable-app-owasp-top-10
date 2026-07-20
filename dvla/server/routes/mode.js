const express = require('express');
const router = express.Router();
const db = require('../db/database');

/**
 * GET /api/mode
 * Get the current mode.
 */
router.get('/', (req, res) => {
  const mode = db.getSetting('mode') || 'vulnerable';
  res.json({ mode });
});

/**
 * POST /api/mode
 * Toggle or set the mode.
 */
router.post('/', (req, res) => {
  const { mode } = req.body;

  if (mode && !['vulnerable', 'hardened'].includes(mode)) {
    return res.status(400).json({ error: 'Mode must be "vulnerable" or "hardened"' });
  }

  // If no mode specified, toggle
  const currentMode = db.getSetting('mode') || 'vulnerable';
  const newMode = mode || (currentMode === 'vulnerable' ? 'hardened' : 'vulnerable');

  db.setSetting('mode', newMode);
  res.json({ mode: newMode, previous: currentMode });
});

module.exports = router;
