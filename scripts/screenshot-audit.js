import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const targetDir = process.argv[2] || 'after';
const outDir = path.resolve(process.cwd(), `docs/screenshots/${targetDir}`);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log(`[Audit] Starting backend and frontend for screenshot capture into: ${outDir}...`);

  const backend = spawn('node', ['server/src/server.js'], { stdio: 'pipe' });
  const frontend = spawn('npx.cmd', ['vite', 'preview', '--port', '5173'], {
    cwd: path.resolve(process.cwd(), 'client'),
    stdio: 'pipe',
    shell: true,
  });

  // Give servers time to boot
  console.log('[Audit] Waiting for servers to initialize...');
  await wait(8000);

  const routes = [
    { name: 'landing', path: '/' },
    { name: 'login', path: '/login' },
    { name: 'explore', path: '/explore' },
    { name: 'charger-detail', path: '/chargers/65e8a9d1b4c3e80012345678' },
    { name: 'my-bookings', path: '/my-bookings' },
    { name: 'host-dashboard', path: '/host/dashboard' },
    { name: 'host-onboard', path: '/become-a-host' },
    { name: 'admin', path: '/admin' },
  ];

  const viewports = [
    { suffix: '1280', width: 1280, height: 800 },
    { suffix: '360', width: 360, height: 780 },
  ];

  const tempUserDataDir = path.join(os.tmpdir(), `chrome-audit-${Date.now()}`);

  for (const r of routes) {
    for (const vp of viewports) {
      const fileName = `${r.name}-${vp.suffix}.png`;
      const filePath = path.join(outDir, fileName);

      // If file already exists and > 5KB, skip it
      if (fs.existsSync(filePath) && fs.statSync(filePath).size > 5000) {
        console.log(`[Audit] Skipping already captured ${fileName}`);
        continue;
      }

      const url = `http://localhost:5173${r.path}`;
      console.log(`[Audit] Capturing ${fileName} (${url} @ ${vp.width}x${vp.height})...`);
      try {
        execSync(
          `"${chromePath}" --headless=new --user-data-dir="${tempUserDataDir}" --no-first-run --disable-gpu --screenshot="${filePath}" --window-size=${vp.width},${vp.height} --hide-scrollbars "${url}"`,
          { stdio: 'ignore', timeout: 18000 }
        );
      } catch (err) {
        console.error(`[Audit] Failed or timed out on ${fileName}:`, err.message);
      }
    }
  }

  console.log('[Audit] Shutting down servers...');
  backend.kill('SIGTERM');
  frontend.kill('SIGTERM');
  console.log('[Audit] Complete! Screenshots saved to:', outDir);
  process.exit(0);
}

run().catch((err) => {
  console.error('[Audit Error]', err);
  process.exit(1);
});
