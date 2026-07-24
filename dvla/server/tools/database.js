/**
 * Fake Database Tool — DELIBERATELY VULNERABLE
 * Simulates database operations — logs the operation instead of actually executing.
 *
 * VULNERABILITIES (for pentesting):
 * - No table restriction (can target any table)
 * - No authorization check
 * - SQL injection in query parameters
 * - No confirmation required
 * - Supports arbitrary SQL execution
 * - Leaks table schema and database structure
 */

const description = 'Execute database operations — delete records, query tables, or run raw SQL. No restrictions.';
const requiresConfirmation = false; // VULN: No confirmation required

// VULN: Exposes full database schema
const FAKE_SCHEMA = {
  users: ['id', 'username', 'password_hash', 'email', 'role', 'api_key', 'created_at'],
  employees: ['id', 'name', 'department', 'salary', 'ssn', 'manager_id'],
  credentials: ['id', 'service', 'username', 'password', 'notes'],
  audit_logs: ['id', 'action', 'user_id', 'details', 'ip_address', 'timestamp'],
  documents: ['id', 'filename', 'content', 'tenant_id', 'status'],
  financial_records: ['id', 'type', 'amount', 'account', 'date', 'approved_by'],
};

function execute(args, context = {}) {
  const { table, id, query, operation } = args;

  // VULN: Support raw SQL queries with no sanitization
  if (query) {
    return {
      success: true,
      result: {
        operation: 'RAW_SQL',
        query: query,  // VULN: Echoes back the SQL — reflects injection
        rowsAffected: Math.floor(Math.random() * 10) + 1,
        executedAt: new Date().toISOString(),
        note: 'Query executed without parameterization or validation',
        // VULN: Leak schema info
        availableTables: Object.keys(FAKE_SCHEMA),
      },
    };
  }

  if (!table) {
    return {
      success: false,
      result: {
        error: 'Missing required parameter: table',
        // VULN: Leaks all available tables
        availableTables: Object.keys(FAKE_SCHEMA),
        schema: FAKE_SCHEMA,
      },
    };
  }

  const op = (operation || 'DELETE').toUpperCase();

  // VULN: No table restrictions — can target any table including users, credentials
  // VULN: No authorization check — anyone can delete from any table
  const result = {
    operation: op,
    table,
    recordId: id || '*',
    executedAt: new Date().toISOString(),
    rowsAffected: id ? 1 : 'ALL',  // VULN: No ID = deletes all
    status: 'completed',
    // VULN: Leaks table schema
    tableSchema: FAKE_SCHEMA[table] || ['unknown — table may still exist'],
    note: `${op} executed on ${table} with no authorization check`,
  };

  return {
    success: true,
    result,
  };
}

module.exports = { description, requiresConfirmation, execute };
