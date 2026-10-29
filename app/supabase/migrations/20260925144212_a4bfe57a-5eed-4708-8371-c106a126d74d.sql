CREATE TABLE public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  receptionist_id uuid REFERENCES public.receptionists(id) ON DELETE SET NULL,
  client_id uuid,
  external_id text NOT NULL UNIQUE,
  channel text NOT NULL DEFAULT 'phone',
  caller_phone text,
  status text NOT NULL,
  outcome text,
  summary text,
  title text,
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  duration_secs integer NOT NULL DEFAULT 0,
  has_audio boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX calls_org_started_idx ON public.calls(organization_id, started_at DESC);
GRANT SELECT ON public.calls TO authenticated;
GRANT ALL ON public.calls TO service_role;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read calls" ON public.calls FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  phone text NOT NULL,
  name text,
  email text,
  first_call_at timestamptz NOT NULL,
  last_call_at timestamptz NOT NULL,
  call_count integer NOT NULL DEFAULT 0,
  last_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, phone)
);
GRANT SELECT ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read clients" ON public.clients FOR SELECT TO authenticated USING (public.is_org_member(organization_id));