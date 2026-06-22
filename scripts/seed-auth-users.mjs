/**
 * Creates the four fake @up.edu.ph dev accounts in Supabase Auth.
 * Run ONCE on the dev backend before running dev_seed.sql.
 *
 *   npm run seed-auth-users
 *   # or: node --env-file=.env.local scripts/seed-auth-users.mjs
 */

import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.DEV_AUTH_PASSWORD

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
  console.error("Run with: node --env-file=.env.local scripts/seed-auth-users.mjs")
  process.exit(1)
}

if (!password || password === "changeme_use_a_strong_shared_dev_password") {
  console.error("Set a real DEV_AUTH_PASSWORD in .env.local before running this script.")
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const accounts = [
  { email: "admin.test@up.edu.ph",         label: "admin",   name: "Admin Test Account" },
  { email: "adviser.test@up.edu.ph",       label: "adviser", name: "Adviser Test Account" },
  { email: "student.test@up.edu.ph",       label: "student", name: "Student Test Account" },
  { email: "studentleader.test@up.edu.ph", label: "leader",  name: "Student Leader Test Account" },
]

console.log("Creating dev auth accounts…\n")

for (const { email, label, name } of accounts) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  })

  if (error) {
    if (error.status === 422 || error.message?.toLowerCase().includes("already")) {
      console.log(`  ✓  ${label.padEnd(7)} ${email}  (already exists — skipped)`)
    } else {
      console.error(`  ✗  ${label.padEnd(7)} ${email}  FAILED: ${error.message}`)
      process.exitCode = 1
    }
  } else {
    console.log(`  ✓  ${label.padEnd(7)} ${email}  →  ${data.user.id}`)
  }
}

console.log("\nDone. Next: run supabase/seeds/dev_seed.sql in the Supabase SQL editor.")
