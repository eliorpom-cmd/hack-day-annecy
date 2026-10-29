ALTER TABLE public.voices ADD COLUMN IF NOT EXISTS preview_url text;
ALTER TABLE public.voices ADD COLUMN IF NOT EXISTS accent text NOT NULL DEFAULT 'american';

UPDATE public.voices SET active = false WHERE elevenlabs_voice_id IN ('onwK4e9ZLuTAKqWW03F9', 'pFZP5JQG7iQjIQuC4Bku');

UPDATE public.voices SET preview_url = 'https://storage.googleapis.com/eleven-public-prod/premade/voices/cjVigY5qzO86Huf0OWal/d098fda0-6456-4030-b3d8-63aa048c9070.mp3', accent = 'american', description = 'Smooth, trustworthy, conversational' WHERE elevenlabs_voice_id = 'cjVigY5qzO86Huf0OWal';
UPDATE public.voices SET preview_url = 'https://storage.googleapis.com/eleven-public-prod/premade/voices/EXAVITQu4vr4xnSDxMaL/01a3e33c-6e99-4ee7-8543-ff2216a32186.mp3', accent = 'american', description = 'Professional, reassuring, confident' WHERE elevenlabs_voice_id = 'EXAVITQu4vr4xnSDxMaL';
UPDATE public.voices SET preview_url = 'https://api.us.elevenlabs.io/v1/voices/nPczCjzI2devNBz1zQrb/previews/audio?payload=eyJ2b2ljZV9zb3VyY2UiOiJwcmVtYWRlIiwiZmlsZW5hbWUiOiIyZGQzZTcyYy00ZmQzLTQyZjEtOTNlYS1hYmM1ZDRlNWFhMWQubXAzIiwidGltZXN0YW1wIjoxNzkwMzQ0ODAwMDAwMDAwfQ%3D%3D', accent = 'american', description = 'Deep, steady, comforting' WHERE elevenlabs_voice_id = 'nPczCjzI2devNBz1zQrb';
UPDATE public.voices SET preview_url = 'https://storage.googleapis.com/eleven-public-prod/premade/voices/XrExE9yKIg1WjnnlVkGX/b930e18d-6b4d-466e-bab2-0ae97c6d8535.mp3', accent = 'american', description = 'Articulate, upbeat, knowledgeable' WHERE elevenlabs_voice_id = 'XrExE9yKIg1WjnnlVkGX';

INSERT INTO public.voices (name, elevenlabs_voice_id, language, gender, description, accent, preview_url, active, is_default, sort_order, recommended_industries)
SELECT * FROM (VALUES
  ('Jessica', 'cgSgspJ2msm6clMCkdW9', 'en', 'female', 'Warm, friendly, bright', 'american', 'https://storage.googleapis.com/eleven-public-prod/premade/voices/cgSgspJ2msm6clMCkdW9/56a97bf8-b69b-448f-846c-c3a11683d45a.mp3', true, false, 3, ARRAY['salons-spas','restaurants','real-estate']),
  ('Bella', 'hpp4J3VqNfWAUOO0d1Us', 'en', 'female', 'Polished, bright, executive', 'american', 'https://storage.googleapis.com/eleven-public-prod/premade/voices/hpp4J3VqNfWAUOO0d1Us/dab0f5ba-3aa4-48a8-9fad-f138fea1126d.mp3', true, false, 4, ARRAY['real-estate','law-offices','medical-clinics']),
  ('Roger', 'CwhRBWXzGAHq8TQ4Fs17', 'en', 'male', 'Laid-back, resonant, approachable', 'american', 'https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/58ee3ff5-f6f2-4628-93b8-e38eb31806b0.mp3', true, false, 7, ARRAY['auto-services','home-services']),
  ('Will', 'bIHbv24MWmeRgasZH58o', 'en', 'male', 'Fresh, casual, relatable', 'american', 'https://storage.googleapis.com/eleven-public-prod/premade/voices/bIHbv24MWmeRgasZH58o/8caf8f3d-ad29-4980-af41-53f20c72d7a4.mp3', true, false, 8, ARRAY['restaurants','salons-spas','home-services'])
) AS v(name, elevenlabs_voice_id, language, gender, description, accent, preview_url, active, is_default, sort_order, recommended_industries)
WHERE NOT EXISTS (SELECT 1 FROM public.voices existing WHERE existing.elevenlabs_voice_id = v.elevenlabs_voice_id);