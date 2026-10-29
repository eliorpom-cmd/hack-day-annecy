import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CheckCircle2, MessageCircleQuestion } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { INDUSTRIES_CONTENT } from "@/lib/marketing/industries";

export const Route = createFileRoute("/industries/$slug")({
  loader: ({ params }) => {
    const industry = INDUSTRIES_CONTENT[params.slug];
    if (!industry) throw notFound();
    return { industry };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.industry.name} — AI Phone Desk` },
          { name: "description", content: loaderData.industry.intro },
        ]
      : [],
  }),
  component: IndustryPage,
});

function IndustryPage() {
  const { industry } = Route.useLoaderData();

  return (
    <MarketingLayout>
      <section className="surface-gradient border-b border-border">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <p className="eyebrow">{industry.name}</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {industry.headline}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">{industry.intro}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="shadow-glow">
              <a href="/auth?mode=signup">Create your receptionist</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/">Talk to the demo</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          What's costing you calls
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {industry.painPoints.map((point) => (
            <li key={point} className="card-elevated p-5 text-sm text-foreground/85">
              {point}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            What your receptionist handles
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {industry.useCases.map((useCase) => (
              <li key={useCase} className="flex items-start gap-3 text-sm text-foreground/85">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                {useCase}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Sample call questions
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Real questions your AI receptionist is ready to answer for {industry.name.toLowerCase()}.
        </p>
        <ul className="mt-6 space-y-3">
          {industry.sampleQuestions.map((q) => (
            <li
              key={q}
              className="card-elevated flex items-start gap-3 p-4 text-sm text-foreground/85"
            >
              <MessageCircleQuestion className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />"
              {q}"
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Give {industry.name.toLowerCase()} callers a faster answer
          </h2>
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
