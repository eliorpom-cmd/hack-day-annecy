-- Accounts and sessions
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE magic_links (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

-- One artisan business per user
CREATE TABLE businesses (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  trade TEXT NOT NULL DEFAULT '',          -- plombier, électricien…
  city TEXT NOT NULL DEFAULT '',
  website TEXT,
  description TEXT NOT NULL DEFAULT '',
  artisan_phone TEXT,                       -- the artisan's own mobile, rung first
  ring_seconds INTEGER NOT NULL DEFAULT 15, -- how long it rings before the agent answers
  greeting TEXT NOT NULL DEFAULT '',
  voice_id TEXT,
  voice_name TEXT,
  elevenlabs_agent_id TEXT,
  onboarding_step TEXT NOT NULL DEFAULT 'business', -- business | voice | number | done
  advanced_mode INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Working hours: during them the artisan's phone rings first
CREATE TABLE business_hours (
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL,   -- 0 = Monday … 6 = Sunday
  opens TEXT NOT NULL,        -- 'HH:MM'
  closes TEXT NOT NULL,
  PRIMARY KEY (business_id, weekday, opens)
);

-- Knowledge base: questions/answers, including prices
CREATE TABLE faqs (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'info', -- info | price
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE phone_numbers (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  e164 TEXT NOT NULL UNIQUE,
  twilio_sid TEXT,
  status TEXT NOT NULL DEFAULT 'live'
);

CREATE TABLE calls (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  from_number TEXT,
  twilio_call_sid TEXT,
  conversation_id TEXT,                 -- ElevenLabs conversation
  handled_by TEXT NOT NULL DEFAULT 'agent', -- artisan | agent | missed
  urgency TEXT NOT NULL DEFAULT 'normal',   -- urgence | urgent | normal
  duration_s INTEGER,
  summary TEXT,
  transcript TEXT,                       -- JSON
  started_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Leads = the CRM, filled by calls
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  call_id TEXT REFERENCES calls(id) ON DELETE SET NULL,
  name TEXT,
  phone TEXT,
  address TEXT,
  need TEXT,
  urgency TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'nouveau', -- nouveau | rappele | devis | gagne | perdu
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX leads_business ON leads(business_id, created_at);
CREATE INDEX calls_business ON calls(business_id, started_at);
