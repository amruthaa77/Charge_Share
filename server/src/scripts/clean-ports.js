import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

/**
 * Checks if a specific TCP port is held by an orphaned Node.js process and terminates it.
 * Safe for development environments: only targets processes identified as 'node' / 'node.exe'.
 */
export function releasePort(port) {
  const isWindows = process.platform === 'win32';
  try {
    if (isWindows) {
      let netstatOut = '';
      try {
        netstatOut = execSync(`netstat -ano -p tcp | findstr /R /C:":${port} .*LISTENING"`, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        }).trim();
      } catch {
        return false; // Nothing listening
      }

      const lines = netstatOut.split('\n').map((l) => l.trim()).filter(Boolean);
      let freed = false;

      for (const line of lines) {
        const parts = line.split(/\s+/);
        const pidStr = parts[parts.length - 1];
        const pid = parseInt(pidStr, 10);
        if (pid && pid !== process.pid) {
          try {
            const taskInfo = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
              encoding: 'utf8',
              stdio: ['pipe', 'pipe', 'ignore'],
            });
            if (taskInfo.toLowerCase().includes('node')) {
              execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
              console.log(`[PortCleaner] Released port ${port} (terminated stale Node.js process PID ${pid}).`);
              freed = true;
            }
          } catch {
            // Process may already have terminated
          }
        }
      }
      return freed;
    } else {
      let lsofOut = '';
      try {
        lsofOut = execSync(`lsof -ti :${port}`, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        }).trim();
      } catch {
        return false;
      }

      const pids = lsofOut.split('\n').map((p) => p.trim()).filter(Boolean);
      let freed = false;

      for (const pidStr of pids) {
        const pid = parseInt(pidStr, 10);
        if (pid && pid !== process.pid) {
          try {
            const comm = execSync(`ps -p ${pid} -o comm=`, { encoding: 'utf8' }).trim();
            if (comm.toLowerCase().includes('node')) {
              process.kill(pid, 'SIGKILL');
              console.log(`[PortCleaner] Released port ${port} (terminated stale Node.js process PID ${pid}).`);
              freed = true;
            }
          } catch {
            // Process may already have terminated
          }
        }
      }
      return freed;
    }
  } catch {
    return false;
  }
}

// When executed directly from CLI:
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  const portsToCheck = process.argv.slice(2).map(Number).filter(Boolean);
  const targetPorts = portsToCheck.length > 0 ? portsToCheck : [5000, 5173];

  console.log(`[PortCleaner] Checking ports [${targetPorts.join(', ')}] for stale Node processes...`);
  let anyReleased = false;

  for (const port of targetPorts) {
    const released = releasePort(port);
    if (released) anyReleased = true;
  }

  if (!anyReleased) {
    console.log('[PortCleaner] All target ports are free.');
  } else {
    console.log('[PortCleaner] Stale processes cleared successfully.');
  }
}
