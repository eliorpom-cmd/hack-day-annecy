import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { callAuthed } from "@/lib/auth/client";
import { ensureOrganizationFn } from "@/lib/org/org.functions";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  component: AuthCallback,
});

function AuthCallback() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const { data } = await supabase.auth.getSession();
        let session = data.session;
        if (!session) {
          const url = new URL(window.location.href);
          if (url.searchParams.get("code")) {
            const { data: exchanged, error: exErr } = await supabase.auth.exchangeCodeForSession(
              window.location.href,
            );
            if (exErr) throw exErr;
            session = exchanged.session;
          }
        }
        if (!session) throw new Error("We couldn't sign you in. The link may have expired.");

        const { organization } = await callAuthed(ensureOrganizationFn);
        if (cancelled) return;
        if (!organization.onboarding_completed) {
          navigate({ to: "/onboarding" });
        } else if (redirect) {
          navigate({ href: redirect });
        } else {
          navigate({ to: "/app" });
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "We couldn't sign you in. Please try again.");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [navigate, redirect]);

  return (
    <div className="surface-gradient flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        {error ? (
          <div className="card-elevated p-8 animate-fade-up">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
            <h1 className="mt-4 font-display text-lg font-semibold text-foreground">
              Sign-in didn't work
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button className="mt-6 w-full" onClick={() => navigate({ to: "/auth" })}>
              Back to sign in
            </Button>
          </div>
        ) : (
          <div className="card-elevated p-8 animate-fade-up">
            <h1 className="font-display text-lg font-semibold text-foreground">Signing you in…</h1>
            <div className="mt-6 space-y-2">
              <div className="skeleton-shimmer h-3 w-full rounded-full" />
              <div className="skeleton-shimmer h-3 w-4/5 rounded-full" />
              <div className="skeleton-shimmer h-3 w-3/5 rounded-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
