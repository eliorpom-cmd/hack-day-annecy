import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { callAuthed } from "@/lib/auth/client";
import { completeOnboardingFn } from "@/lib/org/org.functions";
import { getReceptionistFn } from "@/lib/receptionist/receptionist.functions";
import { RECEPTIONIST_STATUS_LABELS } from "@/lib/business/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function StepLive({
  businessName,
  receptionistId,
}: {
  businessName: string;
  receptionistId: string | null;
}) {
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    callAuthed(completeOnboardingFn)
      .catch(() => {})
      .finally(() => setCompleted(true));
  }, []);

  const receptionist = useQuery({
    queryKey: ["onboarding-receptionist", receptionistId],
    queryFn: () => callAuthed(getReceptionistFn, { data: { id: receptionistId as string } }),
    enabled: !!receptionistId,
  });

  const rec = receptionist.data;
  const status = rec?.status ?? "agent_ready";
  const statusLabel = RECEPTIONIST_STATUS_LABELS[status] ?? status;

  return (
    <div className="text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-accent" />
      <h1 className="mt-4 font-display text-2xl font-semibold text-foreground">You're all set</h1>
      <p className="mt-1 text-sm text-muted-foreground">Here's a summary of your receptionist.</p>

      <div className="card-elevated mx-auto mt-8 max-w-md space-y-4 p-8 text-left">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Business</span>
          <span className="font-medium text-foreground">{businessName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Receptionist</span>
          <span className="font-medium text-foreground">{rec?.name ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Voice</span>
          <span className="font-medium text-foreground">{rec?.voice?.name ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge variant={status === "live" ? "default" : "secondary"}>{statusLabel}</Badge>
        </div>
        {status !== "live" && (
          <p className="border-t border-border pt-4 text-sm text-muted-foreground">
            Ready to test in your browser. Add a phone number to go live.
          </p>
        )}
      </div>

      <Button asChild size="lg" className="mt-8" disabled={!completed}>
        <a href="/app">Go to dashboard</a>
      </Button>
    </div>
  );
}
