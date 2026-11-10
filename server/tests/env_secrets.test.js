import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  JWT_SECRET,
  ADMIN_JWT_SECRET,
  DOCUMENT_LINK_SECRET,
  validateSecret,
} from '../src/config/env.js';

describe('Environment Secrets & Session Boundary Security (server/src/config/env.js)', () => {
  describe('Module Exports & Integrity', () => {
    test('exports all three required security secrets as non-empty strings >= 32 characters', () => {
      expect(typeof JWT_SECRET).toBe('string');
      expect(typeof ADMIN_JWT_SECRET).toBe('string');
      expect(typeof DOCUMENT_LINK_SECRET).toBe('string');

      expect(JWT_SECRET.length).toBeGreaterThanOrEqual(32);
      expect(ADMIN_JWT_SECRET.length).toBeGreaterThanOrEqual(32);
      expect(DOCUMENT_LINK_SECRET.length).toBeGreaterThanOrEqual(32);
    });

    test('ensures JWT_SECRET, ADMIN_JWT_SECRET, and DOCUMENT_LINK_SECRET are distinct', () => {
      expect(JWT_SECRET).not.toBe(ADMIN_JWT_SECRET);
      expect(JWT_SECRET).not.toBe(DOCUMENT_LINK_SECRET);
      expect(ADMIN_JWT_SECRET).not.toBe(DOCUMENT_LINK_SECRET);
    });
  });

  describe('Production Environment Validation (NODE_ENV=production)', () => {
    test('throws in production when a secret is missing, null, or empty', () => {
      expect(() => validateSecret('JWT_SECRET', '', true)).toThrow(/Missing required environment variable: JWT_SECRET/);
      expect(() => validateSecret('ADMIN_JWT_SECRET', null, true)).toThrow(/Missing required environment variable: ADMIN_JWT_SECRET/);
      expect(() => validateSecret('DOCUMENT_LINK_SECRET', undefined, true)).toThrow(/Missing required environment variable: DOCUMENT_LINK_SECRET/);
      expect(() => validateSecret('JWT_SECRET', '   ', true)).toThrow(/Missing required environment variable: JWT_SECRET/);
    });

    test('throws in production when a secret is shorter than 32 characters', () => {
      const shortSecret = 'short-secret-under-32-chars';
      expect(shortSecret.length).toBeLessThan(32);

      expect(() => validateSecret('JWT_SECRET', shortSecret, true)).toThrow(
        /Environment variable JWT_SECRET must be at least 32 characters long/
      );
    });

    test('throws in production when a secret matches known legacy fallbacks or placeholders', () => {
      const legacySecret1 = ['charge_share_india', 'super_secure_jwt_secret_key_2025'].join('_');
      const legacySecret2 = ['chargeshare', 'super_secret_jwt_key_2026'].join('_');

      expect(() => validateSecret('JWT_SECRET', legacySecret1, true)).toThrow(
        /cannot be a default or placeholder value/
      );
      expect(() => validateSecret('DOCUMENT_LINK_SECRET', legacySecret2, true)).toThrow(
        /cannot be a default or placeholder value/
      );
      expect(() => validateSecret('JWT_SECRET', 'replace-with-64-random-hex-characters', true)).toThrow(
        /cannot be a default or placeholder value/
      );
      expect(() => validateSecret('ADMIN_JWT_SECRET', 'changeme_to_something_secure_random', true)).toThrow(
        /cannot be a default or placeholder value/
      );
    });

    test('error messages in production never leak or print the candidate secret', () => {
      const candidateSensitive = 'sensitive-production-attempt-string-value-12345';
      let thrownMessage = '';
      try {
        validateSecret('JWT_SECRET', candidateSensitive, true);
      } catch (err) {
        thrownMessage = err.message;
      }
      expect(thrownMessage).not.toContain(candidateSensitive);
    });

    test('accepts valid 64-character random hex strings in production', () => {
      const validSecret = crypto.randomBytes(32).toString('hex');
      expect(validSecret.length).toBe(64);
      expect(() => validateSecret('JWT_SECRET', validSecret, true)).not.toThrow();
      expect(validateSecret('JWT_SECRET', validSecret, true)).toBe(validSecret);
    });
  });

  describe('Development & Test Fallbacks', () => {
    test('generates an ephemeral 64-character hex secret when missing in non-production', () => {
      const generated = validateSecret('JWT_SECRET', undefined, false);
      expect(typeof generated).toBe('string');
      expect(generated.length).toBe(64);
      expect(/^[0-9a-f]{64}$/.test(generated)).toBe(true);
    });

    test('uses provided secret as-is when valid in non-production', () => {
      const customSecret = 'my-custom-dev-secret-configured-by-dev';
      expect(validateSecret('JWT_SECRET', customSecret, false)).toBe(customSecret);
    });
  });

  describe('Non-Interchangeability & Cryptographic Separation', () => {
    test('token signed with ADMIN_JWT_SECRET fails verification with JWT_SECRET', () => {
      const adminToken = jwt.sign(
        { id: 'admin123', role: 'ADMIN', scope: 'admin' },
        ADMIN_JWT_SECRET,
        { expiresIn: '1h' }
      );

      expect(() => {
        jwt.verify(adminToken, JWT_SECRET);
      }).toThrow(jwt.JsonWebTokenError);
    });

    test('token signed with JWT_SECRET fails verification with ADMIN_JWT_SECRET', () => {
      const userToken = jwt.sign(
        { id: 'user123', role: 'EV_OWNER', scope: 'user' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      expect(() => {
        jwt.verify(userToken, ADMIN_JWT_SECRET);
      }).toThrow(jwt.JsonWebTokenError);
    });

    test('token signed with DOCUMENT_LINK_SECRET fails verification with both JWT_SECRET and ADMIN_JWT_SECRET', () => {
      const docToken = jwt.sign(
        { filename: 'aadhaar.pdf', purpose: 'document_view' },
        DOCUMENT_LINK_SECRET,
        { expiresIn: '10m' }
      );

      expect(() => {
        jwt.verify(docToken, JWT_SECRET);
      }).toThrow(jwt.JsonWebTokenError);

      expect(() => {
        jwt.verify(docToken, ADMIN_JWT_SECRET);
      }).toThrow(jwt.JsonWebTokenError);
    });
  });
});
