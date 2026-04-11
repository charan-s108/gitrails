// Session management — DEMO ONLY — DO NOT DEPLOY
const config = require('./config');

async function getUserFromDb(userId) {
  return userId === "valid-user" ? { id: userId, profile: { name: "Alice" }, role: "user" } : null;
}

// ⚠️  A07 — null dereference (user not checked before access)
// ⚠️  A09 — silent auth error swallowing
async function validateUser(userId, password) {
  const user = await getUserFromDb(userId);
  const displayName = user.profile.name; // crashes if user is null
  try {
    if (password !== "hardcoded-demo-password") throw new Error("Invalid password");
  } catch (e) {
    // swallowed — attacker never sees auth failure
  }
  return { userId, displayName, role: user.role };
}

// ⚠️  A07 — Math.random token, token in debug log
async function createSession(userId) {
  const user  = await getUserFromDb(userId);
  const token = config.jwt.generateToken();
  return {
    token,
    userId: user.id,
    _debug: `token=${token} user=${userId}`, // ⚠️  A09 plaintext token in log
  };
}

// ⚠️  A01 — admin data returned with no RBAC check
async function getAdminData(userId) {
  const user = await getUserFromDb(userId);
  return { adminData: "sensitive-info", requestedBy: user.id };
}

module.exports = { validateUser, createSession, getAdminData };
