// WhatsApp outbox drained by the relay on Elior's Mac (relay-whatsapp/relay.mjs, Baileys on the GRNBL number).
// No Cloudflare imports: the database and the token are passed in, so Node tests can drive it.
import { safeEqual } from "./signature.ts";

// Only the part of D1 used here; a node:sqlite adapter satisfies it in tests
export type OutboxDb = Pick<D1Database, "prepare">;

export type OutboxMessage = { id: string; to_phone: string; body: string; created_at: number };

// Messages older than this are not handed to the relay: a late WhatsApp about a past call is noise
export const OUTBOX_MAX_AGE_S = 10 * 60;

const nowS = () => Math.floor(Date.now() / 1000);

export async function enqueueWhatsApp(
  db: OutboxDb,
  msg: { businessId: string; leadId: string | null; to: string; body: string },
  now = nowS(),
): Promise<string> {
  const id = crypto.randomUUID();
  await db.prepare(
    "INSERT INTO whatsapp_outbox (id, business_id, lead_id, to_phone, body, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).bind(id, msg.businessId, msg.leadId, msg.to, msg.body, now).run();
  return id;
}

// Not sent, not failed, younger than OUTBOX_MAX_AGE_S; oldest first
export async function pendingWhatsApp(db: OutboxDb, now = nowS()): Promise<OutboxMessage[]> {
  const { results } = await db.prepare(
    `SELECT id, to_phone, body, created_at FROM whatsapp_outbox
     WHERE sent_at IS NULL AND error IS NULL AND created_at >= ? ORDER BY created_at, id LIMIT 20`,
  ).bind(now - OUTBOX_MAX_AGE_S).all<OutboxMessage>();
  return results;
}

// Marks a pending message as sent, or as failed when `error` is given; false if it was not pending
export async function ackWhatsApp(db: OutboxDb, id: string, error: string | null, now = nowS()): Promise<boolean> {
  const res = error
    ? await db.prepare("UPDATE whatsapp_outbox SET error = ? WHERE id = ? AND sent_at IS NULL AND error IS NULL")
      .bind(error.slice(0, 500), id).run()
    : await db.prepare("UPDATE whatsapp_outbox SET sent_at = ? WHERE id = ? AND sent_at IS NULL AND error IS NULL")
      .bind(now, id).run();
  return (res.meta?.changes ?? 0) > 0;
}

// `Authorization: Bearer <token>`, compared in constant time; false when the secret is not set
export function relayAuthorized(header: string | null, expected: string | undefined): boolean {
  if (!expected || !header) return false;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return !!m && safeEqual(m[1].trim(), expected);
}

const unauthorized = () => Response.json({ error: "unauthorized" }, { status: 401 });

// GET /api/whatsapp-relay/outbox
export async function handleOutbox(request: Request, deps: { db: OutboxDb; token: string | undefined; now?: number }): Promise<Response> {
  if (!relayAuthorized(request.headers.get("Authorization"), deps.token)) return unauthorized();
  return Response.json({ messages: await pendingWhatsApp(deps.db, deps.now) });
}

// POST /api/whatsapp-relay/ack {id, error?}
export async function handleAck(request: Request, deps: { db: OutboxDb; token: string | undefined; now?: number }): Promise<Response> {
  if (!relayAuthorized(request.headers.get("Authorization"), deps.token)) return unauthorized();
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_json" }, { status: 400 }); }
  const { id, error } = (body ?? {}) as { id?: unknown; error?: unknown };
  if (typeof id !== "string" || !id) return Response.json({ error: "missing_id" }, { status: 400 });
  const updated = await ackWhatsApp(deps.db, id, typeof error === "string" && error ? error : null, deps.now);
  return Response.json({ ok: true, updated });
}
