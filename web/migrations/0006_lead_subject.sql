-- Short subject of the call (2-4 words), used as the title of the call page and line 1 of the message
ALTER TABLE leads ADD COLUMN subject TEXT;
UPDATE leads SET subject = 'fuite d''eau' WHERE id = 'demo-lead-1';
