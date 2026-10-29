-- ========== helpers ==========
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.receptionist_status AS ENUM (
  'draft','scanning','review_required','creating_agent','agent_ready',
  'phone_pending','phone_provisioning','phone_configuring','live','error','suspended'
);
CREATE TYPE public.scan_status AS ENUM ('queued','crawling','extracting','completed','failed');

-- ========== profiles ==========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own_select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_own_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_own_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== platform roles ==========
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_own_select" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ========== organizations ==========
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  industry TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  country TEXT NOT NULL DEFAULT 'US',
  plan_id TEXT NOT NULL DEFAULT 'free',
  onboarding_step TEXT NOT NULL DEFAULT 'business',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX organization_members_user_idx ON public.organization_members(user_id);

CREATE OR REPLACE FUNCTION public.is_org_member(_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = _org_id AND user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = _org_id AND user_id = auth.uid() AND role IN ('owner','admin'))
$$;

CREATE POLICY "orgs_member_select" ON public.organizations FOR SELECT TO authenticated USING (public.is_org_member(id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "orgs_owner_insert" ON public.organizations FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "orgs_admin_update" ON public.organizations FOR UPDATE TO authenticated USING (public.is_org_admin(id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "orgs_owner_delete" ON public.organizations FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "members_select" ON public.organization_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_org_member(organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "members_insert" ON public.organization_members FOR INSERT TO authenticated WITH CHECK (
  (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_id = auth.uid()))
  OR public.is_org_admin(organization_id)
);
CREATE POLICY "members_admin_update" ON public.organization_members FOR UPDATE TO authenticated USING (public.is_org_admin(organization_id));
CREATE POLICY "members_admin_delete" ON public.organization_members FOR DELETE TO authenticated USING (public.is_org_admin(organization_id) OR user_id = auth.uid());

-- ========== business data ==========
CREATE TABLE public.business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL DEFAULT '',
  industry TEXT,
  description TEXT,
  address TEXT, city TEXT, state TEXT, postal_code TEXT, country TEXT DEFAULT 'US',
  phone TEXT, email TEXT, website TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  booking_url TEXT,
  policies TEXT,
  booking_rules TEXT,
  cancellation_rules TEXT,
  transfer_rules TEXT,
  emergency_rules TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_profiles TO authenticated;
GRANT ALL ON public.business_profiles TO service_role;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bp_member_all" ON public.business_profiles FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE TRIGGER bp_updated_at BEFORE UPDATE ON public.business_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  enabled BOOLEAN NOT NULL DEFAULT true,
  open_time TIME NOT NULL DEFAULT '09:00',
  close_time TIME NOT NULL DEFAULT '17:00',
  UNIQUE (organization_id, day_of_week, open_time)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_hours TO authenticated;
GRANT ALL ON public.business_hours TO service_role;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bh_member_all" ON public.business_hours FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  price NUMERIC(10,2),
  price_note TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_member_all" ON public.services FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE TRIGGER services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  calendar_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_member_all" ON public.staff FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

CREATE TABLE public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faqs TO authenticated;
GRANT ALL ON public.faqs TO service_role;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faqs_member_all" ON public.faqs FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

-- ========== knowledge ==========
CREATE TABLE public.knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'website',
  url TEXT,
  title TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_sources TO authenticated;
GRANT ALL ON public.knowledge_sources TO service_role;
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ks_member_all" ON public.knowledge_sources FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

CREATE TABLE public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.knowledge_sources(id) ON DELETE SET NULL,
  title TEXT,
  url TEXT,
  content TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_documents TO authenticated;
GRANT ALL ON public.knowledge_documents TO service_role;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kd_member_all" ON public.knowledge_documents FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE TRIGGER kd_updated_at BEFORE UPDATE ON public.knowledge_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== platform config ==========
CREATE TABLE public.voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  elevenlabs_voice_id TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  gender TEXT,
  description TEXT,
  recommended_industries TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.voices TO anon, authenticated;
GRANT ALL ON public.voices TO service_role;
ALTER TABLE public.voices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "voices_public_read" ON public.voices FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  annual_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  included_minutes INTEGER NOT NULL DEFAULT 0,
  included_numbers INTEGER NOT NULL DEFAULT 0,
  max_receptionists INTEGER NOT NULL DEFAULT 1,
  max_concurrent_calls INTEGER NOT NULL DEFAULT 1,
  overage_price_per_minute NUMERIC(10,4) NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  highlights TEXT[] NOT NULL DEFAULT '{}',
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  stripe_price_id_monthly TEXT,
  stripe_price_id_annual TEXT
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_public_read" ON public.plans FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT
);
GRANT SELECT ON public.feature_flags TO anon, authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags_public_read" ON public.feature_flags FOR SELECT TO anon, authenticated USING (true);

-- ========== receptionists ==========
CREATE TABLE public.receptionists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status public.receptionist_status NOT NULL DEFAULT 'draft',
  status_message TEXT,
  elevenlabs_agent_id TEXT,
  elevenlabs_phone_number_id TEXT,
  voice_id UUID REFERENCES public.voices(id),
  language TEXT NOT NULL DEFAULT 'en',
  supported_languages TEXT[] NOT NULL DEFAULT '{en}',
  greeting TEXT,
  after_hours_greeting TEXT,
  personality TEXT NOT NULL DEFAULT 'professional, warm, concise, helpful',
  tone TEXT NOT NULL DEFAULT 'warm',
  system_prompt TEXT,
  custom_instructions TEXT,
  config_version INTEGER NOT NULL DEFAULT 0,
  last_published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receptionists TO authenticated;
GRANT ALL ON public.receptionists TO service_role;
ALTER TABLE public.receptionists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rec_member_all" ON public.receptionists FOR ALL TO authenticated USING (public.is_org_member(organization_id) OR public.has_role(auth.uid(),'admin')) WITH CHECK (public.is_org_member(organization_id));
CREATE TRIGGER rec_updated_at BEFORE UPDATE ON public.receptionists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX receptionists_org_idx ON public.receptionists(organization_id);

CREATE TABLE public.receptionist_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receptionist_id UUID NOT NULL UNIQUE REFERENCES public.receptionists(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  answering_mode TEXT NOT NULL DEFAULT 'receptionist_first',
  after_hours_enabled BOOLEAN NOT NULL DEFAULT true,
  appointment_booking_enabled BOOLEAN NOT NULL DEFAULT true,
  call_transfer_enabled BOOLEAN NOT NULL DEFAULT false,
  transfer_destinations JSONB NOT NULL DEFAULT '[]'::jsonb,
  voicemail_enabled BOOLEAN NOT NULL DEFAULT true,
  spam_filter_enabled BOOLEAN NOT NULL DEFAULT true,
  recording_enabled BOOLEAN NOT NULL DEFAULT true,
  transcription_enabled BOOLEAN NOT NULL DEFAULT true,
  multilingual_enabled BOOLEAN NOT NULL DEFAULT false,
  max_call_duration INTEGER NOT NULL DEFAULT 600,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receptionist_settings TO authenticated;
GRANT ALL ON public.receptionist_settings TO service_role;
ALTER TABLE public.receptionist_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rs_member_all" ON public.receptionist_settings FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE TRIGGER rs_updated_at BEFORE UPDATE ON public.receptionist_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== scan jobs ==========
CREATE TABLE public.scan_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status public.scan_status NOT NULL DEFAULT 'queued',
  stage TEXT NOT NULL DEFAULT 'Starting scan',
  progress INTEGER NOT NULL DEFAULT 0,
  pages_found INTEGER NOT NULL DEFAULT 0,
  pages_crawled INTEGER NOT NULL DEFAULT 0,
  result JSONB,
  error TEXT,
  error_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scan_jobs TO authenticated;
GRANT ALL ON public.scan_jobs TO service_role;
ALTER TABLE public.scan_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scan_member_all" ON public.scan_jobs FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE TRIGGER scan_updated_at BEFORE UPDATE ON public.scan_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== demo sessions (server-only) ==========
CREATE TABLE public.demo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  session_key TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seconds_allowed INTEGER NOT NULL DEFAULT 180
);
GRANT ALL ON public.demo_sessions TO service_role;
ALTER TABLE public.demo_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX demo_sessions_ip_idx ON public.demo_sessions(ip_hash, started_at);

-- ========== audit logs ==========
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_member_select" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_org_member(organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "audit_member_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id) AND user_id = auth.uid());

-- ========== seed: voices ==========
INSERT INTO public.voices (name, elevenlabs_voice_id, language, gender, description, recommended_industries, is_default, sort_order) VALUES
('Jason',      'cjVigY5qzO86Huf0OWal', 'en', 'male',   'Calm, conversational, reassuring', '{home-services,plumbers,real-estate}', true, 1),
('Ms. Walker', 'EXAVITQu4vr4xnSDxMaL', 'en', 'female', 'Warm, professional, reassuring',   '{dentists,salons,law-firms}', false, 2),
('Daniel',     'onwK4e9ZLuTAKqWW03F9', 'en', 'male',   'Clear, confident, polished',        '{law-firms,real-estate}', false, 3),
('Lily',       'pFZP5JQG7iQjIQuC4Bku', 'en', 'female', 'Friendly, upbeat, welcoming',       '{salons,dentists}', false, 4),
('Brian',      'nPczCjzI2devNBz1zQrb', 'en', 'male',   'Deep, steady, trustworthy',         '{home-services,plumbers}', false, 5),
('Matilda',    'XrExE9yKIg1WjnnlVkGX', 'en', 'female', 'Bright, articulate, professional',  '{dentists,law-firms}', false, 6);

-- ========== seed: plans ==========
INSERT INTO public.plans (id, name, description, monthly_price, annual_price, included_minutes, included_numbers, max_receptionists, max_concurrent_calls, overage_price_per_minute, features, highlights, is_popular, is_custom, sort_order) VALUES
('free', 'Free', 'Build and test your receptionist in the browser.', 0, 0, 0, 0, 1, 1, 0,
  '{"browser_demo":true,"phone_numbers":false,"calendar":false,"call_transfer":false,"analytics":true,"multiple_receptionists":false,"advanced_analytics":false,"priority_support":false}',
  '{"Browser receptionist","Website scan","Receptionist creation","Limited test minutes"}', false, false, 1),
('basic', 'Basic', 'A dedicated number and everything you need to go live.', 29, 290, 75, 1, 1, 1, 0.25,
  '{"browser_demo":true,"phone_numbers":true,"calendar":false,"call_transfer":true,"analytics":true,"multiple_receptionists":false,"advanced_analytics":false,"priority_support":false}',
  '{"Dedicated business number","75 included minutes","Call summaries & transcripts","Message taking","Overage at $0.25/min"}', false, false, 2),
('pro', 'Pro', 'More minutes, multiple numbers and calendar booking.', 79, 790, 275, 2, 3, 3, 0.20,
  '{"browser_demo":true,"phone_numbers":true,"calendar":true,"call_transfer":true,"analytics":true,"multiple_receptionists":true,"advanced_analytics":true,"priority_support":true}',
  '{"Up to 2 business numbers","275 included minutes","Calendar booking","3 concurrent calls","Advanced analytics","Priority support"}', true, false, 3),
('business', 'Business', 'Custom volume, locations and integrations.', 0, 0, 1000, 5, 10, 10, 0.15,
  '{"browser_demo":true,"phone_numbers":true,"calendar":true,"call_transfer":true,"analytics":true,"multiple_receptionists":true,"advanced_analytics":true,"priority_support":true,"multi_location":true,"api_access":true}',
  '{"Custom minutes","Multiple locations","CRM integrations","Dedicated onboarding","SLA"}', false, true, 4);

-- ========== seed: feature flags ==========
INSERT INTO public.feature_flags (key, enabled, description) VALUES
('browser_demo', true, 'Free landing-page voice demo'),
('phone_numbers', true, 'Phone number provisioning'),
('calendar', true, 'Calendar integrations'),
('call_transfer', true, 'Call transfer'),
('analytics', true, 'Analytics dashboard'),
('multiple_receptionists', true, 'More than one receptionist per organization'),
('multi_location', false, 'Multi-location businesses'),
('advanced_analytics', true, 'Advanced analytics'),
('crm', false, 'CRM integrations'),
('api_access', false, 'Public API access');

-- ========== seed: demo organization ==========
INSERT INTO public.organizations (id, owner_id, name, slug, industry, timezone, country, plan_id, onboarding_step, onboarding_completed)
VALUES ('00000000-0000-0000-0000-00000000d3a0', NULL, 'Half Price Roof LLC', 'half-price-roof', 'home-services', 'America/Chicago', 'US', 'pro', 'live', true);

INSERT INTO public.business_profiles (organization_id, business_name, industry, description, address, city, state, postal_code, phone, email, website, timezone, booking_rules, transfer_rules, emergency_rules)
VALUES ('00000000-0000-0000-0000-00000000d3a0', 'Half Price Roof LLC', 'home-services',
 'Family-owned roofing company serving the Chicago area for over 15 years. Residential and commercial roof repair, replacement, inspections and storm damage restoration.',
 '4821 W Belmont Ave', 'Chicago', 'IL', '60641', '+1 (312) 555-0142', 'hello@halfpriceroof.com', 'https://halfpriceroof.example.com', 'America/Chicago',
 'Inspections can be booked Monday to Saturday between 8am and 5pm. Estimates are free. Ask for the property address before booking.',
 'Transfer to the office manager for billing disputes or insurance claim questions.',
 'For active leaks or storm damage, take the caller''s address and phone number and mark the message as urgent.');

INSERT INTO public.business_hours (organization_id, day_of_week, enabled, open_time, close_time) VALUES
('00000000-0000-0000-0000-00000000d3a0', 0, false, '09:00', '17:00'),
('00000000-0000-0000-0000-00000000d3a0', 1, true, '08:00', '18:00'),
('00000000-0000-0000-0000-00000000d3a0', 2, true, '08:00', '18:00'),
('00000000-0000-0000-0000-00000000d3a0', 3, true, '08:00', '18:00'),
('00000000-0000-0000-0000-00000000d3a0', 4, true, '08:00', '18:00'),
('00000000-0000-0000-0000-00000000d3a0', 5, true, '08:00', '18:00'),
('00000000-0000-0000-0000-00000000d3a0', 6, true, '09:00', '14:00');

INSERT INTO public.services (organization_id, name, description, duration_minutes, price, price_note, sort_order) VALUES
('00000000-0000-0000-0000-00000000d3a0', 'Roof inspection', 'Full 21-point inspection with photo report.', 60, 0, 'Free', 1),
('00000000-0000-0000-0000-00000000d3a0', 'Roof repair', 'Leak repair, flashing, shingle replacement.', 120, 350, 'Starting at', 2),
('00000000-0000-0000-0000-00000000d3a0', 'Roof replacement', 'Complete tear-off and replacement, asphalt or metal.', 480, 8500, 'Starting at', 3),
('00000000-0000-0000-0000-00000000d3a0', 'Gutter cleaning & repair', 'Cleaning, resealing and downspout repair.', 90, 175, 'Starting at', 4),
('00000000-0000-0000-0000-00000000d3a0', 'Storm damage assessment', 'Insurance-ready damage documentation.', 60, 0, 'Free', 5);

INSERT INTO public.staff (organization_id, name, role, email, phone) VALUES
('00000000-0000-0000-0000-00000000d3a0', 'Mike Reyes', 'Owner', 'mike@halfpriceroof.com', '+1 (312) 555-0101'),
('00000000-0000-0000-0000-00000000d3a0', 'Dana Whitfield', 'Office manager', 'dana@halfpriceroof.com', '+1 (312) 555-0102'),
('00000000-0000-0000-0000-00000000d3a0', 'Carlos Mendes', 'Lead estimator', 'carlos@halfpriceroof.com', '+1 (312) 555-0103'),
('00000000-0000-0000-0000-00000000d3a0', 'Priya Natarajan', 'Project coordinator', 'priya@halfpriceroof.com', '+1 (312) 555-0104'),
('00000000-0000-0000-0000-00000000d3a0', 'Tom Kowalski', 'Crew lead', 'tom@halfpriceroof.com', '+1 (312) 555-0105');

INSERT INTO public.faqs (organization_id, question, answer, sort_order) VALUES
('00000000-0000-0000-0000-00000000d3a0', 'Do you offer free estimates?', 'Yes, inspections and estimates are always free.', 1),
('00000000-0000-0000-0000-00000000d3a0', 'Do you work with insurance companies?', 'Yes, we document storm damage and work directly with your insurer.', 2),
('00000000-0000-0000-0000-00000000d3a0', 'What areas do you serve?', 'Chicago and suburbs within about 40 miles.', 3),
('00000000-0000-0000-0000-00000000d3a0', 'Do you offer financing?', 'Yes, 0% financing for 12 months on qualifying replacements.', 4),
('00000000-0000-0000-0000-00000000d3a0', 'Is your work warrantied?', 'All repairs carry a 5-year workmanship warranty; replacements carry 25 years.', 5);

INSERT INTO public.receptionists (id, organization_id, name, status, voice_id, greeting, personality, tone)
SELECT '00000000-0000-0000-0000-00000000d3a1', '00000000-0000-0000-0000-00000000d3a0', 'Half Price Roof LLC''s Receptionist', 'agent_ready', v.id,
 'Hello! Thanks for calling Half Price Roof LLC. How can I help you today?', 'professional, warm, concise, helpful', 'warm'
FROM public.voices v WHERE v.name = 'Jason';

INSERT INTO public.receptionist_settings (receptionist_id, organization_id, call_transfer_enabled, transfer_destinations)
VALUES ('00000000-0000-0000-0000-00000000d3a1', '00000000-0000-0000-0000-00000000d3a0', true,
 '[{"name":"Dana Whitfield","department":"Office","phone":"+13125550102","rules":["billing","insurance","urgent"]}]');