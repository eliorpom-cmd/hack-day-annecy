CREATE TABLE public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  stripe_subscription_id text not null unique,
  stripe_customer_id text not null,
  product_id text not null,
  price_id text not null,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  environment text not null default 'sandbox',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
CREATE INDEX idx_subscriptions_org ON public.subscriptions(organization_id);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subs_member_select ON public.subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(organization_id));

UPDATE public.plans SET stripe_price_id_monthly = id || '_monthly', stripe_price_id_annual = id || '_yearly' WHERE id IN ('basic','pro');