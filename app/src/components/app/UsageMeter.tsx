import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { cn } from "@/lib/utils";

export function UsageMeter({ compact = false }: { compact?: boolean }) {
  const { workspace } = useWorkspace();
  const u = workspace.usage;
  if (!u || !u.paid || u.includedMinutes <= 0) return null;
  const pct = Math.min(100, u.percent);
  const bar =
    u.level === "ok" ? "bg-primary" : u.level === "warning" ? "bg-accent" : "bg-destructive";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">Call minutes</span>
        <span className="font-medium text-foreground">
          {u.minutesUsed} / {u.includedMinutes}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Call minutes used"
      >
        <div
          className={cn("h-full rounded-full transition-all", bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!compact && u.overageMinutes > 0 && (
        <p className="text-xs text-muted-foreground">
          {u.overageMinutes} extra min · ${u.overageCost.toFixed(2)} on next bill
        </p>
      )}
    </div>
  );
}

export function UsageBanner() {
  const { workspace } = useWorkspace();
  const u = workspace.usage;
  if (!u || !u.paid || u.includedMinutes <= 0 || u.level === "ok") return null;
  const msg =
    u.level === "warning"
      ? `You've used ${u.percent}% of your ${u.includedMinutes} included minutes this month.`
      : u.level === "over"
        ? `You're past your included minutes. Extra minutes are $${u.overageRate.toFixed(2)} each ($${u.overageCost.toFixed(2)} so far).`
        : `Your receptionist has paused answering calls — you've reached ${u.safetyCapMinutes} minutes this month.`;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-sm",
        u.level === "warning"
          ? "bg-accent/10 text-foreground"
          : "bg-destructive/10 text-foreground",
      )}
    >
      <span className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" /> {msg}
      </span>
      <Link to="/app/billing" className="font-medium underline underline-offset-4">
        Upgrade plan
      </Link>
    </div>
  );
}
