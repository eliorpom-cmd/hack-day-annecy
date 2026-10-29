import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { callAuthed, useSession } from "@/lib/auth/client";
import { getWorkspaceFn } from "@/lib/org/org.functions";
import { setOnboardingStepFn } from "@/lib/org/org.functions";
import type { BusinessProfile } from "@/lib/business/schema";
import { Logo } from "@/components/brand/Logo";
import { OnboardingProgress, ONBOARDING_STEPS, type OnboardingStepKey } from "@/components/onboarding/OnboardingProgress";
import { StepBusiness } from "@/components/onboarding/StepBusiness";
import { StepReceptionist } from "@/components/onboarding/StepReceptionist";
import { StepTest } from "@/components/onboarding/StepTest";
import { StepPhone } from "@/components/onboarding/StepPhone";
import { StepLive } from "@/components/onboarding/StepLive";

const stepKeys = ["business", "receptionist", "test", "phone", "live"] as const;

export const Route = createFileRoute("/onboarding")({
  validateSearch: z.object({ step: z.enum(stepKeys).optional().catch(undefined) }),
  component: OnboardingPage,
});

interface WizardState {
  profile: BusinessProfile | null;
  receptionistId: string | null;
}

function OnboardingPage() {
  const { step: stepParam } = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useSession();

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth", search: { redirect: "/onboarding" } as never });
    }
  }, [loading, session, navigate]);

  const workspace = useQuery({
    queryKey: ["onboarding-workspace"],
    queryFn: () => callAuthed(getWorkspaceFn),
    enabled: !!session,
  });

  const [state, setState] = useState<WizardState>({ profile: null, receptionistId: null });
  const [step, setStep] = useState<OnboardingStepKey | null>(stepParam ?? null);

  // Resume logic: pick furthest sensible step once workspace loads, unless the URL already specifies one.
  useEffect(() => {
    if (stepParam || !workspace.data || step) return;
    const org = workspace.data.organization;
    const receptionist = workspace.data.receptionists[0];
    let resolved: OnboardingStepKey = "business";
    if (workspace.data.business) resolved = "receptionist";
    if (receptionist) resolved = "test";
    const savedStep = org.onboarding_step as OnboardingStepKey | undefined;
    if (savedStep && stepKeys.includes(savedStep)) resolved = savedStep;
    setStep(resolved);
    if (receptionist) setState((s) => ({ ...s, receptionistId: receptionist.id }));
  }, [workspace.data, stepParam, step]);

  useEffect(() => {
    if (stepParam && stepParam !== step) setStep(stepParam);
  }, [stepParam]);

  function goTo(next: OnboardingStepKey) {
    setStep(next);
    navigate({ to: "/onboarding", search: { step: next }, replace: true });
    callAuthed(setOnboardingStepFn, { data: { step: next } }).catch(() => {});
  }

  const businessName = state.profile?.business_name || workspace.data?.business?.business_name || "Your business";

  const content = useMemo(() => {
    if (!step) return null;
    switch (step) {
      case "business":
        return (
          <StepBusiness
            onSaved={(profile) => {
              setState((s) => ({ ...s, profile }));
              goTo("receptionist");
            }}
          />
        );
      case "receptionist":
        return (
          <StepReceptionist
            businessName={businessName}
            industry={state.profile?.industry ?? workspace.data?.business?.industry ?? null}
            existingReceptionistId={state.receptionistId}
            onCreated={(id) => {
              setState((s) => ({ ...s, receptionistId: id }));
              goTo("test");
            }}
          />
        );
      case "test":
        return (
          <StepTest
            receptionistId={state.receptionistId}
            services={state.profile?.services ?? []}
            onContinue={() => goTo("phone")}
            onBack={() => goTo("receptionist")}
          />
        );
      case "phone":
        return <StepPhone onContinue={() => goTo("live")} />;
      case "live":
        return (
          <StepLive
            businessName={businessName}
            receptionistId={state.receptionistId}
          />
        );
    }
  }, [step, state, businessName, workspace.data]);

  if (loading || !session || workspace.isLoading || !step) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md space-y-3">
          <div className="skeleton-shimmer h-4 w-1/3 rounded-full" />
          <div className="skeleton-shimmer h-32 w-full rounded-2xl" />
          <div className="skeleton-shimmer h-4 w-1/2 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-6">
            <Logo compact />
            <OnboardingProgress current={step} />
          </div>
          <Link to="/app" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
            Save and exit to dashboard
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
        <div key={step} className="animate-fade-up">
          {content}
        </div>
      </main>
    </div>
  );
}
