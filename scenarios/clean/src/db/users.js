/**
 * User data access layer.
 * Uses parameterized queries exclusively — no string concatenation.
 */
import { pool } from './pool.js';

/**
 * Fetches a user by their unique ID.
 * @param {string} userId - UUID of the user
 * @returns {Promise<Object|null>} User row, or null if not found
 */
export async function getUserById(userId) {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
    [userId]
  );
  return rows[0] ?? null;
}

/**
 * Searches users by name with pagination.
 * @param {string} query - Search term (safe — parameterized)
 * @param {number} limit - Max results to return
 * @returns {Promise<Object[]>} Matching users (no password fields)
 */
export async function searchUsers(query, limit = 20) {
  const { rows } = await pool.query(
    'SELECT id, name, email FROM users WHERE name ILIKE $1 LIMIT $2',
    [`%${query}%`, Math.min(limit, 100)]
  );
  return rows;
}

/**
 * Updates allowed user fields atomically.
 * @param {string} userId
 * @param {{ name?: string, email?: string }} patch
 * @returns {Promise<Object>} Updated user row
 * @throws {Error} If userId not found
 */
export async function updateUser(userId, patch) {
  const allowed = ['name', 'email'];
  const fields  = Object.keys(patch).filter(k => allowed.includes(k));
  if (!fields.length) throw new Error('No valid fields to update');

  const sets   = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const values = [...fields.map(f => patch[f]), userId];
  const { rows } = await pool.query(
    `UPDATE users SET ${sets}, updated_at = NOW() WHERE id = $${values.length} RETURNING id, name, email`,
    values
  );
  if (!rows[0]) throw new Error('User not found');
  return rows[0];
}
