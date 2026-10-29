-- Ad drafts of the « Publicités » page (Google search ad, Facebook/Instagram ad).
-- One row per generation attempt: the latest row with data is the draft shown; all rows of the last hour
-- count for the per-business rate limit. data is NULL while writing or when the writing failed.
CREATE TABLE ad_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,            -- google | meta
  data TEXT,                        -- JSON draft (GoogleDraft or MetaDraft, src/lib/ads.ts)
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX ad_drafts_business ON ad_drafts(business_id, created_at);
