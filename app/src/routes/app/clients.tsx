import { createFileRoute } from "@tanstack/react-router";
import { Contact } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { FeatureGate } from "@/components/app/FeatureGate";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtPhone, useCallData } from "@/components/app/useCallData";

export const Route = createFileRoute("/app/clients")({
  head: () => ({ meta: [{ title: "Clients — AI Phone Desk" }] }),
  component: ClientsPage,
});

function ClientsPage() {
  const q = useCallData(90);
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader title="Clients" description="Everyone who has called your business." />
      <FeatureGate
        feature="your client list"
        benefits={[
          "Every caller saved automatically",
          "Contact details and call history",
          "See who called back and why",
        ]}
      >
        {() =>
          q.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !q.data?.clients.length ? (
            <EmptyState
              icon={Contact}
              title="Waiting for your first caller"
              description="Your number is live. As soon as someone calls, their details and call history appear here."
            />
          ) : (
            <div className="card-elevated divide-y divide-border">
              {q.data.clients.map((c) => (
                <div key={c.id} className="flex items-start gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{c.name || fmtPhone(c.phone)}</p>
                    {c.name && <p className="text-xs text-muted-foreground">{fmtPhone(c.phone)}</p>}
                    {c.last_summary && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {c.last_summary}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <p>
                      {c.call_count} call{c.call_count === 1 ? "" : "s"}
                    </p>
                    <p>
                      Last:{" "}
                      {new Date(c.last_call_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <a href={`tel:${c.phone}`} className="text-accent hover:underline">
                      Call back
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </FeatureGate>
    </div>
  );
}
