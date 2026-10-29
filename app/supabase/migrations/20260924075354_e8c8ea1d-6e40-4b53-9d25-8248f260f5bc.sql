CREATE POLICY orgs_owner_select ON public.organizations FOR SELECT TO authenticated USING (owner_id = auth.uid());

-- Backfill: create a workspace for any existing user without one
DO $$
DECLARE u record; new_org uuid;
BEGIN
  FOR u IN SELECT au.id, au.email, au.raw_user_meta_data m FROM auth.users au
    WHERE NOT EXISTS (SELECT 1 FROM public.organization_members om WHERE om.user_id = au.id)
  LOOP
    INSERT INTO public.profiles (id, email, name) VALUES (u.id, u.email, coalesce(u.m->>'full_name', u.m->>'name'))
      ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.organizations (owner_id, name, slug, trial_ends_at)
      VALUES (u.id, coalesce((u.m->>'full_name') || '''s business', 'My business'),
              'business-' || substr(gen_random_uuid()::text, 1, 8), now() + interval '14 days')
      RETURNING id INTO new_org;
    INSERT INTO public.organization_members (organization_id, user_id, role) VALUES (new_org, u.id, 'owner');
  END LOOP;
END $$;