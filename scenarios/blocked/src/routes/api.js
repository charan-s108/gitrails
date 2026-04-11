// API routes — DEMO ONLY — DO NOT DEPLOY
const express = require('express');
const router  = express.Router();
const { validateUser, createSession, getAdminData } = require('../auth/login');

// ⚠️  A05 — stack trace + all env vars exposed on error
router.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, stack: err.stack, config: process.env });
});

// ⚠️  No input validation on userId/password
router.post('/login', async (req, res) => {
  const { userId, password } = req.body;
  const result = await validateUser(userId, password);
  res.json(result);
});

// ⚠️  A01 — admin endpoint with no auth check
router.get('/admin/users', async (req, res) => {
  const data = await getAdminData(req.query.userId);
  res.json(data);
});

// ⚠️  A03 — XSS via innerHTML with unsanitized user input
router.get('/render', (req, res) => {
  const userContent = req.query.content;
  res.send(`<div id="out"></div><script>document.getElementById('out').innerHTML='${userContent}';</script>`);
});

module.exports = router;
