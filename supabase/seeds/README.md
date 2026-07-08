# Dev Seed — Setup Guide

> **This Supabase project (`kzvkkqpgammbtoubbflo`) is the DEVELOPMENT / isolated backend — not
> production.** The app is pre-launch. On deployment, production will use a separate, fresh Supabase
> backend. Everything here that exists for convenience — seeded test data, the fake `@up.edu.ph`
> password accounts, the enabled email/password auth provider, and the dev password-login path —
> is dev-only and **must NOT be recreated on the production backend**. Production must stay
> Google-OAuth-only and `@up.edu.ph`-only: no seed data, no fake accounts, no password provider,
> no dev login route. **Treat this backend as disposable.**

---

## What gets seeded

| Account | Email | Role |
|---------|-------|------|
| Admin   | `admin.test@up.edu.ph` | admin |
| Adviser | `adviser.test@up.edu.ph` | adviser |
| Student | `student.test@up.edu.ph` | student |
| Student leader | `studentleader.test@up.edu.ph` | student (leader in adviser.test's active class) |

v5 also (optionally, if these real team-member accounts already exist on the
backend — no-ops otherwise) promotes **rblopez@up.edu.ph** and
**jbtulic@up.edu.ph** to facilitators with their own class history, and enrolls
**slimbaro@up.edu.ph**, **jlrabang@up.edu.ph**, **atmendoza5@up.edu.ph**, and
**apvalido@up.edu.ph** as students in adviser.test's active class.

**Dashboard data:**
- 5 terms, all 2nd-semester only (4 past, 1 active) — NSTP 2 only, no NSTP 1, no ROTC
- 27 sections across 9 facilitators (adviser.test + 6 synthetic advisers + rblopez +
  jbtulic), with varied history depth and statuses (draft/active/archived/completed,
  including facilitators with no current-year class) for admin/facilitator UI testing
- 4 geofences
- ~175 synthetic students (no `auth.users` rows → zero MAU cost)
- ~185 enrollments
- ~1600 attendance sessions, ~3200 events
- Every class roster follows an hour-tier spread (0%, 20%, 40%, 60%, 80%, 100%, 115%
  of the 60-hour requirement) by student index, so progress bars/colors vary across
  every section, not just one flagship class
- 6 appeals (3 in adviser.test's section, 2 in rblopez's, 1 from student.test), 2 appeal messages
- 9 required forms (6 on adviser.test's active class, 3 on rblopez's), 6 submissions

**Student test account history:**
- 1 completed + 1 archived past enrollment, 2 dropped enrollments (one in a current
  active-term class, one in a draft class), 1 active enrollment in adviser.test's
  class (60% of hour requirement, 12 closed sessions)

---

## One-time manual step: enable the Email provider

In Supabase Dashboard → **Authentication → Providers → Email**:
- Toggle **Email** to **Enabled**
- Set **Confirm email** to **off** (or use `email_confirm: true` in admin API — already done by the seed script)
- **Disable public sign-ups** (only admin-created accounts can use password login)

---

## Run order

### 1. Enable Email provider (manual, one-time)
See above.

### 2. Create fake auth accounts
```bash
npm run seed-auth-users
# or: node --env-file=.env.local scripts/seed-auth-users.mjs
```
This creates the 3 `auth.users` rows. Idempotent — safe to re-run.

### 3. Run the SQL seed
Open **Supabase Dashboard → SQL editor**, paste and run `supabase/seeds/dev_seed.sql`.

> The DO block that creates sessions/events is NOT idempotent. Run the teardown first if you
> need to re-seed.

### 4. Verify
Check that the 3 `app_user` rows have the correct roles:
```sql
SELECT email, r.code FROM app_user u JOIN role r USING (role_id)
WHERE email LIKE '%.test@up.edu.ph';
```

### 5. Start the dev server
```bash
npm run dev
```
Go to `http://localhost:3000`. The **DEV ONLY** password form appears below the Google button.

Log in as each role:
- `admin.test@up.edu.ph` → `/admin/dashboard`
- `adviser.test@up.edu.ph` → `/facilitator/dashboard`
- `student.test@up.edu.ph` → `/student/dashboard`

---

## Teardown

To remove all seeded data (run in the SQL editor):
```
supabase/seeds/dev_teardown.sql
```

The teardown must run in the SQL editor (owner access) because it disables the
`attendance_event_no_delete` trigger. It cannot run via PostgREST.

The 3 fake account `app_user` rows are NOT deleted by the teardown (their auth UUIDs don't
start with `5eed`). To fully remove them: **Dashboard → Authentication → Users → delete each**.

---

## Dev → Production transition checklist

When deploying to a new, fresh Supabase project:

**On the new production Supabase project:**

1. Run all migrations `0001`–`0004` (schema, RLS, RBAC, auth hook) on the fresh project.
2. Enable the JWT hook manually: **Authentication → Hooks → Customize Access Token (JWT) Claims →
   `public.custom_access_token_hook`**. Without this, `user_role` is absent from tokens and all
   users fall back to the student dashboard.
3. Configure the **Google** provider (client ID/secret) and set Auth **Site URL** + **Redirect
   URLs** to the prod domain; add the matching authorized redirect URI in Google Cloud Console.
4. **Do NOT** enable the Email/password provider.
5. **Do NOT** run `seed-auth-users.mjs` or `dev_seed.sql`. No fake accounts, no seed data.
6. Create any Supabase Storage buckets used by `form` uploads.

**On Vercel (production environment):**

7. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` to the **new project's keys** — never reuse the dev service-role
   key or `DEV_AUTH_PASSWORD`.
8. **Omit** `NEXT_PUBLIC_DEV_AUTH_ENABLED`, `DEV_AUTH_ENABLED`, `DEV_AUTH_PASSWORD` entirely.
   (`NODE_ENV=production` already disables the dev login in the build, but leaving these vars
   unset is belt-and-suspenders.)

**Verify after deploy:**

9. The DEV ONLY password form does **not** render on the login page; the server action refuses
   if called directly (double guard: `NODE_ENV=production` + missing `DEV_AUTH_ENABLED`).
10. Only Google OAuth works; a non-`@up.edu.ph` Google account is rejected with an error.
11. A real `@up.edu.ph` login lands on the correct dashboard and `user_role` is stamped in the
    JWT (check via browser devtools → Application → Cookies → decode the Supabase access token).

**Decommission the dev backend** once prod is live: the dev project, its fake accounts, password
provider, and seed data stay strictly separate from production — never a source of truth for it.

---

## Security notes

- `DEV_AUTH_PASSWORD` must be strong and shared only with team members via a secrets manager
  (not committed to git).
- `.env.local` is gitignored — keep it that way.
- The Email provider's public sign-up is disabled, so only the 3 admin-created accounts can
  use password login. The `@up.edu.ph` signup trigger (migration 0004) bounds it regardless.
- Multiple devs using the same fake account concurrently is fine — it just creates extra
  `login_session` rows and last-write-wins on simultaneous mutations.
