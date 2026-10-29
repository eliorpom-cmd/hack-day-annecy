-- Fictional content for the demo artisan 'demo-biz' so the dashboard is not empty.
-- Phone numbers use the ARCEP ranges reserved for fiction (06 39 98 xx xx).
-- Timestamps are relative to the moment the migration runs.

UPDATE businesses SET artisan_phone = '+33639980000', voice_name = 'Charlotte', voice_id = 'XB0fDUnXU5powFXDhCwa',
  website = 'https://plomberie-demo.fr'
WHERE id = 'demo-biz';

INSERT INTO faqs (id, business_id, question, answer, kind) VALUES
  ('demo-faq-1', 'demo-biz', 'Combien coûte le déplacement ?', 'Le déplacement est facturé 49 € TTC à Annecy et dans les communes voisines.', 'price'),
  ('demo-faq-2', 'demo-biz', 'Combien coûte un débouchage d''évier ou de WC ?', 'Entre 90 et 150 € TTC selon l''accès.', 'price'),
  ('demo-faq-3', 'demo-biz', 'Combien coûte le remplacement d''un chauffe-eau ?', 'Entre 900 et 1 800 € TTC pose comprise, selon la capacité.', 'price'),
  ('demo-faq-4', 'demo-biz', 'Le devis est-il gratuit ?', 'Oui, le devis est gratuit et sans engagement.', 'info'),
  ('demo-faq-5', 'demo-biz', 'Quelle est votre zone d''intervention ?', 'Annecy, Seynod, Cran-Gevrier, Annecy-le-Vieux, Épagny et les communes à moins de 20 km.', 'info'),
  ('demo-faq-6', 'demo-biz', 'Intervenez-vous en urgence le week-end ?', 'Oui, pour les fuites importantes et les dégâts des eaux, 7 jours sur 7.', 'info'),
  ('demo-faq-7', 'demo-biz', 'Quels moyens de paiement acceptez-vous ?', 'Carte bancaire, chèque, virement et espèces.', 'info');

INSERT INTO calls (id, business_id, from_number, handled_by, urgency, duration_s, summary, transcript, started_at) VALUES
  ('demo-call-1', 'demo-biz', '+33639980101', 'agent', 'urgence', 142,
   'Fuite d''eau importante sous l''évier, l''eau coule dans le placard. Le client a coupé l''arrivée d''eau.',
   '[{"role":"agent","message":"Bonjour, Plomberie Démo, que puis-je faire pour vous ?"},{"role":"user","message":"Bonjour, j''ai une grosse fuite sous mon évier, ça coule partout."},{"role":"agent","message":"Je comprends. Avez-vous pu couper l''arrivée d''eau ?"},{"role":"user","message":"Oui, c''est coupé."},{"role":"agent","message":"Très bien. Je préviens l''artisan immédiatement, il vous rappelle au plus vite. Puis-je avoir votre nom et votre adresse ?"}]',
   unixepoch() - 2 * 3600),
  ('demo-call-2', 'demo-biz', '+33639980102', 'agent', 'normal', 96,
   'Demande de devis pour remplacer un chauffe-eau de 200 litres. Fourchette de prix donnée, devis à faire.',
   '[{"role":"agent","message":"Bonjour, Plomberie Démo, que puis-je faire pour vous ?"},{"role":"user","message":"Combien coûte le remplacement d''un chauffe-eau ?"},{"role":"agent","message":"Entre 900 et 1 800 euros pose comprise, selon la capacité. Le prix exact se fait sur devis."}]',
   unixepoch() - 26 * 3600),
  ('demo-call-3', 'demo-biz', '+33639980103', 'artisan', 'normal', 210, 'Appel pris directement par l''artisan.', NULL,
   unixepoch() - 2 * 86400),
  ('demo-call-4', 'demo-biz', '+33639980104', 'agent', 'urgent', 118,
   'WC bouché depuis ce matin, seul WC du logement. Souhaite une intervention sous 48 h.',
   NULL, unixepoch() - 3 * 86400),
  ('demo-call-5', 'demo-biz', '+33639980105', 'agent', 'normal', 74,
   'Robinet de cuisine qui goutte, demande de rappel pour un rendez-vous.',
   NULL, unixepoch() - 5 * 86400),
  ('demo-call-6', 'demo-biz', '+33639980106', 'missed', 'normal', 0, NULL, NULL, unixepoch() - 9 * 86400);

INSERT INTO leads (id, business_id, call_id, name, phone, address, need, urgency, status, created_at) VALUES
  ('demo-lead-1', 'demo-biz', 'demo-call-1', 'Claire Martin', '+33639980101', '12 rue Royale, 74000 Annecy',
   'Fuite d''eau importante sous l''évier', 'urgence', 'nouveau', unixepoch() - 2 * 3600),
  ('demo-lead-2', 'demo-biz', 'demo-call-2', 'Julien Bernard', '+33639980102', '5 chemin des Fins, 74000 Annecy',
   'Remplacement d''un chauffe-eau 200 L', 'normal', 'devis', unixepoch() - 26 * 3600),
  ('demo-lead-3', 'demo-biz', 'demo-call-4', 'Sophie Durand', '+33639980104', '8 avenue de Genève, 74960 Cran-Gevrier',
   'WC bouché, seul WC du logement', 'urgent', 'rappele', unixepoch() - 3 * 86400),
  ('demo-lead-4', 'demo-biz', 'demo-call-5', 'Marc Petit', '+33639980105', '3 place des Romains, 74600 Seynod',
   'Robinet de cuisine qui goutte', 'normal', 'gagne', unixepoch() - 5 * 86400);
