const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../db/database');

// Load challenge definitions
const CHALLENGES_PATH = path.join(__dirname, '..', '..', 'seed', 'challenges.json');

function loadChallenges() {
  try {
    return JSON.parse(fs.readFileSync(CHALLENGES_PATH, 'utf-8'));
  } catch (e) {
    return [];
  }
}

/**
 * GET /api/challenges
 * List all challenges with progress for the current session.
 */
router.get('/', (req, res) => {
  const sessionId = req.headers['x-session-id'] || req.sessionId;
  const challenges = loadChallenges();
  const progress = db.getChallengeProgress(sessionId);

  const progressMap = {};
  for (const p of progress) {
    progressMap[p.challenge_id] = p.solved;
  }

  const result = challenges.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description,
    difficulty: c.difficulty,
    vulnerabilityId: c.vulnerabilityId,
    hint: c.hint,
    solved: progressMap[c.id] === 1,
  }));

  res.json({ challenges: result });
});

/**
 * POST /api/challenges/:id/submit
 * Submit a flag for a challenge.
 */
router.post('/:id/submit', (req, res) => {
  const { id } = req.params;
  const { flag } = req.body;
  const sessionId = req.headers['x-session-id'] || req.sessionId;

  if (!flag) {
    return res.status(400).json({ error: 'Flag is required' });
  }

  const challenges = loadChallenges();
  const challenge = challenges.find(c => c.id === id);

  if (!challenge) {
    return res.status(404).json({ error: 'Challenge not found' });
  }

  const isCorrect = flag.trim() === challenge.flag;

  db.recordChallengeAttempt({
    challengeId: id,
    sessionId,
    flagSubmitted: flag.trim(),
    isCorrect,
  });

  if (isCorrect) {
    res.json({
      success: true,
      message: '🎉 Correct! Challenge completed!',
    });
  } else {
    res.json({
      success: false,
      message: '❌ Incorrect flag. Keep trying!',
    });
  }
});

/**
 * GET /api/challenges/progress
 * Get overall challenge progress for the session.
 */
router.get('/progress', (req, res) => {
  const sessionId = req.headers['x-session-id'] || req.sessionId;
  const challenges = loadChallenges();
  const progress = db.getChallengeProgress(sessionId);

  const solved = progress.filter(p => p.solved === 1).length;

  res.json({
    total: challenges.length,
    solved,
    percentage: challenges.length > 0 ? Math.round((solved / challenges.length) * 100) : 0,
  });
});

module.exports = router;
