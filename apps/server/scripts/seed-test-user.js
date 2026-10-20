require('dotenv').config();
const { createAdminClient } = require('@supabase/server/core');

// Creates (or resets) a pre-confirmed account so it can log in without an OTP.
const email = process.env.SEED_USER_EMAIL || 'test@evento.com';
const password = process.env.SEED_USER_PASSWORD || 'test123456';

async function main() {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (!error) {
    console.log(`Created ${email} (${data.user.id})`);
    return;
  }
  if (!/already|registered|exists/i.test(error.message)) throw error;

  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email === email);
  if (!existing) throw error;
  const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
  if (updateError) throw updateError;
  console.log(`Updated ${email} (${existing.id})`);
}

main().catch((err) => {
  console.error(`Seed failed: ${err.message}${err.status === 401 ? ' - check SUPABASE_SECRET_KEY in apps/server/.env' : ''}`);
  process.exit(1);
});
