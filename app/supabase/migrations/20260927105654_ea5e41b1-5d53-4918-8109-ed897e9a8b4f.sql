CREATE OR REPLACE FUNCTION public.protect_org_billing_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' OR current_user IN ('postgres','supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.plan_id := 'free';
  ELSE
    NEW.plan_id := OLD.plan_id;
    NEW.trial_ends_at := OLD.trial_ends_at;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS protect_org_billing_fields ON public.organizations;
CREATE TRIGGER protect_org_billing_fields
BEFORE INSERT OR UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.protect_org_billing_fields();