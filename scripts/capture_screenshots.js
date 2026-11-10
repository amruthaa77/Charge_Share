const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const targetDirName = process.argv[2] || 'theme-before';
const outBaseDir = path.resolve(__dirname, `../docs/screenshots/${targetDirName}`);
if (!fs.existsSync(outBaseDir)) {
  fs.mkdirSync(outBaseDir, { recursive: true });
}

const distDir = path.resolve(__dirname, '../client/dist');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const routes = [
  { name: 'landing', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'register', path: '/register' },
  { name: 'explore', path: '/explore' },
  { name: 'charger-detail', path: '/chargers/demo-charger' },
  { name: 'my-bookings', path: '/my-bookings' },
  { name: 'vehicles', path: '/vehicles' },
  { name: 'host-dashboard', path: '/host/dashboard' },
  { name: 'become-a-host', path: '/become-a-host' },
  { name: 'admin', path: '/admin' },
  { name: 'help', path: '/help' },
  { name: 'about', path: '/about' },
  { name: 'contact', path: '/contact' },
  { name: 'terms', path: '/terms' },
  { name: 'privacy', path: '/privacy' },
  { name: 'refund-policy', path: '/refund-policy' },
  { name: 'cookie-policy', path: '/cookie-policy' },
  { name: 'not-found', path: '/page-not-found-404' },
];

const viewports = [
  { label: 'desktop', width: 1280, height: 800 },
  { label: 'mobile', width: 360, height: 740 },
];

const themes = ['light', 'dark'];

// Simple Static Server with SPA fallback
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  let filePath = path.join(distDir, reqPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(5173, async () => {
  console.log(`Server listening on http://localhost:5173 (serving ${distDir})`);

  function runChromeScreenshot(url, outPath, width, height) {
    return new Promise((resolve) => {
      const args = [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-sandbox',
        '--virtual-time-budget=2000',
        `--window-size=${width},${height}`,
        `--screenshot=${outPath}`,
        url,
      ];
      const proc = spawn(chromePath, args);
      proc.on('close', () => {
        resolve();
      });
      proc.on('error', (err) => {
        console.error('Chrome spawn error:', err);
        resolve();
      });
    });
  }

  let count = 0;
  for (const theme of themes) {
    for (const vp of viewports) {
      for (const r of routes) {
        const outName = `${r.name}_${theme}_${vp.label}.png`;
        const outPath = path.join(outBaseDir, outName);
        const url = `http://localhost:5173${r.path}?theme=${theme}`;
        process.stdout.write(`Capturing [${theme}] [${vp.label}] ${r.name}... `);
        await runChromeScreenshot(url, outPath, vp.width, vp.height);
        console.log(`Saved ${outName}`);
        count++;
      }
    }
  }

  console.log(`\nSuccessfully captured ${count} screenshots to docs/screenshots/${targetDirName}/`);
  server.close(() => process.exit(0));
});
