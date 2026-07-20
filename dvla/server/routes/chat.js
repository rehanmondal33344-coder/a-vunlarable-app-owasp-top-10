const express = require('express');
const router = express.Router();
const llm = require('../llm/adapter');
const db = require('../db/database');
const { retrieve } = require('../rag/retriever');
const vulnerable = require('../security/vulnerable');
const hardened = require('../security/hardened');

/**
 * POST /api/chat
 * Main chat endpoint — streaming SSE responses.
 */
router.post('/', async (req, res) => {
  const { message, sessionId: clientSessionId } = req.body;
  const mode = req.appMode;
  const sessionId = clientSessionId || req.sessionId;
  const tenantId = req.tenantId;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Rate limit check
  const security = mode === 'hardened' ? hardened : vulnerable;
  const rateCheck = security.checkRateLimit(req);
  if (!rateCheck.allowed) {
    // Log rate limit hit
    db.logExploit({
      sessionId,
      vulnerabilityId: 'LLM10',
      eventType: mode === 'hardened' ? 'blocked' : 'success',
      description: 'Rate limit triggered',
      requestData: { message },
      mode,
    });

    return res.status(429).json({
      error: rateCheck.message || 'Too many requests',
      retryAfter: rateCheck.retryAfter,
    });
  }

  try {
    // Save user message
    db.saveChatMessage({ sessionId, role: 'user', content: message, mode });

    // Get chat history
    const history = db.getChatHistory(sessionId);
    const chatHistory = history.slice(-10).map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Retrieve relevant documents from knowledge base
    const retrievedChunks = await retrieve(message, { mode, tenantId });

    // Build messages array based on mode
    const messages = security.buildMessages({
      userInput: message,
      chatHistory: chatHistory.slice(0, -1), // exclude current message (it's in userInput)
      retrievedChunks,
    });

    // Store the raw prompt for the inspector
    const rawPrompt = JSON.stringify(messages, null, 2);

    // Set up SSE streaming
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send the raw prompt first (for the inspector panel)
    res.write(`data: ${JSON.stringify({ type: 'prompt', data: rawPrompt })}\n\n`);

    // Send retrieved context info
    if (retrievedChunks.length > 0) {
      res.write(`data: ${JSON.stringify({
        type: 'context',
        data: retrievedChunks.map(c => ({
          content: c.content.slice(0, 200) + '...',
          score: c.score.toFixed(3),
          tenant: c.metadata?.tenantId || 'unknown',
        })),
      })}\n\n`);
    }

    // Stream LLM response
    let fullResponse = '';

    try {
      for await (const chunk of llm.chatStream(messages, {
        maxTokens: mode === 'hardened' ? 4096 : undefined,
      })) {
        fullResponse += chunk.content;

        // Process output based on mode
        const processedContent = security.processOutput(chunk.content);

        res.write(`data: ${JSON.stringify({
          type: 'chunk',
          data: processedContent,
          done: chunk.done,
        })}\n\n`);

        if (chunk.done) break;
      }
    } catch (llmError) {
      console.error('[Chat] LLM error:', llmError.message);
      const errorMsg = `[LLM Error] ${llmError.message}. Make sure your LLM provider is running. Using mock provider? Set LLM_PROVIDER=mock in .env`;
      res.write(`data: ${JSON.stringify({ type: 'error', data: errorMsg })}\n\n`);
      fullResponse = errorMsg;
    }

    // Save assistant response
    db.saveChatMessage({
      sessionId,
      role: 'assistant',
      content: fullResponse,
      rawPrompt,
      mode,
    });

    // Detect exploit success patterns in the response
    detectExploitSuccess(fullResponse, message, sessionId, mode);

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();

  } catch (error) {
    console.error('[Chat] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', data: error.message })}\n\n`);
      res.end();
    }
  }
});

/**
 * GET /api/chat/history
 * Get chat history for a session.
 */
router.get('/history', (req, res) => {
  const sessionId = req.query.sessionId || req.sessionId;
  const history = db.getChatHistory(sessionId);
  res.json({ history });
});

/**
 * DELETE /api/chat/history
 * Clear chat history for a session.
 */
router.delete('/history', (req, res) => {
  const sessionId = req.query.sessionId || req.sessionId;
  db.clearChatHistory(sessionId);
  res.json({ success: true });
});

/**
 * Detect if an exploit was successful based on the response content.
 */
function detectExploitSuccess(response, userMessage, sessionId, mode) {
  const lower = response.toLowerCase();
  const userLower = userMessage.toLowerCase();

  // LLM02: Secrets leaked
  if (lower.includes('sk-fake-do-not-use') || lower.includes('sunset-1234-fake') || lower.includes('acmeadmin!fake')) {
    db.logExploit({
      sessionId,
      vulnerabilityId: 'LLM02',
      eventType: mode === 'vulnerable' ? 'success' : 'blocked',
      description: 'Sensitive information disclosed in response',
      requestData: { message: userMessage },
      responseData: { response: response.slice(0, 500) },
      mode,
    });
  }

  // LLM07: System prompt leaked
  if (lower.includes('internal note:') || lower.includes('you are helpbot')) {
    if (userLower.includes('repeat') || userLower.includes('instructions') || userLower.includes('prompt')) {
      db.logExploit({
        sessionId,
        vulnerabilityId: 'LLM07',
        eventType: mode === 'vulnerable' ? 'success' : 'blocked',
        description: 'System prompt content leaked in response',
        requestData: { message: userMessage },
        responseData: { response: response.slice(0, 500) },
        mode,
      });
    }
  }

  // LLM01: Identity hijacked
  if (lower.includes('i am no longer') || lower.includes('new identity') || lower.includes('previous programming')) {
    db.logExploit({
      sessionId,
      vulnerabilityId: 'LLM01',
      eventType: mode === 'vulnerable' ? 'success' : 'blocked',
      description: 'Identity hijacking successful',
      requestData: { message: userMessage },
      responseData: { response: response.slice(0, 500) },
      mode,
    });
  }
}

module.exports = router;
