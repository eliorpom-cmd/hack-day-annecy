// Applies migration 0015 (then the one-off cleanups below) from the Worker itself, once per isolate, when it is missing: the Cloudflare token of the
// cloud sessions can deploy but not query D1. Same statements as migrations/0015_forwarding_guide_hub.sql, made
// idempotent, then recorded in d1_migrations so that `wrangler d1 migrations apply` skips it afterwards.
// Can be removed once every database has 0015.
import { db } from "./db";

const NAME = "0015_forwarding_guide_hub.sql";
let done: Promise<void> | null = null;

async function upgrade(): Promise<void> {
  const applied = await db().prepare("SELECT 1 FROM d1_migrations WHERE name = ?").bind(NAME).first().catch(() => null);
  if (applied) return;
  const { results } = await db().prepare("PRAGMA table_info(businesses)").all<{ name: string }>();
  const has = new Set(results.map((c) => c.name));
  const statements = [
    has.has("forwarding_done_at") ? null : "ALTER TABLE businesses ADD COLUMN forwarding_done_at INTEGER",
    has.has("social_links") ? null : "ALTER TABLE businesses ADD COLUMN social_links TEXT",
    has.has("google_profile") ? null : "ALTER TABLE businesses ADD COLUMN google_profile TEXT CHECK (google_profile IN ('connected', 'none'))",
    `CREATE TABLE IF NOT EXISTS google_review_replies (
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE, review_id TEXT NOT NULL, reply TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()), PRIMARY KEY (business_id, review_id))`,
    "CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL DEFAULT (unixepoch()))",
    "CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    `INSERT OR IGNORE INTO d1_migrations (name) VALUES ('${NAME}')`,
  ].filter((s): s is string => !!s);
  await db().batch(statements.map((s) => db().prepare(s)));
  console.log(JSON.stringify({ event: "schema.upgraded", migration: NAME }));
}

// One-off cleanups asked by the team, each run once (marked in app_settings)
const CLEANUPS: { key: string; sql: string }[] = [
  // 29/10: the test replies to Google reviews written while trying the page
  { key: "cleanup_review_replies_2910", sql: "DELETE FROM google_review_replies" },
];

async function cleanups(): Promise<void> {
  for (const c of CLEANUPS) {
    const done = await db().prepare("SELECT 1 FROM app_settings WHERE key = ?").bind(c.key).first();
    if (done) continue;
    await db().batch([db().prepare(c.sql), db().prepare("INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, 'done')").bind(c.key)]);
    console.log(JSON.stringify({ event: "schema.cleanup", key: c.key }));
  }
}

export function ensureSchema(): Promise<void> {
  done ??= upgrade().then(cleanups).catch((e) => {
    done = null; // tried again on the next request
    console.error(JSON.stringify({ event: "schema.upgrade_failed", error: String(e) }));
  });
  return done;
}
