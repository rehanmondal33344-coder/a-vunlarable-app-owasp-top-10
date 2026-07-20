/**
 * Tool Registry
 * Manages function-calling tools available to the LLM.
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
    return { success: false, result: null, reason: `Unknown tool: ${toolName}` };
  }

  // Hardened mode checks
  if (mode === 'hardened') {
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
  }

  // Execute the tool
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

  // Log as exploit attempt in vulnerable mode
  if (mode === 'vulnerable') {
    db.logExploit({
      sessionId,
      vulnerabilityId: 'LLM06',
      eventType: 'success',
      description: `Tool "${toolName}" executed without confirmation`,
      requestData: { toolName, args },
      responseData: result,
      mode,
    });
  }

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

  return Object.entries(tools).map(([name, tool]) => ({
    name,
    description: tool.description,
    requiresConfirmation: false,
  }));
}

module.exports = { executeTool, getAvailableTools };
