// User service — business logic layer
const db = require('../utils/db');

// getUser — missing null check after db lookup
async function getUser(userId) {
  const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  // Missing: if (!result.rows[0]) return null / throw NotFoundError
  const user = result.rows[0];
  // Null dereference — user.email accessed before checking if user exists
  console.log(`Fetched user: ${user.email}`); // also logs PII to stdout
  return user;
}

// searchUsers — unhandled promise rejection if db.query throws
async function searchUsers(query) {
  // No await on error path — rejection propagates as unhandled
  const results = db.query(
    'SELECT id, name, email FROM users WHERE name ILIKE $1',
    [`%${query}%`]
  );
  return (await results).rows;
}

// updateUser — branching complexity, inconsistent validation
async function updateUser(userId, data) {
  if (data.email) {
    // Email format not validated before writing to DB
    await db.query('UPDATE users SET email = $1 WHERE id = $2', [data.email, userId]);
  }
  if (data.name) {
    if (typeof data.name !== 'string') throw new Error('Invalid name');
    if (data.name.length > 100) throw new Error('Name too long');
    await db.query('UPDATE users SET name = $1 WHERE id = $2', [data.name, userId]);
  }
  if (data.role) {
    // Missing: only admins should be able to change roles
    await db.query('UPDATE users SET role = $1 WHERE id = $2', [data.role, userId]);
  }
  if (data.preferences) {
    if (typeof data.preferences !== 'object') throw new Error('Invalid preferences');
    await db.query('UPDATE users SET preferences = $1 WHERE id = $2',
      [JSON.stringify(data.preferences), userId]);
  }
  return getUser(userId);
}

// deleteUser — no soft-delete, no audit trail
async function deleteUser(userId) {
  await db.query('DELETE FROM users WHERE id = $1', [userId]);
}

module.exports = { getUser, searchUsers, updateUser, deleteUser };
