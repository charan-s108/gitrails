// Utility functions — undocumented (scribe will flag these)

function formatUser(user) {
  return {
    id:        user.id,
    name:      user.name?.trim() || 'Unknown',
    email:     user.email?.toLowerCase() || '',
    createdAt: user.created_at ? new Date(user.created_at).toISOString() : null,
  };
}

function formatUserList(users) {
  if (!Array.isArray(users)) return [];
  return users.map(formatUser);
}

function paginate(items, page = 1, limit = 20) {
  const start = (page - 1) * limit;
  return {
    data:  items.slice(start, start + limit),
    total: items.length,
    page,
    pages: Math.ceil(items.length / limit),
  };
}

function sanitizeOutput(obj, allowedFields) {
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => allowedFields.includes(k))
  );
}

module.exports = { formatUser, formatUserList, paginate, sanitizeOutput };
