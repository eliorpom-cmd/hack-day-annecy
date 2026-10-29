-- Call page opened from the WhatsApp/SMS link: secret token per lead, urgency reason, callback tracking
ALTER TABLE leads ADD COLUMN urgency_reason TEXT;
ALTER TABLE leads ADD COLUMN link_token TEXT;
ALTER TABLE leads ADD COLUMN recall_started_at INTEGER;
ALTER TABLE leads ADD COLUMN called_back_at INTEGER;
CREATE UNIQUE INDEX leads_link_token ON leads(link_token);
UPDATE leads SET link_token = lower(hex(randomblob(12))) WHERE link_token IS NULL;
UPDATE leads SET link_token = 'demo-fuite' WHERE id = 'demo-lead-1';
UPDATE leads SET urgency_reason = 'L''eau coule dans le placard sous l''évier.' WHERE id = 'demo-lead-1';
