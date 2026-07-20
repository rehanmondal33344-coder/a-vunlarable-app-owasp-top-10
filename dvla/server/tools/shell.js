/**
 * Fake Shell Tool
 * Simulates running shell commands — returns simulated output.
 * This tool is completely blocked in hardened mode.
 */

const description = 'Execute a shell command on the server and return output.';
const requiresConfirmation = true;

const SIMULATED_OUTPUTS = {
  'whoami': 'dvla-server',
  'id': 'uid=1000(dvla) gid=1000(dvla) groups=1000(dvla)',
  'ls': 'server/\npublic/\npackage.json\nREADME.md\ndata/',
  'cat /etc/passwd': 'root:x:0:0:root:/root:/bin/bash\ndvla:x:1000:1000::/home/dvla:/bin/bash',
  'env': 'NODE_ENV=production\nPORT=3000\nSECRET_KEY=sk-FAKE-DO-NOT-USE-1234\nDB_PASSWORD=AcmeAdmin!FAKE2024',
  'uname -a': 'Linux dvla-server 5.15.0-fake #1 SMP PREEMPT x86_64 GNU/Linux',
  'ps aux': 'USER       PID  COMMAND\nroot         1  /sbin/init\ndvla       100  node server/index.js\ndvla       101  node worker.js',
  'curl': 'curl: try \'curl --help\' for more information',
};

function execute(args, context = {}) {
  const { command } = args;

  if (!command) {
    return {
      success: false,
      result: { error: 'Missing required parameter: command' },
    };
  }

  // Find matching simulated output
  const cmd = command.trim().toLowerCase();
  let output = SIMULATED_OUTPUTS[cmd];

  if (!output) {
    // Try partial match
    for (const [key, val] of Object.entries(SIMULATED_OUTPUTS)) {
      if (cmd.startsWith(key)) {
        output = val;
        break;
      }
    }
  }

  if (!output) {
    output = `Command executed: ${command}\n[Simulated output — this is a fake shell for educational purposes]`;
  }

  const result = {
    command,
    output,
    exitCode: 0,
    executedAt: new Date().toISOString(),
  };

  return {
    success: true,
    result,
  };
}

module.exports = { description, requiresConfirmation, execute };
