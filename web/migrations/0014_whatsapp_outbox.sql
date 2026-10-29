-- Outbox of WhatsApp notifications sent from Elior's second WhatsApp number (GRNBL landline) through Baileys.
-- The Worker cannot reach Baileys: post-call queues a row here when WHATSAPP_RELAY_TOKEN is set, and the relay
-- on the Mac (relay-whatsapp/relay.mjs) polls /api/whatsapp-relay/outbox, sends, then acks.
-- sent_at stays NULL until the relay acks; error holds the relay's reason when the send failed.
CREATE TABLE whatsapp_outbox (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  to_phone TEXT NOT NULL,           -- E.164, e.g. +33612345678
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  sent_at INTEGER,
  error TEXT
);
CREATE INDEX whatsapp_outbox_pending ON whatsapp_outbox(sent_at, created_at);
