-- Demo account for the pitch (fictional artisan)
INSERT INTO users (id, email) VALUES ('demo', 'demo@demo.local');
INSERT INTO businesses (id, owner_id, name, trade, city, description, greeting, onboarding_step)
VALUES ('demo-biz', 'demo', 'Plomberie Démo', 'plombier', 'Annecy',
  'Dépannage plomberie et chauffage, Annecy et alentours.',
  'Bonjour, Plomberie Démo, que puis-je faire pour vous ?', 'done');
INSERT INTO business_hours (business_id, weekday, opens, closes) VALUES
  ('demo-biz', 0, '08:00', '18:00'), ('demo-biz', 1, '08:00', '18:00'), ('demo-biz', 2, '08:00', '18:00'),
  ('demo-biz', 3, '08:00', '18:00'), ('demo-biz', 4, '08:00', '17:00');
