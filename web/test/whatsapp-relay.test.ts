import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  ackWhatsApp, enqueueWhatsApp, handleAck, handleOutbox, OUTBOX_MAX_AGE_S, pendingWhatsApp, relayAuthorized, type OutboxDb,
} from "../src/lib/telephony/whatsapp-relay.ts";
import { sendCallNotification } from "../src/lib/telephony/providers.ts";

// In-memory SQLite behind the small part of the D1 API the outbox uses, with the real 0014 migration
function fakeD1(): OutboxDb {
  const sql = new DatabaseSync(":memory:");
  sql.exec("CREATE TABLE businesses (id TEXT PRIMARY KEY); CREATE TABLE leads (id TEXT PRIMARY KEY);");
  sql.exec(readFileSync(new URL("../migrations/0014_whatsapp_outbox.sql", import.meta.url), "utf8"));
  sql.exec("INSERT INTO businesses VALUES ('b1'); INSERT INTO leads VALUES ('l1');");
  const statement = (query: string, args: unknown[] = []) => ({
    bind: (...next: unknown[]) => statement(query, next),
    run: async () => ({ meta: { changes: Number(sql.prepare(query).run(...(args as never[])).changes) } }),
    all: async () => ({ results: sql.prepare(query).all(...(args as never[])).map((r) => ({ ...r })) }),
  });
  return { prepare: (query: string) => statement(query) } as unknown as OutboxDb;
}

const NOW = 1_800_000_000;
const TOKEN = "relay-secret-123";
const auth = (token = TOKEN) => ({ Authorization: `Bearer ${token}` });

test("queued message is pending until acked, then gone", async () => {
  const db = fakeD1();
  const id = await enqueueWhatsApp(db, { businessId: "b1", leadId: "l1", to: "+33612345678", body: "Urgent" }, NOW);
  assert.deepEqual(await pendingWhatsApp(db, NOW + 5), [{ id, to_phone: "+33612345678", body: "Urgent", created_at: NOW }]);
  assert.equal(await ackWhatsApp(db, id, null, NOW + 6), true);
  assert.deepEqual(await pendingWhatsApp(db, NOW + 7), []);
  // A second ack (relay retry) changes nothing
  assert.equal(await ackWhatsApp(db, id, null, NOW + 8), false);
});

test("failed or older than 10 min: not handed to the relay", async () => {
  const db = fakeD1();
  const old = await enqueueWhatsApp(db, { businessId: "b1", leadId: null, to: "+33600000001", body: "vieux" }, NOW - OUTBOX_MAX_AGE_S - 1);
  const failed = await enqueueWhatsApp(db, { businessId: "b1", leadId: null, to: "+33600000002", body: "raté" }, NOW);
  const fresh = await enqueueWhatsApp(db, { businessId: "b1", leadId: null, to: "+33600000003", body: "frais" }, NOW - OUTBOX_MAX_AGE_S);
  assert.equal(await ackWhatsApp(db, failed, "not on WhatsApp", NOW), true);
  const ids = (await pendingWhatsApp(db, NOW)).map((m) => m.id);
  assert.deepEqual(ids, [fresh]);
  assert.ok(!ids.includes(old));
});

test("Bearer check: constant-time compare, refused without a configured token", () => {
  assert.ok(relayAuthorized(`Bearer ${TOKEN}`, TOKEN));
  assert.ok(relayAuthorized(`bearer  ${TOKEN} `, TOKEN));
  assert.ok(!relayAuthorized(`Bearer ${TOKEN}x`, TOKEN));
  assert.ok(!relayAuthorized(TOKEN, TOKEN));
  assert.ok(!relayAuthorized("Bearer ", TOKEN));
  assert.ok(!relayAuthorized(null, TOKEN));
  assert.ok(!relayAuthorized(`Bearer ${TOKEN}`, undefined));
  assert.ok(!relayAuthorized("Bearer undefined", undefined));
});

test("outbox route: 401 without the right token, messages with it", async () => {
  const db = fakeD1();
  await enqueueWhatsApp(db, { businessId: "b1", leadId: "l1", to: "+33612345678", body: "Bonjour" }, NOW);
  const url = "https://x.test/api/whatsapp-relay/outbox";
  for (const headers of [{}, auth("wrong"), { Authorization: TOKEN }]) {
    const res = await handleOutbox(new Request(url, { headers }), { db, token: TOKEN, now: NOW });
    assert.equal(res.status, 401);
  }
  // Secret not set on the Worker: always 401, even with an empty bearer
  assert.equal((await handleOutbox(new Request(url, { headers: auth("") }), { db, token: undefined, now: NOW })).status, 401);
  const ok = await handleOutbox(new Request(url, { headers: auth() }), { db, token: TOKEN, now: NOW });
  assert.equal(ok.status, 200);
  const { messages } = (await ok.json()) as { messages: { body: string }[] };
  assert.deepEqual(messages.map((m) => m.body), ["Bonjour"]);
});

test("ack route: auth, validation, sent and error", async () => {
  const db = fakeD1();
  const a = await enqueueWhatsApp(db, { businessId: "b1", leadId: null, to: "+33600000001", body: "a" }, NOW);
  const b = await enqueueWhatsApp(db, { businessId: "b1", leadId: null, to: "+33600000002", body: "b" }, NOW);
  const post = (body: string, headers: Record<string, string> = auth()) =>
    handleAck(new Request("https://x.test/api/whatsapp-relay/ack", { method: "POST", headers, body }), { db, token: TOKEN, now: NOW });
  assert.equal((await post(JSON.stringify({ id: a }), auth("nope"))).status, 401);
  assert.equal((await post("not json")).status, 400);
  assert.equal((await post(JSON.stringify({}))).status, 400);
  assert.deepEqual(await (await post(JSON.stringify({ id: a }))).json(), { ok: true, updated: true });
  assert.deepEqual(await (await post(JSON.stringify({ id: b, error: "not on WhatsApp" }))).json(), { ok: true, updated: true });
  assert.deepEqual(await (await post(JSON.stringify({ id: "unknown" }))).json(), { ok: true, updated: false });
  assert.deepEqual(await pendingWhatsApp(db, NOW), []);
});

test("sendCallNotification queues instead of calling Twilio when a relay is given", async () => {
  const realFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return new Response(JSON.stringify({ sid: "SM1" }), { status: 201 });
  }) as typeof fetch;
  const creds = { accountSid: "AC1", authToken: "t", smsFrom: "+33100000000", whatsappFrom: "+14155238886" };
  try {
    const queued: string[] = [];
    const ok = await sendCallNotification(creds, "+33612345678", "Urgent", async (to, body) => { queued.push(`${to}|${body}`); return "q1"; });
    assert.deepEqual(ok, { channel: "whatsapp", sid: "q1" });
    assert.deepEqual(queued, ["+33612345678|Urgent"]);
    assert.equal(calls.length, 0);

    // Queue failure: SMS fallback, never Twilio WhatsApp
    const fallback = await sendCallNotification(creds, "+33612345678", "Urgent", async () => { throw new Error("D1 down"); });
    assert.deepEqual(fallback, { channel: "sms", sid: "SM1" });
    assert.equal(calls.length, 1);
    const smsBody = calls[0];
    assert.match(smsBody, /Messages\.json$/);

    // No relay: unchanged behaviour, Twilio WhatsApp first
    calls.length = 0;
    assert.deepEqual(await sendCallNotification(creds, "+33612345678", "Urgent"), { channel: "whatsapp", sid: "SM1" });
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = realFetch;
  }
});
