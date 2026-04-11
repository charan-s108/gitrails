/**
 * Token generation and validation utilities.
 * All secrets are loaded from environment variables — never hardcoded.
 */
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET env var is required');

/**
 * Generates a cryptographically secure session token.
 * @returns {string} 32-byte hex token
 */
export function generateToken() {
  return randomBytes(32).toString('hex');
}

/**
 * Signs a payload with HMAC-SHA256.
 * @param {string} payload - The string to sign
 * @returns {string} hex signature
 */
export function sign(payload) {
  return createHmac('sha256', SECRET).update(payload).digest('hex');
}

/**
 * Verifies a token signature using constant-time comparison.
 * @param {string} payload - The original payload
 * @param {string} signature - The signature to verify
 * @returns {boolean}
 */
export function verify(payload, signature) {
  const expected = sign(payload);
  const a = Buffer.from(expected,  'hex');
  const b = Buffer.from(signature, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
