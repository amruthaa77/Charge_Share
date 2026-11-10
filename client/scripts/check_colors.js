import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

// Patterns that indicate bypass of semantic theme tokens
const bannedPatterns = [
  /\bmintBg\b/,
  /\btext-forest-\d+\b/,
  /\bbg-forest-\d+\b/,
  /\bborder-forest-\d+\b/,
  /\bbg-emerald-[1-9]00\b/,
  /\btext-emerald-[1-9]00\b/,
];

// Exceptions that are intentionally allowed (e.g. QR code canvas background, LED dots)
const allowedExceptions = [
  'RealisticCharger3D.jsx', // Canvas 3D rendering uses specific canvas colors
  'ErrorBoundary.jsx',      // Fallback boundary styles
];

let hasErrors = false;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.jsx') || entry.name.endsWith('.js'))) {
      if (allowedExceptions.some(ex => fullPath.includes(ex))) {
        continue;
      }
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        for (const pattern of bannedPatterns) {
          if (pattern.test(line)) {
            // Check if it's in a comment
            if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
              continue;
            }
            console.error(`[check:colors] ${path.relative(srcDir, fullPath)}:${idx + 1} - Pattern ${pattern} found: ${line.trim()}`);
            hasErrors = true;
          }
        }
      });
    }
  }
}

console.log('Scanning client/src for hardcoded color bypass classes...');
scanDir(srcDir);

if (hasErrors) {
  console.error('\n❌ check:colors failed: Found hardcoded color classes bypassing semantic tokens.');
  process.exit(1);
} else {
  console.log('✅ check:colors passed: All pages and components use semantic tokens cleanly.');
}
