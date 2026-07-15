/**
 * Applies migration 0010: allow different NSTP types per facilitator per term.
 * Run: node --env-file=.env.local scripts/apply-0010-section-nstp-type.mjs
 *
 * Prefers DATABASE_URL / SUPABASE_DB_URL when set; otherwise prints the SQL
 * to paste into the Supabase SQL editor.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const sqlPath = resolve("supabase/migrations/0010_section_adviser_term_nstp_type.sql")
const sql = readFileSync(sqlPath, "utf8")

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.POSTGRES_URL ||
  ""

if (!dbUrl) {
  console.log("No DATABASE_URL / SUPABASE_DB_URL found.")
  console.log("Paste this into the Supabase SQL editor, then retry reassignment:\n")
  console.log(sql)
  process.exit(0)
}

const { default: pg } = await import("pg").catch(() => ({ default: null }))
if (!pg) {
  console.error("Install pg to apply automatically: npm i -D pg")
  console.log("\nOr paste this into the Supabase SQL editor:\n")
  console.log(sql)
  process.exit(1)
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  await client.query(sql)
  console.log("Migration 0010 applied successfully.")
} finally {
  await client.end()
}
