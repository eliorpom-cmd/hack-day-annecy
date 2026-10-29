import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { StatCard } from "@/components/app/StatCard";
import { FeatureGate, formatUs } from "@/components/app/FeatureGate";
import { Button } from "@/components/ui/button";
import { fmtDuration, outcomeLabel, useCallData } from "@/components/app/useCallData";

export const Route = createFileRoute("/app/analytics")({
  head: () => ({ meta: [{ title: "Analytics — AI Phone Desk" }] }),
  component: AnalyticsPage,
});

const RANGES = [7, 30, 90] as const;

function AnalyticsPage() {
  const [days, setDays] = useState<number>(30);
  const q = useCallData(days);
  const calls = useMemo(() => (q.data?.calls ?? []).filter((c) => c.channel === "phone"), [q.data]);

  const stats = useMemo(() => {
    const total = calls.length;
    const secs = calls.reduce((s, c) => s + c.duration_secs, 0);
    const handled = calls.filter((c) => c.outcome === "success").length;
    const byDay = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--)
      byDay.set(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10), 0);
    for (const c of calls) {
      const k = c.started_at.slice(0, 10);
      if (byDay.has(k)) byDay.set(k, byDay.get(k)! + 1);
    }
    const outcomes = new Map<string, number>();
    for (const c of calls)
      outcomes.set(c.outcome ?? "unknown", (outcomes.get(c.outcome ?? "unknown") ?? 0) + 1);
    return { total, secs, handled, byDay: [...byDay.entries()], outcomes: [...outcomes.entries()] };
  }, [calls, days]);
  const max = Math.max(1, ...stats.byDay.map(([, v]) => v));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader title="Analytics" description="Call volume, outcomes and trends over time." />
      <FeatureGate
        feature="analytics"
        benefits={[
          "Calls answered, day by day",
          "Average call length and busiest hours",
          "Booking rate and call outcomes",
        ]}
      >
        {(live) => (
          <>
            <div className="flex gap-2">
              {RANGES.map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={days === r ? "default" : "outline"}
                  onClick={() => setDays(r)}
                >
                  Last {r} days
                </Button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard loading={q.isLoading} label={`Calls (${days} days)`} value={stats.total} />
              <StatCard
                loading={q.isLoading}
                label="Handled by AI"
                value={stats.total ? `${Math.round((stats.handled / stats.total) * 100)}%` : "—"}
              />
              <StatCard
                loading={q.isLoading}
                label="Avg. call length"
                value={stats.total ? fmtDuration(Math.round(stats.secs / stats.total)) : "—"}
              />
              <StatCard
                loading={q.isLoading}
                label="Minutes used"
                value={Math.ceil(stats.secs / 60)}
              />
            </div>
            {!q.isLoading && stats.total === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No calls in this period"
                description={`Your number ${formatUs(live.phone_number)} is live. Charts fill in as calls come in.`}
                action={
                  <Button asChild variant="outline">
                    <a href={`tel:${live.phone_number}`}>Call your number</a>
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="card-elevated p-5 lg:col-span-2">
                  <p className="eyebrow">Calls per day</p>
                  <div className="mt-4 flex h-40 items-end gap-[2px]">
                    {stats.byDay.map(([day, v]) => (
                      <div
                        key={day}
                        title={`${day}: ${v}`}
                        className="flex-1 rounded-t bg-accent/80"
                        style={{ height: `${(v / max) * 100}%`, minHeight: v ? 4 : 1 }}
                      />
                    ))}
                  </div>
                </div>
                <div className="card-elevated p-5">
                  <p className="eyebrow">Outcomes</p>
                  <ul className="mt-4 space-y-3">
                    {stats.outcomes.map(([k, v]) => (
                      <li key={k}>
                        <div className="flex justify-between text-sm">
                          <span>{outcomeLabel[k] ?? k}</span>
                          <span className="text-muted-foreground">{v}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded bg-surface">
                          <div
                            className="h-1.5 rounded bg-accent"
                            style={{ width: `${(v / stats.total) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
      </FeatureGate>
    </div>
  );
}
