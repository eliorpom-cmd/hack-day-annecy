-- First name of the artisan (« Marc est sur un chantier ») and gender of the chosen library voice
-- (« l'assistant » / « l'assistante »). voice_gender is NULL for the artisan's own voice or an unknown voice.
ALTER TABLE businesses ADD COLUMN first_name TEXT NOT NULL DEFAULT '';
ALTER TABLE businesses ADD COLUMN voice_gender TEXT CHECK (voice_gender IN ('female', 'male'));
UPDATE businesses SET first_name = 'Marc', voice_gender = 'female' WHERE id = 'demo-biz';
