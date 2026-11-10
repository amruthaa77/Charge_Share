const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../client/src');
const patterns = [
  { name: 'bg-white', regex: /\bbg-white(?:\/\d+)?\b/g },
  { name: 'bg-hex', regex: /\bbg-\[#[0-9a-fA-F]+\](?:\/\d+)?\b/g },
  { name: 'text-green', regex: /\btext-green-\d+\b/g },
  { name: 'text-emerald', regex: /\btext-emerald-\d+\b/g },
  { name: 'text-slate', regex: /\btext-slate-\d+\b/g },
  { name: 'border-gray', regex: /\bborder-gray-\d+\b/g },
  { name: 'gradient-from-to', regex: /\b(?:from|to|via)-[a-zA-Z0-9#\-\[\]\/]+/g },
  { name: 'inline-style-color', regex: /style=\{\{[^}]*(?:color|background|backgroundColor|borderColor)[^}]*\}\}/g },
];

function scanDir(dir, results = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scanDir(full, results);
    } else if (/\.(jsx?|tsx?|css)$/.test(file)) {
      results.push(full);
    }
  }
  return results;
}

const allFiles = scanDir(srcDir);
const report = {};

for (const f of allFiles) {
  const rel = path.relative(path.resolve(__dirname, '..'), f).replace(/\\/g, '/');
  // Skip index.css for token definitions
  if (rel === 'client/src/index.css') continue;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  const fileHits = [];

  lines.forEach((line, idx) => {
    for (const pat of patterns) {
      if (pat.regex.test(line)) {
        fileHits.push({ line: idx + 1, pattern: pat.name, text: line.trim() });
      }
      pat.regex.lastIndex = 0;
    }
  });

  if (fileHits.length > 0) {
    report[rel] = fileHits;
  }
}

const out = [];
out.push('# Color Audit Hits');
let totalHits = 0;
for (const [file, hits] of Object.entries(report)) {
  totalHits += hits.length;
  out.push(`\n### ${file} (${hits.length} hits)`);
  hits.forEach(h => out.push(`- L${h.line} [${h.pattern}]: \`${h.text}\``));
}
out.unshift(`Total files: ${Object.keys(report).length} | Total color violations: ${totalHits}\n`);

const reportStr = out.join('\n');
fs.writeFileSync(path.resolve(__dirname, '../docs/AUDIT_COLORS.md'), reportStr, 'utf8');
console.log(`Audit complete: ${Object.keys(report).length} files, ${totalHits} hits written to docs/AUDIT_COLORS.md`);
