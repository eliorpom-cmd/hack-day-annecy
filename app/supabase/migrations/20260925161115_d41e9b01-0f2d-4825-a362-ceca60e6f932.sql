CREATE TABLE public.usage_overage_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  billed_through_minutes integer NOT NULL,
  minutes integer NOT NULL,
  amount_cents integer NOT NULL,
  stripe_invoice_item_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, period_start, billed_through_minutes)
);
GRANT SELECT ON public.usage_overage_charges TO authenticated;
GRANT ALL ON public.usage_overage_charges TO service_role;
ALTER TABLE public.usage_overage_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view overage charges" ON public.usage_overage_charges
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE email IN ('matthieu.carton98@gmail.com','matthieu.web3@gmail.com')
AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.users.id AND r.role = 'admin');

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;