import { createFileRoute, Link } from "@tanstack/react-router";
import {
  PhoneCall,
  CalendarCheck,
  Route as RouteIcon,
  FileText,
  BrainCircuit,
  Smartphone,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — AI Phone Desk" },
      {
        name: "description",
        content:
          "Answer every call, book appointments, and keep your business informed with an AI receptionist built from your website.",
      },
    ],
  }),
  component: FeaturesPage,
});

const SECTIONS = [
  {
    icon: PhoneCall,
    heading: "Answers every call, day or night",
    body: "Your receptionist picks up in one ring, whether it's a customer on their lunch break or a Saturday-night emergency. No hold music, no voicemail, no missed opportunity.",
    bullets: [
      "24/7 coverage, including holidays",
      "Handles multiple calls at once",
      "Sounds natural, not robotic",
    ],
  },
  {
    icon: CalendarCheck,
    heading: "Books appointments straight into your calendar",
    body: "Callers ask for a time, your receptionist checks availability and creates a request on your calendar. You stay in control — every booking is confirmed the way you already run your business.",
    bullets: [
      "Collects name, contact, and reason for the visit",
      "Works with the calendar you already use",
      "Sends confirmations automatically",
    ],
  },
  {
    icon: RouteIcon,
    heading: "Transfers to the right person",
    body: "Not every call should end with the AI. Urgent issues, VIP clients, or anything outside its scope get routed to a real person on your team, with context passed along so nothing repeats.",
    bullets: [
      "Custom transfer rules per call type",
      "Warm handoff with call context",
      "Fallback to voicemail if no one answers",
    ],
  },
  {
    icon: FileText,
    heading: "Call summaries and transcripts",
    body: "Every call is logged with a clean summary and full transcript, so you always know who called, why, and what was said — without listening to a single recording.",
    bullets: [
      "Searchable call history",
      "Delivered to your inbox or dashboard",
      "Exportable for your records",
    ],
  },
  {
    icon: BrainCircuit,
    heading: "Knows your business, from your website",
    body: "We scan your website to build a profile of your services, hours, and policies. Your receptionist only speaks from that profile — accurate, on-brand, and easy to keep up to date.",
    bullets: [
      "Set up in minutes, no scripting required",
      "Update anytime from your dashboard",
      "Answers stay grounded in your real information",
    ],
  },
  {
    icon: Smartphone,
    heading: "One number for the phone and the browser",
    body: "Get a dedicated business phone number, or let visitors talk to your receptionist right from your website. Either way, it's the same AI, the same knowledge, the same consistent answers.",
    bullets: [
      "Port or forward an existing number",
      "Embed a voice widget on your site",
      "Consistent experience across both",
    ],
  },
];

function FeaturesPage() {
  return (
    <MarketingLayout>
      <section className="surface-gradient border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <p className="eyebrow">Features</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Everything a great receptionist does. None of the missed calls.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            AI Phone Desk answers, books, and reports back — built from what's already on your
            website.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="space-y-16">
          {SECTIONS.map((section, i) => {
            const Icon = section.icon;
            return (
              <div
                key={section.heading}
                className={cn(
                  "grid items-center gap-8 md:grid-cols-2",
                  i % 2 === 1 && "md:[&>*:first-child]:order-2",
                )}
              >
                <div className="flex aspect-video items-center justify-center rounded-2xl border border-border bg-surface">
                  <Icon className="h-16 w-16 text-accent" aria-hidden />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-semibold text-foreground">
                    {section.heading}
                  </h2>
                  <p className="mt-3 text-muted-foreground">{section.body}</p>
                  <ul className="mt-4 space-y-2">
                    {section.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-sm text-foreground/80">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-t border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            See it work on your own business
          </h2>
          <p className="mt-3 text-primary-foreground/80">
            Set up takes minutes. Talk to your receptionist before you go live.
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
              <Link to="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
