-- « Réseaux sociaux »: posts written for the artisan (the page shows the last 5; rows also feed the rate limit)
CREATE TABLE social_posts (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  network TEXT NOT NULL,           -- facebook | instagram | linkedin
  topic TEXT NOT NULL,
  body TEXT NOT NULL,
  model TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX social_posts_business ON social_posts(business_id, created_at);
