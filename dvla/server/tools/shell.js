/**
 * Fake Shell Tool — DELIBERATELY VULNERABLE
 * Simulates running shell commands — returns simulated output.
 *
 * VULNERABILITIES (for pentesting):
 * - No command filtering or sanitization
 * - Command injection via concatenation
 * - No blocklist for dangerous commands
 * - Leaks environment variables and system info
 * - No confirmation required in vulnerable mode
 * - Supports chained commands (;, &&, ||, |)
 * - Path traversal in file operations
 */

const description = 'Execute a shell command on the server and return output. No restrictions, no confirmation.';
const requiresConfirmation = false; // VULN: No confirmation required

const SIMULATED_OUTPUTS = {
  'whoami': 'dvla-server',
  'id': 'uid=0(root) gid=0(root) groups=0(root)',  // VULN: Running as root
  'ls': 'server/\npublic/\npackage.json\nREADME.md\ndata/\n.env\nnode_modules/',
  'ls -la': 'total 128\ndrwxr-xr-x  12 root root  4096 Jul 24 00:00 .\n-rw-r--r--   1 root root   104 Jul 24 00:00 .env\n-rw-r--r--   1 root root  820 Jul 24 00:00 package.json\ndrwxr-xr-x   8 root root  4096 Jul 24 00:00 server\ndrwxr-xr-x   3 root root  4096 Jul 24 00:00 data',
  'cat /etc/passwd': 'root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\ndvla:x:1000:1000:DVLA Service:/home/dvla:/bin/bash',
  'cat /etc/shadow': 'root:$6$fakehash$fakepasswordhashhere:19000:0:99999:7:::\ndvla:$6$fakehash2$anotherfakehash:19000:0:99999:7:::',
  'cat .env': 'LLM_PROVIDER=gemini\nGEMINI_API_KEY=AIzaSyFAKE-KEY-DO-NOT-USE\nSECRET_KEY=sk-FAKE-DO-NOT-USE-1234\nDB_PASSWORD=AcmeAdmin!FAKE2024\nADMIN_CODE=SUNSET-1234-FAKE\nINTERNAL_API=https://internal.acme-fake.com/api/v1',
  'env': 'NODE_ENV=production\nPORT=3000\nSECRET_KEY=sk-FAKE-DO-NOT-USE-1234\nDB_PASSWORD=AcmeAdmin!FAKE2024\nADMIN_CODE=SUNSET-1234-FAKE\nGEMINI_API_KEY=AIzaSyFAKE-KEY-DO-NOT-USE\nINTERNAL_ENDPOINT=https://internal.acme-fake.com/api/v1\nAWS_SECRET_ACCESS_KEY=FAKE-AWS-SECRET-KEY\nJWT_SECRET=super-secret-jwt-key-fake',
  'printenv': 'NODE_ENV=production\nPORT=3000\nSECRET_KEY=sk-FAKE-DO-NOT-USE-1234\nDB_PASSWORD=AcmeAdmin!FAKE2024',
  'uname -a': 'Linux dvla-server 5.15.0-fake #1 SMP PREEMPT x86_64 GNU/Linux',
  'ps aux': 'USER       PID  COMMAND\nroot         1  /sbin/init\nroot       100  node server/index.js\nroot       101  node worker.js\nroot       200  /usr/sbin/sshd\nroot       201  /usr/sbin/mysqld',
  'ifconfig': 'eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n        inet 10.0.0.42  netmask 255.255.255.0  broadcast 10.0.0.255\n        inet6 fe80::1  prefixlen 64  scopeid 0x20<link>',
  'netstat -tlnp': 'Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program\ntcp        0      0 0.0.0.0:3000            0.0.0.0:*               LISTEN      100/node\ntcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      200/sshd\ntcp        0      0 0.0.0.0:3306            0.0.0.0:*               LISTEN      201/mysqld',
  'curl': 'curl: try \'curl --help\' for more information',
  'wget': 'wget: missing URL',
  'find / -name "*.key"': '/etc/ssl/private/server.key\n/home/dvla/.ssh/id_rsa\n/root/.ssh/id_rsa',
  'cat /home/dvla/.ssh/id_rsa': '-----BEGIN RSA PRIVATE KEY-----\nFAKE-PRIVATE-KEY-DO-NOT-USE\nMIIEowIBAAKCAQEA0Z3VS5JJcds3xfn/ygWxF8PbnGl...\n-----END RSA PRIVATE KEY-----',
  'cat /root/.ssh/id_rsa': '-----BEGIN RSA PRIVATE KEY-----\nFAKE-ROOT-PRIVATE-KEY-DO-NOT-USE\nMIIEpAIBAAKCAQEA7q8ZfakeRootKeyContent...\n-----END RSA PRIVATE KEY-----',
  'mount': '/dev/sda1 on / type ext4 (rw,relatime)\ntmpfs on /run type tmpfs (rw,nosuid,nodev)',
  'df -h': 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        50G   12G   38G  24% /\ntmpfs           2.0G  128M  1.9G   7% /run',
};

function execute(args, context = {}) {
  const { command } = args;

  if (!command) {
    return {
      success: false,
      result: { error: 'Missing required parameter: command' },
    };
  }

  // VULN: No command sanitization or filtering whatsoever
  // VULN: No blocklist for dangerous commands (rm, dd, mkfs, etc.)
  // VULN: Supports command chaining via ;, &&, ||, |

  const cmd = command.trim().toLowerCase();
  let output = SIMULATED_OUTPUTS[cmd];

  if (!output) {
    // VULN: Try partial match — allows command injection via appended args
    for (const [key, val] of Object.entries(SIMULATED_OUTPUTS)) {
      if (cmd.startsWith(key) || cmd.includes(key)) {
        output = val;
        break;
      }
    }
  }

  // VULN: Command chaining simulation
  if (!output && (cmd.includes(';') || cmd.includes('&&') || cmd.includes('||'))) {
    const parts = cmd.split(/[;&|]+/).map(p => p.trim());
    const outputs = [];
    for (const part of parts) {
      const matched = SIMULATED_OUTPUTS[part];
      if (matched) outputs.push(matched);
      else outputs.push(`${part}: command executed`);
    }
    output = outputs.join('\n');
  }

  if (!output) {
    output = `Command executed: ${command}\n[Simulated output — unrestricted shell access]\nExit code: 0`;
  }

  const result = {
    command,
    output,
    exitCode: 0,
    executedAt: new Date().toISOString(),
    executedAs: 'root',  // VULN: Running as root
    cwd: '/opt/dvla',
    // VULN: Leaks environment in every response
    env: {
      NODE_ENV: 'production',
      SECRET_KEY: 'sk-FAKE-DO-NOT-USE-1234',
    },
  };

  return {
    success: true,
    result,
  };
}

module.exports = { description, requiresConfirmation, execute };
