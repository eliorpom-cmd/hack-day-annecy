import { createFileRoute, Link } from "@tanstack/react-router";
import {
  PhoneCall,
  CalendarCheck,
  Route as RouteIcon,
  FileText,
  BrainCircuit,
  Smartphone,
  Globe,
  ClipboardList,
  Mic,
  PhoneOutgoing,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { VoiceSession } from "@/components/voice/VoiceSession";
import { getDemoTokenFn, getPlansFn } from "@/lib/public/public.functions";
import { INDUSTRY_SLUGS, INDUSTRIES_CONTENT } from "@/lib/marketing/industries";

export const Route = createFileRoute("/")({
  loader: async () => {
    // Retry once on a brief network drop; never blank the home page over pricing.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const plans = await getPlansFn();
        return { plans: plans.slice(0, 4) };
      } catch {
        if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
      }
    }
    return { plans: [] as Awaited<ReturnType<typeof getPlansFn>> };
  },
  head: () => ({
    meta: [
      { title: "AI Phone Desk — Your AI receptionist. Always ready to answer." },
      {
        name: "description",
        content:
          "Answers every call, books appointments, and sends you a summary. Set up your AI receptionist from your website in minutes.",
      },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { icon: PhoneCall, title: "Answers 24/7", body: "Every call gets picked up, day or night." },
  {
    icon: CalendarCheck,
    title: "Books appointments",
    body: "Requests go straight into your calendar.",
  },
  {
    icon: RouteIcon,
    title: "Transfers to the right person",
    body: "Urgent calls reach a real person, with context.",
  },
  {
    icon: FileText,
    title: "Call summaries and transcripts",
    body: "Know who called and why, without listening back.",
  },
  {
    icon: BrainCircuit,
    title: "Knows your business",
    body: "Trained from your website — accurate, on-brand answers.",
  },
  {
    icon: Smartphone,
    title: "One number, phone and browser",
    body: "A dedicated number and a website widget, same AI.",
  },
];

const HOW_IT_WORKS = [
  {
    icon: Globe,
    title: "Scan your website",
    body: "We read your site to learn your services, hours, and policies.",
  },
  {
    icon: ClipboardList,
    title: "Review what we found",
    body: "Check and edit the business profile before it goes live.",
  },
  {
    icon: Mic,
    title: "Pick a voice and test it",
    body: "Choose a voice and talk to your receptionist in your browser.",
  },
  {
    icon: PhoneOutgoing,
    title: "Get a number and go live",
    body: "Connect a phone number and start taking real calls.",
  },
];

const FAQS = [
  {
    q: "Do I need technical knowledge?",
    a: "No. We build your receptionist's knowledge from your website automatically, and you can review and edit everything in plain language from your dashboard.",
  },
  {
    q: "What happens when someone calls?",
    a: "Your AI receptionist answers immediately, has a natural conversation, and — depending on your setup — books an appointment request, answers questions, or transfers the call to your team.",
  },
  {
    q: "Can it book appointments?",
    a: "Yes. It collects the details and creates a request on your connected calendar. You choose whether requests need your confirmation or book automatically.",
  },
  {
    q: "Will it make things up?",
    a: "No. It only uses information from your business profile — the details you've reviewed and approved. If it doesn't know something, it says so instead of guessing.",
  },
  {
    q: "Can I keep my existing number?",
    a: "Yes, in most cases you can forward or port your existing business number to your receptionist. New numbers are also available on paid plans.",
  },
  {
    q: "What does it cost after the trial?",
    a: "You move to one of our paid plans, billed monthly or annually, based on the call minutes and features your business needs. See our pricing page for current plans.",
  },
];

function Index() {
  const { plans } = Route.useLoaderData();

  return (
    <MarketingLayout>
      <HeroSection />
      <TrustStrip />
      <HowItWorks />
      <FeaturesGrid />
      <IndustriesSection />
      <PricingTeaser plans={plans} />
      <FaqSection />
      <FinalCta />
    </MarketingLayout>
  );
}

function HeroSection() {
  return (
    <section className="surface-gradient border-b border-border">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-28">
        <div className="animate-fade-up">
          <p className="eyebrow">AI Receptionist</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[3.4rem]">
            Your AI receptionist. Always ready to answer.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            Answers every call, books appointments, and sends you a summary. Set up from your
            website in minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="shadow-glow">
              <a href="/auth?mode=signup">Create your receptionist</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#demo">Talk to the AI</a>
            </Button>
          </div>
        </div>

        <div id="demo" className="scroll-mt-24">
          <div className="card-elevated p-6 sm:p-8">
            <VoiceSession
              getToken={() => getDemoTokenFn()}
              title="Talk to a live receptionist"
              subtitle="Ava from Harbor Dental Studio, a demo business"
              startLabel="Talk to the AI"
              maxSeconds={60}
              suggestions={[
                "Do you take new patients?",
                "How much is a cleaning?",
                "Can I book for Friday morning?",
              ]}
            />
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Free demo · 1 minute · No signup
          </p>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <div className="border-b border-border bg-surface py-4">
      <p className="mx-auto max-w-3xl px-4 text-center text-sm text-muted-foreground sm:px-6">
        Built for home services, dental, salons, clinics, law offices, and more.
      </p>
    </div>
  );
}

function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
          Live in minutes, not weeks
        </h2>
      </div>
      <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {HOW_IT_WORKS.map((step, i) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="card-elevated p-6">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <Icon className="h-5 w-5 text-accent" aria-hidden />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function FeaturesGrid() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Features</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
            Everything a great receptionist does
          </h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card-elevated p-6">
                <Icon className="h-6 w-6 text-accent" aria-hidden />
                <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-10 text-center">
          <Button asChild variant="outline">
            <Link to="/features">See all features</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function IndustriesSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Industries</p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
          Built for how your business answers the phone
        </h2>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {INDUSTRY_SLUGS.map((slug) => (
          <Link
            key={slug}
            to="/industries/$slug"
            params={{ slug }}
            className="rounded-xl border border-border bg-card px-4 py-5 text-center text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {INDUSTRIES_CONTENT[slug]?.name}
          </Link>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Button asChild variant="outline">
          <Link to="/industries">See all industries</Link>
        </Button>
      </div>
    </section>
  );
}

interface PlanSummary {
  id: string;
  name: string;
  description: string | null;
  monthly_price: number;
  annual_price: number;
  included_minutes: number;
  is_popular: boolean | null;
  is_custom: boolean | null;
  highlights: unknown;
}

function PricingTeaser({ plans }: { plans: PlanSummary[] }) {
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Pricing</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
            Plans that scale with your call volume
          </h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const highlights = (Array.isArray(plan.highlights) ? plan.highlights : [])
              .slice(0, 3)
              .map((h) => String(h));
            return (
              <div
                key={plan.id}
                className={`card-elevated flex flex-col p-6 ${plan.is_popular ? "ring-2 ring-accent" : ""}`}
              >
                <h3 className="font-display text-base font-semibold text-foreground">
                  {plan.name}
                </h3>
                <p className="mt-3 font-display text-2xl font-semibold text-foreground">
                  {plan.is_custom ? "Custom" : `$${plan.monthly_price}/mo`}
                </p>
                {!plan.is_custom && plan.monthly_price > 0 && plan.annual_price > 0 && (
                  <p className="mt-1 text-xs text-accent">
                    Save {Math.round((1 - plan.annual_price / 12 / plan.monthly_price) * 100)}% paid
                    yearly
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan.included_minutes.toLocaleString()} minutes included
                </p>
                <ul className="mt-4 flex-1 space-y-1.5">
                  {highlights.map((h) => (
                    <li key={h} className="text-xs text-foreground/80">
                      · {h}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="mt-10 text-center">
          <Button asChild variant="outline">
            <Link to="/pricing">See all plans</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <p className="eyebrow">FAQ</p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
          Common questions
        </h2>
      </div>
      <Accordion type="single" collapsible className="mt-10">
        {FAQS.map((item) => (
          <AccordionItem key={item.q} value={item.q}>
            <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Stop missing calls today
        </h2>
        <p className="mt-3 text-primary-foreground/80">
          Set up your AI receptionist in minutes — no phone system to install.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" variant="secondary" className="shadow-glow">
            <a href="/auth?mode=signup">Create your receptionist</a>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
          >
            <a href="#demo">Talk to the AI</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
