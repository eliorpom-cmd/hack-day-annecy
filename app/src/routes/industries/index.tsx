import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { INDUSTRIES_CONTENT, INDUSTRY_SLUGS } from "@/lib/marketing/industries";

export const Route = createFileRoute("/industries/")({
  head: () => ({
    meta: [
      { title: "Industries — AI Phone Desk" },
      {
        name: "description",
        content:
          "See how AI Phone Desk works for home services, dental, salons, clinics, law offices, real estate, auto shops, and restaurants.",
      },
    ],
  }),
  component: IndustriesIndex,
});

function IndustriesIndex() {
  return (
    <MarketingLayout>
      <section className="surface-gradient border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <p className="eyebrow">Industries</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Built for businesses that live on the phone
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Every business answers calls differently. Pick your industry to see how AI Phone Desk
            handles yours.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRY_SLUGS.map((slug) => {
            const industry = INDUSTRIES_CONTENT[slug];
            if (!industry) return null;
            return (
              <Link
                key={slug}
                to="/industries/$slug"
                params={{ slug }}
                className="card-elevated group flex flex-col justify-between p-6 transition-shadow hover:shadow-modal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    {industry.name}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">{industry.headline}</p>
                </div>
                <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                  Learn more
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </MarketingLayout>
  );
}
