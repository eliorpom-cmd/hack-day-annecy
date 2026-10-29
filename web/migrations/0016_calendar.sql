-- Google Calendar (« Connecter mon calendrier » in the setup): when it was connected. Shown connected without the
-- Google API for now; with it, the répondeur offers the next free slots and books the one the caller picks.
ALTER TABLE businesses ADD COLUMN calendar_connected_at INTEGER;

-- Appointments booked by the répondeur during a call (slot picked by the caller, post-call webhook)
CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  starts_at INTEGER NOT NULL,       -- unix seconds
  ends_at INTEGER NOT NULL,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX appointments_business ON appointments(business_id, starts_at);
