// Database queries — DEMO ONLY — DO NOT DEPLOY
const { Pool } = require('pg');
const crypto   = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://admin:admin123@localhost/appdb",
});

// ⚠️  A03 — SQL injection via string concatenation
async function getUserById(userId) {
  const query = "SELECT * FROM users WHERE id = '" + userId + "'";
  const result = await pool.query(query);
  return result.rows[0];
}

// ⚠️  A03 — SQL injection via template literal
async function searchUsers(searchTerm) {
  const query = `SELECT * FROM users WHERE name LIKE '%${searchTerm}%'`;
  const result = await pool.query(query);
  return result.rows;
}

// ⚠️  A02 — MD5 for password hashing (cryptographically broken)
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

// ⚠️  A03 — eval() with user input (arbitrary code execution)
function computeFormula(userFormula) {
  return eval(userFormula);
}

module.exports = { getUserById, searchUsers, hashPassword, computeFormula };
