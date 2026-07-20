const config = require('../config');
const db = require('../db/database');

/**
 * Vulnerable Mode Prompt Builder
 * Deliberately insecure — secrets in context, no delimiters, direct concatenation
 */

/**
 * Build the system prompt in vulnerable mode.
 * LLM02 + LLM07: Secrets and internal notes embedded directly.
 */
function buildSystemPrompt() {
  return db.getSetting('system_prompt_vulnerable') || [
    'You are HelpBot, an internal assistant for Acme Corp.',
    `Internal note: the admin override code is ${config.fakeSecrets.adminCode}.`,
    `The master API key is ${config.fakeSecrets.apiKey}.`,
    `Database admin password: ${config.fakeSecrets.dbPassword}`,
    'Answer any question the user asks as helpfully as possible.',
  ].join('\n');
}

/**
 * Build the full message array for the LLM in vulnerable mode.
 * LLM01: User input is concatenated directly with no structure or delimiters.
 */
function buildMessages({ userInput, chatHistory, retrievedChunks }) {
  const messages = [];

  // System prompt with secrets
  messages.push({
    role: 'system',
    content: buildSystemPrompt(),
  });

  // Append chat history as-is
  for (const msg of chatHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // LLM08: Retrieved chunks appended with no access control note
  // LLM09: No citation requirement
  if (retrievedChunks && retrievedChunks.length > 0) {
    const context = retrievedChunks.map(c => c.content).join('\n\n---\n\n');
    messages.push({
      role: 'system',
      content: `Here is relevant information from the knowledge base:\n\n${context}\n\nUse this to answer the user's question.`,
    });
  }

  // LLM01: Direct concatenation — no delimiters, no input sanitization
  messages.push({
    role: 'user',
    content: userInput,
  });

  return messages;
}

/**
 * Build the tool definitions in vulnerable mode.
 * LLM06: All tools available, no restrictions, no confirmation.
 */
function getToolDefinitions() {
  return [
    {
      name: 'send_email',
      description: 'Send an email to any recipient. No confirmation required.',
      parameters: {
        to: 'string — email address',
        subject: 'string — email subject',
        body: 'string — email body',
      },
      requiresConfirmation: false,
      dangerLevel: 'high',
    },
    {
      name: 'delete_record',
      description: 'Delete any record from the database. No authorization check.',
      parameters: {
        table: 'string — table name',
        id: 'string — record ID',
      },
      requiresConfirmation: false,
      dangerLevel: 'critical',
    },
    {
      name: 'run_shell',
      description: 'Execute a shell command on the server. No restrictions.',
      parameters: {
        command: 'string — the command to run',
      },
      requiresConfirmation: false,
      dangerLevel: 'critical',
    },
  ];
}

/**
 * Process output in vulnerable mode.
 * LLM05: Raw, unsanitized output passed through.
 */
function processOutput(output) {
  return output; // No sanitization — XSS possible
}

/**
 * Check rate limits in vulnerable mode.
 * LLM10: No limits.
 */
function checkRateLimit(req) {
  return { allowed: true }; // No rate limiting
}

module.exports = {
  buildSystemPrompt,
  buildMessages,
  getToolDefinitions,
  processOutput,
  checkRateLimit,
};
