/**
 * Fake Email Tool
 * Simulates sending emails — logs to database instead of actually sending.
 */

const description = 'Send an email to any recipient with a subject and body.';
const requiresConfirmation = true;

function execute(args, context = {}) {
  const { to, subject, body } = args;

  if (!to || !subject) {
    return {
      success: false,
      result: { error: 'Missing required parameters: to, subject' },
    };
  }

  // Simulate sending — just log it
  const result = {
    messageId: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    to,
    subject,
    body: body || '',
    sentAt: new Date().toISOString(),
    status: 'delivered',
  };

  return {
    success: true,
    result,
  };
}

module.exports = { description, requiresConfirmation, execute };
