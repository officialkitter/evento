const { createAdminClient, createContextClient } = require('@supabase/server/core');

// This client bypasses RLS. Use only after authorizing the caller yourself.
const admin = createAdminClient();

function userClient(accessToken) {
  return createContextClient({ auth: { token: accessToken } });
}

module.exports = { admin, userClient };
