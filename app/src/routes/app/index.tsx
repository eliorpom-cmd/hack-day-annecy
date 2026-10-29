import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, CheckCircle2, Circle, Phone, RotateCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { StatCard } from "@/components/app/StatCard";
import { StatusBadge } from "@/components/app/StatusBadge";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { callAuthed } from "@/lib/auth/client";
import { getTestTokenFn, retryReceptionistFn } from "@/lib/receptionist/receptionist.functions";
import { VoiceSession } from "@/components/voice/VoiceSession";
import { useCallData } from "@/components/app/useCallData";

export const Route = createFileRoute("/app/")({
  component: HomePage,
});

function HomePage() {
  const { workspace, refetch } = useWorkspace();
  const [talkOpen, setTalkOpen] = useState(false);
  const [tested, setTested] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setTested(localStorage.getItem("apd_tested_in_browser") === "1");
  }, []);

  const retry = useMutation({
    mutationFn: (id: string) => callAuthed(retryReceptionistFn, { data: { id } }),
    onSuccess: () => {
      toast.success("Retrying…");
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const firstName =
    (workspace.profile?.name || workspace.profile?.email || "there").split(" ")[0]?.split("@")[0] ??
    "there";
  const receptionist = workspace.receptionists[0];
  const calls = useCallData(30);
  const phoneCalls = (calls.data?.calls ?? []).filter((c) => c.channel === "phone");
  const todayKey = new Date().toDateString();
  const today = phoneCalls.filter((c) => new Date(c.started_at).toDateString() === todayKey);

  const steps = [
    { done: !!workspace.business, label: "Business profile saved", href: "/app/business" },
    { done: !!receptionist, label: "Receptionist created", href: "/app/receptionists" },
    { done: tested, label: "Tested in your browser", href: "/app" },
    {
      done: receptionist?.status === "live",
      label: "Phone number connected",
      href: "/app/phone-numbers",
    },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        title={`Good morning, ${firstName}`}
        description="Here's how your receptionist is doing."
      />

      {receptionist ? (
        <div className="card-elevated p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {receptionist.name}
                </h3>
                <StatusBadge status={receptionist.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Voice: {receptionist.voice_name ?? "Default"}
              </p>
            </div>
            {receptionist.status === "live" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> LIVE
              </span>
            )}
          </div>

          {receptionist.status === "agent_ready" && (
            <div className="mt-4 rounded-lg bg-surface p-4">
              <p className="text-sm text-foreground">
                Ready to test in your browser. Add a phone number to go live.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setTalkOpen(true)}>
                  <Phone className="mr-1.5 h-3.5 w-3.5" /> Talk to your receptionist
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/app/phone-numbers">Get a phone number</Link>
                </Button>
              </div>
            </div>
          )}

          {receptionist.status === "error" && (
            <div className="mt-4 rounded-lg bg-destructive/10 p-4">
              <p className="text-sm text-destructive">
                {receptionist.status_message || "We hit a problem setting up this receptionist."}
              </p>
              <Button
                size="sm"
                variant="destructive"
                className="mt-3"
                onClick={() => retry.mutate(receptionist.id)}
                disabled={retry.isPending}
              >
                <RotateCw className="mr-1.5 h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={Bot}
          title="Create your first receptionist"
          description="Set up an AI receptionist in a few minutes and start testing it in your browser today."
          action={
            <Button asChild>
              <Link to="/onboarding">Get started</Link>
            </Button>
          }
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          loading={calls.isLoading}
          label="Calls today"
          value={today.length}
          hint={`${phoneCalls.length} in the last 30 days`}
        />
        <StatCard
          loading={calls.isLoading}
          label="Appointments"
          value={calls.data?.appointments.length ?? 0}
          hint="Last 30 days"
        />
        <StatCard
          loading={calls.isLoading}
          label="Minutes used"
          value={Math.ceil(phoneCalls.reduce((s, c) => s + c.duration_secs, 0) / 60)}
          hint="Last 30 days"
        />
        <StatCard
          loading={calls.isLoading}
          label="Handled by AI"
          value={
            phoneCalls.length
              ? `${Math.round((phoneCalls.filter((c) => c.outcome === "success").length / phoneCalls.length) * 100)}%`
              : "—"
          }
          hint="Last 30 days"
        />
      </div>
      {!calls.isLoading && phoneCalls.length === 0 && (
        <p className="-mt-3 text-xs text-muted-foreground">
          Call activity appears here automatically within a minute of each call.
        </p>
      )}

      <div className="card-elevated p-5">
        <h3 className="font-display text-base font-semibold text-foreground">Next steps</h3>
        <ul className="mt-3 space-y-2.5">
          {steps.map((step) => (
            <li key={step.label} className="flex items-center gap-2.5 text-sm">
              {step.done ? (
                <CheckCircle2 className="h-4 w-4 text-accent" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <Link
                to={step.href}
                className={
                  step.done ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }
              >
                {step.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <Dialog open={talkOpen} onOpenChange={setTalkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" /> Talk to {receptionist?.name}
            </DialogTitle>
          </DialogHeader>
          {receptionist && (
            <VoiceSession
              getToken={() => callAuthed(getTestTokenFn, { data: { id: receptionist.id } })}
              onStarted={() => {
                localStorage.setItem("apd_tested_in_browser", "1");
                setTested(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
