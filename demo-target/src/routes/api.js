// API routes
// This file intentionally contains misconfiguration issues for gitrails demo

const express = require('express');
const router = express.Router();
const { validateUser, createSession, getAdminData } = require('../auth/login');

// ⚠️  OWASP A05 — Verbose error responses exposing stack traces
router.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack, // Stack trace exposed to client
    config: process.env,  // ⚠️  All env vars exposed on error
  });
});

// ⚠️  No authentication middleware on any route
router.post('/login', async (req, res) => {
  const { userId, password } = req.body;
  // ⚠️  No input validation — userId/password used directly
  const result = await validateUser(userId, password);
  res.json(result);
});

// ⚠️  Admin route with no authorization check
router.get('/admin/users', async (req, res) => {
  const data = await getAdminData(req.query.userId);
  res.json(data);
});

// ⚠️  innerHTML used with untrusted data — XSS vector (OWASP A03)
router.get('/render', (req, res) => {
  const userContent = req.query.content;
  res.send(`<div id="output"></div>
    <script>
      document.getElementById('output').innerHTML = '${userContent}';
    </script>`);
});

module.exports = router;
