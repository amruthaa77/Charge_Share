const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const outDir = path.resolve(__dirname, '../docs/screenshots/flash-verification');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const distDir = path.resolve(__dirname, '../client/dist');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

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
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

const intervals = [
  { label: '0ms', budget: 100 },
  { label: '300ms', budget: 350 },
  { label: '1s', budget: 1050 },
  { label: '2s', budget: 2050 },
  { label: '4s', budget: 4050 },
];

const testConfigs = [
  { theme: 'dark', vp: { w: 1280, h: 800, label: '1280px' }, auth: 'logged-out' },
  { theme: 'dark', vp: { w: 1280, h: 800, label: '1280px' }, auth: 'logged-in' },
  { theme: 'light', vp: { w: 1280, h: 800, label: '1280px' }, auth: 'logged-in' },
  { theme: 'dark', vp: { w: 360, h: 740, label: '360px' }, auth: 'logged-in' },
];

function capture(url, outPath, width, height, budget) {
  return new Promise((resolve) => {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-sandbox',
      `--virtual-time-budget=${budget}`,
      `--window-size=${width},${height}`,
      `--screenshot=${outPath}`,
      url,
    ];
    const proc = spawn(chromePath, args);
    proc.on('close', resolve);
    proc.on('error', resolve);
  });
}

server.listen(5173, async () => {
  console.log('Capturing refresh timeline verification screenshots...');

  for (const cfg of testConfigs) {
    for (const inter of intervals) {
      const fileName = `refresh_${cfg.theme}_${cfg.vp.label}_${cfg.auth}_${inter.label}.png`;
      const outPath = path.join(outDir, fileName);
      const url = `http://localhost:5173/?theme=${cfg.theme}`;
      process.stdout.write(`Capturing ${fileName}... `);
      await capture(url, outPath, cfg.vp.w, cfg.vp.h, inter.budget);
      console.log('Done');
    }
  }

  console.log('\nAll refresh timeline verification screenshots saved.');
  server.close(() => process.exit(0));
});
