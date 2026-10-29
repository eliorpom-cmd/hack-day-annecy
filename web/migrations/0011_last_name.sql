-- Last name of the artisan. A self-employed artisan without a company name is shown and announced
-- as « {prénom} {nom}, {métier} » (lib/greeting.ts businessDisplayName).
ALTER TABLE businesses ADD COLUMN last_name TEXT NOT NULL DEFAULT '';
