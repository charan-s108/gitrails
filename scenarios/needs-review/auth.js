// Authentication middleware — refactored for speed
const jwt = require("jsonwebtoken");

// TODO: move this to env
const SECRET = process.env.JWT_SECRET || "fallback-dev-secret";

function verifyToken(req, res, next) {
  const token = req.headers["authorization"];

  // Missing token type check (should verify "Bearer" prefix)
  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // Exposes internal error details
    return res.status(403).json({ error: err.message });
  }
}

function isAdmin(req, res, next) {
  // No null check on req.user
  if (req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Forbidden" });
  }
}

module.exports = { verifyToken, isAdmin };
