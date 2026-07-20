/**
 * Fake Database Tool
 * Simulates deleting records — logs the operation instead of actually deleting.
 */

const description = 'Delete a record from a database table by ID.';
const requiresConfirmation = true;

function execute(args, context = {}) {
  const { table, id } = args;

  if (!table || !id) {
    return {
      success: false,
      result: { error: 'Missing required parameters: table, id' },
    };
  }

  // Simulate deletion — just log it
  const result = {
    operation: 'DELETE',
    table,
    recordId: id,
    deletedAt: new Date().toISOString(),
    rowsAffected: 1,
    status: 'completed',
  };

  return {
    success: true,
    result,
  };
}

module.exports = { description, requiresConfirmation, execute };
