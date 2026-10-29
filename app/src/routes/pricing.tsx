import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getPlansFn } from "@/lib/public/public.functions";

export const Route = createFileRoute("/pricing")({
  loader: async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return { plans: await getPlansFn() };
      } catch {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }
    return { plans: [] as Awaited<ReturnType<typeof getPlansFn>> };
  },
  head: () => ({
    meta: [
      { title: "Pricing — AI Phone Desk" },
      {
        name: "description",
        content: "Simple, transparent pricing for AI receptionists. Pick a plan and go live in minutes.",
      },
    ],
  }),
  component: PricingPage,
});

const COMPARISON_FAQ = [
  {
    q: "What happens if I go over my included minutes?",
    a: "You're charged the plan's per-minute overage rate for extra minutes. We'll always show usage in your dashboard so there are no surprises.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes. You can upgrade or downgrade at any time from your dashboard; changes apply to your next billing cycle.",
  },
  {
    q: "Do I need a paid plan to get a phone number?",
    a: "Yes — a phone number is included on paid plans. You can try the voice experience in your browser before choosing a plan.",
  },
];

function money(n: number) {
  return n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
}

function PricingPage() {
  const { plans } = Route.useLoaderData();
  const [annual, setAnnual] = useState(true);
  const maxSavingsPct = useMemo(
    () =>
      Math.max(
        0,
        ...plans
          .filter((p) => !p.is_custom && p.monthly_price > 0 && p.annual_price > 0)
          .map((p) => Math.round((1 - p.annual_price / 12 / p.monthly_price) * 100)),
      ),
    [plans],
  );


  return (
    <MarketingLayout>
      <section className="surface-gradient border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <p className="eyebrow">Pricing</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Plans and pricing for every business
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Choose the plan that fits your call volume. Change or cancel anytime.
          </p>


          <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              aria-pressed={!annual}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${!annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              aria-pressed={annual}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Annual
              <span className={`rounded-full px-2 py-0.5 text-xs ${annual ? "bg-accent text-accent-foreground" : "bg-accent/15 text-accent"}`}>
                Save {maxSavingsPct}%
              </span>
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const monthlyEquivalent = annual ? plan.annual_price / 12 : plan.monthly_price;
            const savingsPct =
              plan.monthly_price > 0
                ? Math.round((1 - plan.annual_price / 12 / plan.monthly_price) * 100)
                : 0;
            const highlights = (Array.isArray(plan.highlights) ? plan.highlights : []).map((h) =>
              String(h),
            );

            return (
              <div
                key={plan.id}
                className={`card-elevated relative flex flex-col p-6 ${plan.is_popular ? "ring-2 ring-accent" : ""}`}
              >
                {plan.is_popular && (
                  <Badge className="absolute -top-3 left-6 gap-1 bg-accent text-accent-foreground">
                    <Sparkles className="h-3 w-3" /> Most popular
                  </Badge>
                )}
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
                        {annual && savingsPct > 0 && (
                          <span className="text-base text-muted-foreground line-through">
                            {money(plan.monthly_price)}
                          </span>
                        )}
                      </div>
                      {annual && savingsPct > 0 && (
                        <>
                          <Badge className="mt-2 bg-accent text-accent-foreground">
                            Save {savingsPct}% — {money(plan.monthly_price * 12 - plan.annual_price)}/yr off
                          </Badge>
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            Billed {money(plan.annual_price)}/yr instead of {money(plan.monthly_price * 12)}
                          </p>
                        </>
                      )}
                      {!annual && plan.monthly_price > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Switch to annual and save {Math.round((1 - plan.annual_price / 12 / plan.monthly_price) * 100)}%
                        </p>
                      )}
                    </>
                  )}
                </div>

                <p className="mt-4 text-sm text-foreground/80">
                  {plan.included_minutes.toLocaleString()} minutes included
                </p>
                {!plan.is_custom && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {money(plan.overage_price_per_minute)}/min after that
                  </p>
                )}

                <ul className="mt-5 flex-1 space-y-2">
                  {highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm text-foreground/85">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                      {h}
                    </li>
                  ))}
                </ul>

                <Button asChild className="mt-6" variant={plan.is_popular ? "default" : "outline"}>
                  {plan.is_custom ? (
                    <a href="mailto:hello@aiphonedesk.com">Contact us</a>
                  ) : (
                    <a href="/auth?mode=signup">Start free</a>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      <RevenueCalculator />

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="text-center font-display text-2xl font-semibold text-foreground">
          Plan questions
        </h2>
        <Accordion type="single" collapsible className="mt-6">
          {COMPARISON_FAQ.map((item) => (
            <AccordionItem key={item.q} value={item.q}>
              <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="border-t border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Ready to stop missing calls?
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="secondary" className="shadow-glow">
              <a href="/auth?mode=signup">Create your receptionist</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/">Talk to the demo</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

function RevenueCalculator() {
  const [missedCalls, setMissedCalls] = useState(10);
  const [jobValue, setJobValue] = useState(300);
  const [closeRate, setCloseRate] = useState(30);

  const monthlyEstimate = useMemo(() => {
    const weeklyRecovered = missedCalls * (closeRate / 100) * jobValue;
    return Math.round(weeklyRecovered * (52 / 12));
  }, [missedCalls, jobValue, closeRate]);

  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="text-center font-display text-2xl font-semibold text-foreground">
          Recovered revenue calculator
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Estimate only. Based on the numbers you enter.
        </p>

        <div className="card-elevated mt-8 grid gap-8 p-6 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-foreground" htmlFor="missed-calls">
              Missed calls per week: {missedCalls}
            </label>
            <Slider
              id="missed-calls"
              className="mt-4"
              min={0}
              max={50}
              step={1}
              value={[missedCalls]}
              onValueChange={([v]) => setMissedCalls(v ?? 0)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground" htmlFor="job-value">
              Average job value: {money(jobValue)}
            </label>
            <Slider
              id="job-value"
              className="mt-4"
              min={50}
              max={5000}
              step={50}
              value={[jobValue]}
              onValueChange={([v]) => setJobValue(v ?? 0)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground" htmlFor="close-rate">
              Close rate: {closeRate}%
            </label>
            <Slider
              id="close-rate"
              className="mt-4"
              min={5}
              max={80}
              step={5}
              value={[closeRate]}
              onValueChange={([v]) => setCloseRate(v ?? 0)}
            />
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">Estimated monthly revenue recovered</p>
          <p className="mt-1 font-display text-4xl font-semibold text-foreground">
            {money(monthlyEstimate)}
          </p>
        </div>
      </div>
    </section>
  );
}
