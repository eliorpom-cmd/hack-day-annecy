import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { callAuthed } from "@/lib/auth/client";
import { getPhoneOverviewFn } from "@/lib/telephony/phone.functions";
import { useWorkspace } from "@/components/app/WorkspaceProvider";

export type LiveNumber = { id: string; phone_number: string };

/**
 * Paywall for sections that need a paid plan and a live phone number.
 * Free plan → upgrade (pricing). Paid without number → get a number. Live → children.
 */
export function FeatureGate({
  feature,
  benefits,
  children,
}: {
  feature: string;
  benefits: string[];
  children: (live: LiveNumber) => ReactNode;
}) {
  const { workspace } = useWorkspace();
  const overview = useQuery({
    queryKey: ["phone-overview"],
    queryFn: () => callAuthed(getPhoneOverviewFn),
  });
  const plan = (workspace as { plan?: { included_numbers?: number; name?: string } | null }).plan;
  const isPaid = (plan?.included_numbers ?? 0) > 0;

  if (overview.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const live = (overview.data?.numbers ?? []).find((n) => n.status === "live");
  if (isPaid && live) return <>{children(live)}</>;

  return (
    <div className="card-elevated flex flex-col items-center gap-4 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
        {isPaid ? (
          <Phone className="h-5 w-5 text-accent" />
        ) : (
          <Lock className="h-5 w-5 text-accent" />
        )}
      </div>
      <p className="eyebrow">{isPaid ? "One step left" : "Available on paid plans"}</p>
      <h3 className="font-display text-xl font-semibold text-foreground">
        {isPaid ? `Get your phone number to unlock ${feature}` : `Unlock ${feature}`}
      </h3>
      <ul className="max-w-md space-y-1.5 text-sm text-muted-foreground">
        {benefits.map((b) => (
          <li key={b}>✓ {b}</li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {isPaid ? (
          <Button asChild>
            <Link to="/app/phone-numbers">Get your phone number</Link>
          </Button>
        ) : (
          <>
            <Button asChild>
              <Link to="/app/billing">Upgrade to get a phone number</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/pricing">Compare plans</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function formatUs(e164: string) {
  const d = e164.replace(/^\+1/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : e164;
}
