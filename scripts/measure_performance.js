const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

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

server.listen(5173, async () => {
  console.log('Measuring performance on http://localhost:5173...');

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    'http://localhost:5173',
  ]);

  await new Promise((r) => setTimeout(r, 1500));

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json/list');
    const tabs = await listRes.json();
    const pageTab = tabs.find((t) => t.type === 'page');

    if (pageTab && pageTab.webSocketDebuggerUrl) {
      const ws = new globalThis.WebSocket(pageTab.webSocketDebuggerUrl);

      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: 'Performance.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
        setTimeout(() => {
          ws.send(
            JSON.stringify({
              id: 3,
              method: 'Runtime.evaluate',
              params: {
                expression: `
                  (function() {
                    let cls = 0;
                    try {
                      new PerformanceObserver((entryList) => {
                        for (const entry of entryList.getEntries()) {
                          if (!entry.hadRecentInput) cls += entry.value;
                        }
                      }).observe({type: 'layout-shift', buffered: true});
                    } catch(e){}

                    let lcp = 0;
                    try {
                      new PerformanceObserver((entryList) => {
                        const entries = entryList.getEntries();
                        const last = entries[entries.length - 1];
                        if (last) lcp = last.renderTime || last.loadTime;
                      }).observe({type: 'largest-contentful-paint', buffered: true});
                    } catch(e){}

                    return JSON.stringify({
                      cls: Number(cls.toFixed(4)),
                      lcp: Number((lcp / 1000).toFixed(3)),
                      loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
                      domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
                    });
                  })()
                `,
                returnByValue: true,
              },
            })
          );
        }, 2500);
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === 3 && msg.result) {
          const val = JSON.parse(msg.result.result.value);
          console.log('\n--- PERFORMANCE METRICS (BASELINE) ---');
          console.log(`CLS (Cumulative Layout Shift): ${val.cls}`);
          console.log(`LCP (Largest Contentful Paint): ${val.lcp}s`);
          console.log(`DOMContentLoaded: ${val.domContentLoaded}ms`);
          console.log(`LoadEvent: ${val.loadTime}ms`);
          ws.close();
          chromeProc.kill();
          server.close(() => process.exit(0));
        }
      };
    }
  } catch (err) {
    console.error('Measurement error:', err.message);
    chromeProc.kill();
    server.close(() => process.exit(0));
  }
});
