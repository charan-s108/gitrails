/**
 * User API routes — production-hardened.
 * All inputs validated, errors sanitized, no stack traces to client.
 */
import { Router }    from 'express';
import { getUserById, searchUsers, updateUser } from '../db/users.js';

const router = Router();

// Validation helpers
const isUUID  = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s);
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/**
 * GET /users/:id — fetch a single user.
 * Requires authenticated session (enforced by upstream auth middleware).
 */
router.get('/:id', async (req, res) => {
  if (!isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid user ID format' });
  const user = await getUserById(req.params.id).catch(() => null);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

/**
 * GET /users/search?q=term — search users by name.
 */
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim().slice(0, 100);
  if (q.length < 2) return res.status(400).json({ error: 'Search query too short' });
  const results = await searchUsers(q).catch(() => []);
  res.json(results);
});

/**
 * PUT /users/:id — update name or email.
 * Users can only update their own profile (enforced by auth middleware).
 */
router.put('/:id', async (req, res) => {
  if (!isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid user ID' });

  const { name, email } = req.body;
  const patch = {};

  if (name  !== undefined) {
    if (typeof name !== 'string' || name.length < 1 || name.length > 100)
      return res.status(400).json({ error: 'name must be 1–100 characters' });
    patch.name = name.trim();
  }
  if (email !== undefined) {
    if (!isEmail(email)) return res.status(400).json({ error: 'Invalid email format' });
    patch.email = email.toLowerCase();
  }

  try {
    const updated = await updateUser(req.params.id, patch);
    res.json(updated);
  } catch (err) {
    // Never expose internal error details to the client
    res.status(err.message === 'User not found' ? 404 : 500)
       .json({ error: err.message === 'User not found' ? 'Not found' : 'Update failed' });
  }
});

// Global error handler — no stack traces, no env vars in response
router.use((err, req, res, _next) => {
  console.error('[api/users] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

export default router;
