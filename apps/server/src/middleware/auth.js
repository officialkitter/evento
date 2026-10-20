const { verifyAuth } = require('@supabase/server/core');
const { admin } = require('../services/supabase');

const issuer = new URL('/auth/v1', process.env.SUPABASE_URL).toString().replace(/\/$/, '');

// Verify the mobile app's access token against the Supabase project's JWKS.
async function requireAuth(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    if (!/^Bearer\s+\S+$/i.test(header)) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }

    const request = new Request('http://localhost/', { headers: { authorization: header } });
    const { data, error } = await verifyAuth(request, { auth: 'user', issuer });
    if (error) {
      if (error.status >= 500) return next(error);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = data.userClaims;
    req.token = data.token;
    return next();
  } catch (err) {
    return next(err);
  }
}

// Returns true when the user holds one of the roles on the event.
async function hasEventRole(userId, eventId, roles) {
  const { data, error } = await admin
    .from('event_members')
    .select('role')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return !!data && roles.includes(data.role);
}

module.exports = { requireAuth, hasEventRole };
