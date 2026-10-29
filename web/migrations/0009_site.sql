-- One-page public site of the artisan (/site/<slug>), built from the business, its FAQs and hours.
-- Only the slug, the published flag and the short headline are stored; the rest is read live.
ALTER TABLE businesses ADD COLUMN site_slug TEXT;
ALTER TABLE businesses ADD COLUMN site_published INTEGER NOT NULL DEFAULT 0;
ALTER TABLE businesses ADD COLUMN site_headline TEXT;
ALTER TABLE businesses ADD COLUMN site_updated_at INTEGER;
CREATE UNIQUE INDEX businesses_site_slug ON businesses(site_slug);
