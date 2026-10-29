import { cn } from "@/lib/utils";
import { RECEPTIONIST_STATUS_LABELS } from "@/lib/business/schema";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const label = RECEPTIONIST_STATUS_LABELS[status] ?? status;
  const isLive = status === "live";
  const isError = status === "error" || status === "suspended";
  const isBusy =
    status === "creating_agent" ||
    status === "phone_provisioning" ||
    status === "phone_configuring" ||
    status === "scanning";
  const isReady = status === "agent_ready";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        isLive && "border-transparent bg-accent/15 text-accent",
        isError && "border-transparent bg-destructive/10 text-destructive",
        isReady && "border-transparent bg-secondary text-secondary-foreground",
        isBusy && "border-transparent bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {isLive && <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />}
      {isBusy && <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" />}
      {label}
    </span>
  );
}
