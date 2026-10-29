// Applies the newest migrations (then the one-off cleanups below) from the Worker itself, once per isolate, when
// they are missing: the Cloudflare token of the cloud sessions can deploy but not query D1. Same statements as
// migrations/00NN_*.sql, made idempotent, then recorded in d1_migrations so that `wrangler d1 migrations apply`
// skips them afterwards. A migration can be removed from this list once every database has it.
import { db } from "./db";

type Migration = { name: string; columns: [table: string, column: string, type: string][]; statements: string[] };

const MIGRATIONS: Migration[] = [
  {
    name: "0014_whatsapp_outbox.sql",
    columns: [],
    statements: [
      `CREATE TABLE IF NOT EXISTS whatsapp_outbox (
        id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL, to_phone TEXT NOT NULL, body TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()), sent_at INTEGER, error TEXT)`,
      "CREATE INDEX IF NOT EXISTS whatsapp_outbox_pending ON whatsapp_outbox(sent_at, created_at)",
    ],
  },
  {
    name: "0015_forwarding_guide_hub.sql",
    columns: [
      ["businesses", "forwarding_done_at", "INTEGER"],
      ["businesses", "social_links", "TEXT"],
      ["businesses", "google_profile", "TEXT CHECK (google_profile IN ('connected', 'none'))"],
    ],
    statements: [
      `CREATE TABLE IF NOT EXISTS google_review_replies (
        business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE, review_id TEXT NOT NULL, reply TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()), PRIMARY KEY (business_id, review_id))`,
      "CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL DEFAULT (unixepoch()))",
    ],
  },
  {
    name: "0016_calendar.sql",
    columns: [["businesses", "calendar_connected_at", "INTEGER"]],
    statements: [
      `CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL, starts_at INTEGER NOT NULL, ends_at INTEGER NOT NULL,
        title TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()))`,
      "CREATE INDEX IF NOT EXISTS appointments_business ON appointments(business_id, starts_at)",
    ],
  },
];

let done: Promise<void> | null = null;

async function upgrade(): Promise<void> {
  await db().prepare("CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
  const { results } = await db().prepare("SELECT name FROM d1_migrations").all<{ name: string }>();
  const applied = new Set(results.map((r) => r.name));
  for (const m of MIGRATIONS) {
    if (applied.has(m.name)) continue;
    const statements: string[] = [];
    for (const [table, column, type] of m.columns) {
      const { results: cols } = await db().prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
      if (!cols.some((c) => c.name === column)) statements.push(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
    statements.push(...m.statements, `INSERT OR IGNORE INTO d1_migrations (name) VALUES ('${m.name}')`);
    await db().batch(statements.map((s) => db().prepare(s)));
    console.log(JSON.stringify({ event: "schema.upgraded", migration: m.name }));
  }
}

// One-off cleanups asked by the team, each run once (marked in app_settings)
const CLEANUPS: { key: string; sql: string }[] = [
  // 29/10: the test replies to Google reviews written while trying the page
  { key: "cleanup_review_replies_2910", sql: "DELETE FROM google_review_replies" },
];

async function cleanups(): Promise<void> {
  for (const c of CLEANUPS) {
    const marked = await db().prepare("SELECT 1 FROM app_settings WHERE key = ?").bind(c.key).first();
    if (marked) continue;
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
