import fs from 'fs';
import path from 'path';

console.log('Running security & secrets integrity audit...');

const rootDir = path.resolve('.');

// 1. Verify .gitignore ignores sensitive environment files
const gitignorePath = path.resolve('.gitignore');
if (fs.existsSync(gitignorePath)) {
  const content = fs.readFileSync(gitignorePath, 'utf8');
  if (!content.includes('.env')) {
    console.error('❌ .gitignore must include .env');
    process.exit(1);
  }
}

// 2. Verify server/.env.example exists for developer onboarding
const envExamplePath = path.resolve('server/.env.example');
if (!fs.existsSync(envExamplePath)) {
  console.error('❌ server/.env.example must exist');
  process.exit(1);
}

// 3. Scan files for forbidden patterns and secret leaks
const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.system_generated',
  'scratch',
  'uploads',
]);

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.mp4',
  '.webm',
  '.pdf',
  '.zip',
  '.gz',
  '.tar',
]);

const forbiddenAnywherePatterns = [
  { name: 'self-heal / self-healing', regex: new RegExp(['self', 'heal'].join('-'), 'i') },
  { name: 'hardcoded credential name', regex: new RegExp(['Amrutha', 'admin'].join(''), 'i') },
];

const forbiddenLegacySecrets = [
  ['charge_share_india', 'super_secure_jwt_secret_key_2025'].join('_'),
  ['chargeshare', 'super_secret_jwt_key_2026'].join('_'),
];

const adminPasswordPattern = /AdminPassword123/;
const literalPasswordAssignPattern = /user\.password\s*=\s*['"][^'"]+['"]/;
const secretFallbackPattern = /process\.env\.(JWT_SECRET|ADMIN_JWT_SECRET|DOCUMENT_LINK_SECRET)\s*\|\|/;

const errors = [];

function scanDirectory(currentDir) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        scanDirectory(path.join(currentDir, entry.name));
      }
    } else if (entry.isFile()) {
      const fullPath = path.join(currentDir, entry.name);
      const ext = path.extname(entry.name).toLowerCase();
      if (BINARY_EXTENSIONS.has(ext)) continue;

      const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

      // Skip this script itself so it does not self-flag
      if (relPath === 'scripts/check_secrets.js') continue;

      let content = '';
      try {
        content = fs.readFileSync(fullPath, 'utf8');
      } catch {
        continue;
      }

      const isEnvExample = relPath.endsWith('.env.example');
      const isLocalEnv = relPath.endsWith('.env') || relPath.endsWith('.env.local');

      // Local gitignored .env files are developer-specific and not committed
      if (isLocalEnv) continue;

      // Check 1: Forbidden anywhere (self-heal, self-healing, Amruthaadmin)
      for (const { name, regex } of forbiddenAnywherePatterns) {
        if (regex.test(content)) {
          errors.push(`Forbidden pattern "${name}" found in ${relPath}`);
        }
      }

      // Check 2: Forbidden legacy fallback secrets anywhere (except .env.example)
      if (!isEnvExample) {
        for (const secretSubstring of forbiddenLegacySecrets) {
          if (content.includes(secretSubstring)) {
            errors.push(`Legacy hardcoded secret substring detected in ${relPath}`);
          }
        }
      }

      // Check 3: AdminPassword123 in server/src (except seed.js) or client/src
      const isSrc = relPath.startsWith('server/src/') || relPath.startsWith('client/src/');
      const isSeed = relPath === 'server/src/scripts/seed.js';
      if (isSrc && !isSeed && adminPasswordPattern.test(content)) {
        errors.push(`Demo password "AdminPassword123" forbidden in production source: ${relPath}`);
      }

      // Check 4: Secret fallbacks in server/src (must import from config/env.js)
      if (isSrc && relPath !== 'server/src/config/env.js' && secretFallbackPattern.test(content)) {
        errors.push(`Illegal secret fallback pattern in server/src (must import from config/env.js): ${relPath}`);
      }

      // Check 5: user.password = '<literal>' outside tests and seed
      const isTest =
        relPath.startsWith('server/tests/') ||
        relPath.startsWith('client/tests/') ||
        relPath.includes('.test.') ||
        relPath.includes('.spec.');
      const isAllowedLiteral = isTest || isSeed;

      if (!isAllowedLiteral && literalPasswordAssignPattern.test(content)) {
        errors.push(`Hardcoded password assignment user.password = '<literal>' found outside tests/seed: ${relPath}`);
      }
    }
  }
}

scanDirectory(rootDir);

if (errors.length > 0) {
  console.error('❌ check:secrets failed with the following security violations:');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log('✅ check:secrets passed: Secret configurations, forbidden keywords, and gitignore boundaries verified.');
process.exit(0);
