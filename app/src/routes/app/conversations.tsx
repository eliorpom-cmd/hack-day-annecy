import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessagesSquare, Monitor, Phone } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { FeatureGate, formatUs } from "@/components/app/FeatureGate";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { callAuthed } from "@/lib/auth/client";
import { getCallAudioFn, getCallDetailFn } from "@/lib/calls/calls.functions";
import { fmtDuration, fmtPhone, outcomeLabel, useCallData } from "@/components/app/useCallData";

export const Route = createFileRoute("/app/conversations")({
  head: () => ({ meta: [{ title: "Conversations — AI Phone Desk" }] }),
  component: ConversationsPage,
});

function ConversationsPage() {
  const q = useCallData(90);
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader title="Conversations" description="Transcripts and recordings of every call." />
      <FeatureGate
        feature="conversations"
        benefits={["Full transcript of every call", "Call recordings you can replay", "A short summary of what the caller needed"]}
      >
        {(live) =>
          q.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : !q.data?.calls.length ? (
            <EmptyState
              icon={MessagesSquare}
              title="No calls yet"
              description={`Your number ${formatUs(live.phone_number)} is live. Call it, and the transcript, recording and summary land here within a minute.`}
              action={<Button asChild variant="outline"><a href={`tel:${live.phone_number}`}>Call your number</a></Button>}
            />
          ) : (
            <div className="card-elevated divide-y divide-border">
              {q.data.syncError && <p className="p-3 text-xs text-muted-foreground">{q.data.syncError}</p>}
              {q.data.calls.map((c) => (
                <button key={c.id} onClick={() => setOpenId(c.id)} className="flex w-full items-start gap-3 p-4 text-left hover:bg-surface">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15">
                    {c.channel === "phone" ? <Phone className="h-4 w-4 text-accent" /> : <Monitor className="h-4 w-4 text-accent" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{c.channel === "phone" ? fmtPhone(c.caller_phone) : "Browser test"}</span>
                      {c.outcome && <Badge variant="secondary">{outcomeLabel[c.outcome] ?? c.outcome}</Badge>}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{c.title || c.summary || (c.status === "done" ? "No summary" : "Processing…")}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <p>{new Date(c.started_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                    <p>{fmtDuration(c.duration_secs)}</p>
                  </div>
                </button>
              ))}
            </div>
          )
        }
      </FeatureGate>
      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">{openId && <CallDetail id={openId} />}</SheetContent>
      </Sheet>
    </div>
  );
}

function CallDetail({ id }: { id: string }) {
  const d = useQuery({ queryKey: ["call", id], queryFn: () => callAuthed(getCallDetailFn, { data: { id } }) });
  const [audio, setAudio] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  if (d.isLoading || !d.data) return <div className="space-y-3 pt-8"><Skeleton className="h-6 w-40" /><Skeleton className="h-24 w-full" /></div>;
  const c = d.data;
  return (
    <>
      <SheetHeader>
        <SheetTitle>{c.channel === "phone" ? fmtPhone(c.caller_phone) : "Browser test"}</SheetTitle>
        <p className="text-sm text-muted-foreground">
          {new Date(c.started_at).toLocaleString()} · {fmtDuration(c.duration_secs)}
        </p>
      </SheetHeader>
      <div className="mt-5 space-y-5">
        {c.summary && (
          <div className="rounded-lg bg-surface p-4">
            <p className="eyebrow">Summary</p>
            <p className="mt-1 text-sm text-foreground">{c.summary}</p>
          </div>
        )}
        {c.has_audio && (
          audio ? (
            <audio controls src={audio} className="w-full" autoPlay />
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={loadingAudio}
              onClick={async () => {
                setLoadingAudio(true);
                try {
                  const r = await callAuthed(getCallAudioFn, { data: { id } });
                  setAudio(r.url);
                } finally {
                  setLoadingAudio(false);
                }
              }}
            >
              {loadingAudio ? "Loading recording…" : "Play recording"}
            </Button>
          )
        )}
        <div>
          <p className="eyebrow mb-2">Transcript</p>
          <div className="space-y-2">
            {c.transcript.length === 0 && <p className="text-sm text-muted-foreground">No transcript available.</p>}
            {c.transcript.map((t, i) => (
              <div key={i} className={t.role === "agent" ? "mr-8 rounded-lg bg-surface p-3" : "ml-8 rounded-lg bg-accent/10 p-3"}>
                <p className="text-xs font-semibold text-muted-foreground">{t.role === "agent" ? "Receptionist" : "Caller"}</p>
                <p className="text-sm text-foreground">{t.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
