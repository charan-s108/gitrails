// Database query helpers
// This file intentionally contains injection vulnerabilities for gitrails demo

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://admin:admin123@localhost/appdb",
});

// ⚠️  OWASP A03 — SQL injection via string concatenation
async function getUserById(userId) {
  // Directly interpolating user input into SQL — classic injection vulnerability
  const query = "SELECT * FROM users WHERE id = '" + userId + "'";
  const result = await pool.query(query);
  return result.rows[0];
}

// ⚠️  OWASP A03 — Another injection via template literal with no escaping
async function searchUsers(searchTerm) {
  const query = `SELECT * FROM users WHERE name LIKE '%${searchTerm}%'`;
  const result = await pool.query(query);
  return result.rows;
}

// ⚠️  OWASP A02 — MD5 used for password hashing (cryptographically broken)
const crypto = require('crypto');
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

// ⚠️  OWASP A03 — eval() with user input
function computeFormula(userFormula) {
  // Allows arbitrary code execution
  return eval(userFormula);
}

module.exports = { getUserById, searchUsers, hashPassword, computeFormula };
