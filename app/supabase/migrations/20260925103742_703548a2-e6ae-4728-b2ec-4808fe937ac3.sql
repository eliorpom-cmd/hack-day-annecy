CREATE TABLE public.phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  receptionist_id uuid REFERENCES public.receptionists(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'twilio',
  provider_number_sid text UNIQUE,
  phone_number text NOT NULL UNIQUE,
  friendly_name text,
  locality text,
  region text,
  country text NOT NULL DEFAULT 'US',
  status text NOT NULL DEFAULT 'provisioning' CHECK (status IN ('provisioning','configuring','live','error','released')),
  status_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.phone_numbers TO authenticated;
GRANT ALL ON public.phone_numbers TO service_role;
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their org numbers" ON public.phone_numbers FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE TRIGGER phone_numbers_updated_at BEFORE UPDATE ON public.phone_numbers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX phone_numbers_org_idx ON public.phone_numbers(organization_id);