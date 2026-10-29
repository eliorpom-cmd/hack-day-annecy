-- Call forwarding guide (full screen in the app until the artisan confirms it works): when he confirmed.
ALTER TABLE businesses ADD COLUMN forwarding_done_at INTEGER;

-- « Réseaux sociaux »: the artisan's existing pages, JSON {"facebook": url, "instagram": url, "linkedin": url}
ALTER TABLE businesses ADD COLUMN social_links TEXT;

-- « Fiche Google »: 'connected' (shown with test data until the Google API is plugged in) or 'none' (creation guide)
ALTER TABLE businesses ADD COLUMN google_profile TEXT CHECK (google_profile IN ('connected', 'none'));

-- Replies the artisan published to Google reviews (test reviews for now, lib/google-profile.ts)
CREATE TABLE google_review_replies (
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  review_id TEXT NOT NULL,
  reply TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (business_id, review_id)
);

-- App-wide values set by the team (demo voice cloned in advance: key 'demo_voice_id')
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
