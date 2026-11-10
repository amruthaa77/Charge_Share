import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

// Ensure .env is loaded from cwd or server/.env
dotenv.config();
if (!process.env.JWT_SECRET && !process.env.ADMIN_JWT_SECRET) {
  dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });
}

const FORBIDDEN_SECRETS = new Set([
  ['charge_share_india', 'super_secure_jwt_secret_key_2025'].join('_'),
  ['chargeshare', 'super_secret_jwt_key_2026'].join('_'),
  'replace-with-64-random-hex-characters',
  'changeme',
]);

/**
 * Validates and resolves a security secret.
 * In production: throws if missing, < 32 chars, known fallback, or placeholder. Never prints secret.
 * In development/test: generates crypto.randomBytes(32).toString('hex') if missing.
 */
export function validateSecret(name, value, isProd = process.env.NODE_ENV === 'production') {
  if (isProd) {
    if (!value || typeof value !== 'string' || !value.trim()) {
      throw new Error(`[Security] Missing required environment variable: ${name}. Server refusing to start in production.`);
    }
    const clean = value.trim();
    if (clean.length < 32) {
      throw new Error(`[Security] Environment variable ${name} must be at least 32 characters long in production.`);
    }
    const lower = clean.toLowerCase();
    if (
      FORBIDDEN_SECRETS.has(clean) ||
      FORBIDDEN_SECRETS.has(lower) ||
      lower.includes('replace-with') ||
      lower.includes('changeme')
    ) {
      throw new Error(`[Security] Environment variable ${name} cannot be a default or placeholder value.`);
    }
    return clean;
  }

  // Non-production (development or test)
  if (value && typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  // Missing in non-production: generate ephemeral secret
  const generated = crypto.randomBytes(32).toString('hex');
  if (process.env.NODE_ENV !== 'test') {
    console.warn(`⚠️ [Security Warning] ${name} is not set; generated ephemeral secret. Sessions will reset on restart.`);
  }
  return generated;
}

const isProduction = process.env.NODE_ENV === 'production';

// Read and validate the three secrets once at startup
export const JWT_SECRET = validateSecret('JWT_SECRET', process.env.JWT_SECRET, isProduction);
export const ADMIN_JWT_SECRET = validateSecret('ADMIN_JWT_SECRET', process.env.ADMIN_JWT_SECRET, isProduction);
export const DOCUMENT_LINK_SECRET = validateSecret('DOCUMENT_LINK_SECRET', process.env.DOCUMENT_LINK_SECRET, isProduction);

// Sync resolved values back to process.env if generated
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = JWT_SECRET;
if (!process.env.ADMIN_JWT_SECRET) process.env.ADMIN_JWT_SECRET = ADMIN_JWT_SECRET;
if (!process.env.DOCUMENT_LINK_SECRET) process.env.DOCUMENT_LINK_SECRET = DOCUMENT_LINK_SECRET;
