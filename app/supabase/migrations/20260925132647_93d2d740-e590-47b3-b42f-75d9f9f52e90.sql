CREATE TABLE public.app_user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  connector_id text NOT NULL,
  connection_key_ciphertext text NOT NULL,
  account_email text,
  calendar_id text NOT NULL DEFAULT 'primary',
  reconnect_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO service_role;
ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.app_user_connections (organization_id, connector_id);

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  receptionist_id uuid REFERENCES public.receptionists(id) ON DELETE SET NULL,
  caller_name text NOT NULL,
  caller_phone text,
  caller_email text,
  service text,
  notes text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  source text NOT NULL DEFAULT 'phone',
  calendar_provider text NOT NULL DEFAULT 'built_in',
  external_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage org appointments" ON public.appointments FOR ALL TO authenticated
  USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE INDEX ON public.appointments (organization_id, starts_at);
CREATE TRIGGER appointments_updated BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();