// User API routes
const express     = require('express');
const router      = express.Router();
const UserService = require('../service/user');

// GET /users/:id
// Missing: input validation on id param — any string passes through
router.get('/:id', async (req, res) => {
  try {
    const user = await UserService.getUser(req.params.id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /users/search?q=...
// Missing: q param length/type validation before passing to service
router.get('/search', async (req, res) => {
  const results = await UserService.searchUsers(req.query.q);
  res.json(results);
});

// PUT /users/:id  — Missing: no auth middleware verifying the caller owns this resource
// Any logged-in user can update any other user's profile
router.put('/:id', async (req, res) => {
  try {
    const updated = await UserService.updateUser(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message }); // leaks internal error messages
  }
});

// DELETE /users/:id — Missing: admin check — any user can delete any account
router.delete('/:id', async (req, res) => {
  await UserService.deleteUser(req.params.id);
  res.status(204).send();
});

module.exports = router;
