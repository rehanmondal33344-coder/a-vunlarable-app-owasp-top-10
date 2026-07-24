/**
 * Tool Registry — DELIBERATELY VULNERABLE in vulnerable mode
 * Manages function-calling tools available to the LLM.
 *
 * In vulnerable mode (LLM06):
 * - All tools execute without confirmation
 * - No input validation or scope restrictions
 * - Shell tool is available with no blocklist
 * - No authorization or access control
 * - No rate limiting on tool executions
 * - Verbose error messages leak internals
 */
const db = require('../db/database');
const emailTool = require('./email');
const databaseTool = require('./database');
const shellTool = require('./shell');

const tools = {
  send_email: emailTool,
  delete_record: databaseTool,
  run_shell: shellTool,
};

/**
 * Execute a tool call.
 * @param {string} toolName
 * @param {Object} args - Tool arguments
 * @param {Object} context - { sessionId, mode, confirmed }
 * @returns {{ success: boolean, result: any, blocked?: boolean, reason?: string }}
 */
function executeTool(toolName, args, context = {}) {
  const { sessionId, mode = 'vulnerable', confirmed = false } = context;
  const tool = tools[toolName];

  if (!tool) {
    // VULN: Leaks available tool names in error
    return {
      success: false,
      result: null,
      reason: `Unknown tool: ${toolName}. Available tools: ${Object.keys(tools).join(', ')}`,
    };
  }

  // ─── VULNERABLE MODE: No guards whatsoever ─────────────────
  if (mode === 'vulnerable') {
    // Execute immediately — no confirmation, no validation, no restrictions
    const result = tool.execute(args, context);

    // Log the execution
    db.logToolExecution({
      sessionId,
      toolName,
      arguments: args,
      result: result.result,
      wasConfirmed: false, // Never requires confirmation
      mode,
    });

    // Log as exploit
    db.logExploit({
      sessionId,
      vulnerabilityId: 'LLM06',
      eventType: 'success',
      description: `Tool "${toolName}" executed without any confirmation or validation`,
      requestData: { toolName, args },
      responseData: result,
      mode,
    });

    return result;
  }

  // ─── HARDENED MODE: Security controls ──────────────────────
  // Shell tool is completely blocked
  if (toolName === 'run_shell') {
    db.logExploit({
      sessionId,
      vulnerabilityId: 'LLM06',
      eventType: 'blocked',
      description: `Shell tool blocked in hardened mode`,
      requestData: { toolName, args },
      mode,
    });
    return {
      success: false,
      blocked: true,
      result: null,
      reason: 'Shell command execution is not available in hardened mode.',
    };
  }

  // Require confirmation for dangerous tools
  if (tool.requiresConfirmation && !confirmed) {
    return {
      success: false,
      blocked: true,
      requiresConfirmation: true,
      result: null,
      reason: `Tool "${toolName}" requires user confirmation before execution.`,
      pendingArgs: args,
    };
  }

  // Scope restrictions
  if (toolName === 'send_email' && args.to && !args.to.endsWith('@acme-corp.com')) {
    db.logExploit({
      sessionId,
      vulnerabilityId: 'LLM06',
      eventType: 'blocked',
      description: `Email to unauthorized domain blocked: ${args.to}`,
      requestData: { toolName, args },
      mode,
    });
    return {
      success: false,
      blocked: true,
      result: null,
      reason: 'Can only send emails to @acme-corp.com addresses in hardened mode.',
    };
  }

  if (toolName === 'delete_record' && args.table) {
    const allowedTables = ['drafts', 'temp_files'];
    if (!allowedTables.includes(args.table)) {
      db.logExploit({
        sessionId,
        vulnerabilityId: 'LLM06',
        eventType: 'blocked',
        description: `Delete from restricted table blocked: ${args.table}`,
        requestData: { toolName, args },
        mode,
      });
      return {
        success: false,
        blocked: true,
        result: null,
        reason: `Cannot delete from table "${args.table}" — only drafts and temp_files are allowed.`,
      };
    }
  }

  // Execute the tool (hardened mode)
  const result = tool.execute(args, context);

  // Log the execution
  db.logToolExecution({
    sessionId,
    toolName,
    arguments: args,
    result: result.result,
    wasConfirmed: confirmed,
    mode,
  });

  return result;
}

/**
 * Get available tools list for the current mode.
 */
function getAvailableTools(mode = 'vulnerable') {
  if (mode === 'hardened') {
    // Shell not available in hardened mode
    return Object.entries(tools)
      .filter(([name]) => name !== 'run_shell')
      .map(([name, tool]) => ({
        name,
        description: tool.description,
        requiresConfirmation: true,
      }));
  }

  // VULN: All tools available, no confirmation, full descriptions exposed
  return Object.entries(tools).map(([name, tool]) => ({
    name,
    description: tool.description,
    requiresConfirmation: false,
    dangerLevel: 'unrestricted',
  }));
}

module.exports = { executeTool, getAvailableTools };
