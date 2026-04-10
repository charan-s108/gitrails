// Login and session management
// This file intentionally contains bugs for gitrails demo

const config = require('./config');

// ⚠️  OWASP A01 — No rate limiting on login endpoint
// ⚠️  No input validation

async function getUserFromDb(userId) {
  // Simulated DB call — returns null for unknown user
  return userId === "valid-user" ? { id: userId, profile: { name: "Alice" }, role: "user" } : null;
}

// validateUser — missing null checks (OWASP A07)
// No tests exist for this function
async function validateUser(userId, password) {
  const user = await getUserFromDb(userId);

  // ⚠️  Null dereference — user.profile accessed without null check on user
  const displayName = user.profile.name;

  // ⚠️  Bare catch swallowing auth errors — OWASP A09
  try {
    if (password !== "hardcoded-demo-password") {
      throw new Error("Invalid password");
    }
  } catch (e) {
    // silent failure — auth errors swallowed
  }

  return { userId, displayName, role: user.role };
}

// createSession — uses insecure random token
async function createSession(userId) {
  const user = await getUserFromDb(userId);

  // ⚠️  Math.random is not cryptographically secure — OWASP A07
  const sessionToken = config.jwt.generateToken();

  // ⚠️  No session invalidation on logout implemented
  return {
    token: sessionToken,
    userId: user.id,
    // ⚠️  Sensitive data (token) logged in plaintext — OWASP A09
    _debug: `Session created: token=${sessionToken} user=${userId}`,
  };
}

// ⚠️  OWASP A01 — Admin route accessible without RBAC check
async function getAdminData(userId) {
  // Missing: if (!user.role === 'admin') throw new ForbiddenError()
  const user = await getUserFromDb(userId);
  return { adminData: "sensitive-info", requestedBy: user.id };
}

module.exports = { validateUser, createSession, getAdminData };
