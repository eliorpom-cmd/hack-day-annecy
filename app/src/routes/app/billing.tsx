import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { PageHeader } from "@/components/app/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { getPlansFn } from "@/lib/public/public.functions";
import { callAuthed } from "@/lib/auth/client";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import {
  createCheckoutSession,
  createPortalSession,
  getSubscriptionFn,
} from "@/lib/billing/payments.functions";
import { PAYMENTS_ENABLED } from "@/lib/billing/config";
import { UsageMeter } from "@/components/app/UsageMeter";

type PriceId =
  | "basic_monthly"
  | "basic_yearly"
  | "pro_monthly"
  | "pro_yearly"
  | "business_monthly"
  | "business_yearly";

export const Route = createFileRoute("/app/billing")({
  validateSearch: z.object({ checkout: z.string().optional().catch(undefined) }),
  component: BillingPage,
});

function money(n: number) {
  return n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
}

function CheckoutForm({ priceId }: { priceId: PriceId }) {
  const fetchClientSecret = async () => {
    const result = await callAuthed(createCheckoutSession, {
      data: {
        priceId,
        environment: getStripeEnvironment(),
        returnUrl: `${window.location.origin}/app/billing?checkout=success`,
      },
    });
    if ("error" in result) throw new Error(result.error);
    return result.clientSecret;
  };
  return (
    <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}

function BillingPage() {
  const { workspace, refetch } = useWorkspace();
  const { checkout } = Route.useSearch();
  const [annual, setAnnual] = useState(true);
  const [priceId, setPriceId] = useState<PriceId | null>(null);
  const plans = useQuery({ queryKey: ["plans"], queryFn: () => getPlansFn() });
  const sub = useQuery({
    queryKey: ["subscription"],
    queryFn: () => callAuthed(getSubscriptionFn, { data: { environment: getStripeEnvironment() } }),
    refetchInterval: checkout === "success" ? 3000 : false,
  });

  useEffect(() => {
    if (checkout !== "success") return undefined;
    toast.success("Payment received — your plan will update in a moment.");
    const t = setTimeout(() => refetch(), 4000);
    return () => clearTimeout(t);
  }, [checkout, refetch]);

  async function openPortal(): Promise<void> {
    const result = await callAuthed(createPortalSession, {
      data: { environment: getStripeEnvironment(), returnUrl: window.location.href },
    });
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    window.open(result.url, "_blank");
  }

  const hasSub = !!sub.data && ["active", "trialing", "past_due"].includes(sub.data.status);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader title="Billing" description="Your plan and usage." />

      {!PAYMENTS_ENABLED && (
        <div className="rounded-lg border border-border bg-surface px-4 py-2 text-center text-sm text-muted-foreground">
          Payments are temporarily unavailable while we make improvements. Your current plan is
          unaffected.
        </div>
      )}

      <div className="card-elevated flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-sm text-muted-foreground">Current plan</p>
          <p className="font-display text-lg font-semibold text-foreground">
            {workspace.plan?.name ?? "Free trial"}
          </p>
          {hasSub && sub.data?.current_period_end && (
            <p className="text-xs text-muted-foreground">
              {sub.data.cancel_at_period_end ? "Ends" : "Renews"}{" "}
              {new Date(sub.data.current_period_end).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasSub ? (
            <Button variant="outline" onClick={openPortal} disabled={!PAYMENTS_ENABLED}>
              Manage subscription
            </Button>
          ) : workspace.trialDaysLeft != null ? (
            <Badge variant="secondary">
              Trial: {workspace.trialDaysLeft} day{workspace.trialDaysLeft === 1 ? "" : "s"} left
            </Badge>
          ) : (
            <Badge variant="secondary">Trial ended</Badge>
          )}
        </div>
      </div>

      {workspace.usage?.paid && workspace.usage.includedMinutes > 0 && (
        <div className="card-elevated flex flex-col gap-3 p-5">
          <div>
            <p className="font-display text-base font-semibold text-foreground">
              This month's usage
            </p>
            <p className="text-xs text-muted-foreground">
              Since {new Date(workspace.usage.periodStart).toLocaleDateString()} · phone calls only
              (browser tests are free). Extra minutes are ${workspace.usage.overageRate.toFixed(2)}{" "}
              each and added to your next bill.
            </p>
          </div>
          <UsageMeter />
        </div>
      )}

      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setAnnual(false)}
            aria-pressed={!annual}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${!annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            aria-pressed={annual}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Annual
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${annual ? "bg-accent text-accent-foreground" : "bg-accent/15 text-accent"}`}
            >
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {plans.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.data?.map((plan) => {
            const monthlyEquivalent = annual ? plan.annual_price / 12 : plan.monthly_price;
            const isCurrent = workspace.plan?.id === plan.id;
            const highlights = (Array.isArray(plan.highlights) ? plan.highlights : []).map((h) =>
              String(h),
            );
            return (
              <div
                key={plan.id}
                className={`card-elevated relative flex flex-col p-6 ${isCurrent ? "ring-2 ring-accent" : ""}`}
              >
                {plan.is_popular && (
                  <Badge className="absolute -top-3 left-6 gap-1 bg-accent text-accent-foreground">
                    <Sparkles className="h-3 w-3" /> Most popular
                  </Badge>
                )}
                {isCurrent && <Badge className="absolute -top-3 right-6">Current plan</Badge>}
                <h2 className="font-display text-lg font-semibold text-foreground">{plan.name}</h2>
                {plan.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                )}
                <div className="mt-5">
                  {plan.is_custom ? (
                    <p className="font-display text-3xl font-semibold text-foreground">Custom</p>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2">
                        <p className="font-display text-3xl font-semibold text-foreground">
                          {money(monthlyEquivalent)}
                          <span className="text-sm font-normal text-muted-foreground">/mo</span>
                        </p>
                        {annual && plan.monthly_price > 0 && (
                          <span className="text-base text-muted-foreground line-through">
                            {money(plan.monthly_price)}
                          </span>
                        )}
                      </div>
                      {annual && plan.monthly_price > 0 && (
                        <>
                          <Badge className="mt-2 bg-accent text-accent-foreground">
                            Save{" "}
                            {Math.round((1 - plan.annual_price / 12 / plan.monthly_price) * 100)}% —{" "}
                            {money(plan.monthly_price * 12 - plan.annual_price)}/yr off
                          </Badge>
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            Billed {money(plan.annual_price)}/yr instead of{" "}
                            {money(plan.monthly_price * 12)}
                          </p>
                        </>
                      )}
                    </>
                  )}
                </div>
                <p className="mt-4 text-sm text-foreground/80">
                  {plan.included_minutes.toLocaleString()} minutes included
                </p>
                <ul className="mt-5 flex-1 space-y-2">
                  {highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm text-foreground/85">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                      {h}
                    </li>
                  ))}
                </ul>
                {plan.is_custom ? (
                  <Button variant="outline" className="mt-6" asChild>
                    <a href="mailto:hello@aiphonedesk.com">Contact us</a>
                  </Button>
                ) : (
                  <Button
                    className="mt-6"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || plan.id === "free" || !PAYMENTS_ENABLED}
                    onClick={() => {
                      if (hasSub) void openPortal();
                      else setPriceId(`${plan.id}_${annual ? "yearly" : "monthly"}` as PriceId);
                    }}
                  >
                    {isCurrent
                      ? "Current plan"
                      : plan.id === "free"
                        ? "Included"
                        : hasSub
                          ? "Switch plan"
                          : "Upgrade"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!priceId} onOpenChange={(o) => !o && setPriceId(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete your upgrade</DialogTitle>
          </DialogHeader>
          {priceId && <CheckoutForm priceId={priceId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
