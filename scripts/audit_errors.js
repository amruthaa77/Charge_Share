import fs from 'fs';
import path from 'path';

function walk(dir, callback) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, callback);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) callback(full);
  });
}

const patterns = [
  'toast.error',
  'setErrorMessage',
  'setError(',
  'catch (',
  'catch(',
  'catch {',
  '.catch',
  'failed',
  'went wrong',
  'Validation failed',
  'error.message',
  'error.response'
];

const findings = [];
walk('client/src', (file) => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    for (const p of patterns) {
      if (line.includes(p)) {
        findings.push({
          file: file.replace(/\\/g, '/'),
          line: idx + 1,
          pattern: p,
          text: line.trim()
        });
        break;
      }
    }
  });
});

console.log(`Total error locations found in client/src: ${findings.length}`);
const fileMap = {};
findings.forEach(f => {
  fileMap[f.file] = (fileMap[f.file] || 0) + 1;
});
console.log('Files with error handling:', fileMap);

fs.writeFileSync('scripts/audit_output.json', JSON.stringify(findings, null, 2));
