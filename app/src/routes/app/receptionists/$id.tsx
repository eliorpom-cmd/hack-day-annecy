import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VoiceSession } from "@/components/voice/VoiceSession";
import { AccentFlag, VoicePreviewButton } from "@/components/voice/VoicePreviewButton";
import { callAuthed } from "@/lib/auth/client";
import { getVoicesFn } from "@/lib/public/public.functions";
import {
  deleteReceptionistFn,
  getReceptionistFn,
  getTestTokenFn,
  retryReceptionistFn,
  updateReceptionistFn,
} from "@/lib/receptionist/receptionist.functions";

export const Route = createFileRoute("/app/receptionists/$id")({
  component: ReceptionistDetailPage,
  head: () => ({
    meta: [
      { title: "Receptionist settings · AI Phone Desk" },
      {
        name: "description",
        content:
          "Edit your receptionist's voice, greeting and instructions, then test it in your browser.",
      },
      { property: "og:title", content: "Receptionist settings · AI Phone Desk" },
      {
        property: "og:description",
        content:
          "Edit your receptionist's voice, greeting and instructions, then test it in your browser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ReceptionistDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const detail = useQuery({
    queryKey: ["receptionist", id],
    queryFn: () => callAuthed(getReceptionistFn, { data: { id } }),
  });
  const voices = useQuery({ queryKey: ["voices"], queryFn: () => getVoicesFn() });

  const [draft, setDraft] = useState<{
    name: string;
    greeting: string;
    custom_instructions: string;
    voice_id: string;
  } | null>(null);
  const rec = detail.data;
  const value =
    draft ??
    (rec
      ? {
          name: rec.name,
          greeting: rec.greeting ?? "",
          custom_instructions: rec.custom_instructions ?? "",
          voice_id: rec.voice?.id ?? "",
        }
      : null);

  const save = useMutation({
    mutationFn: () =>
      callAuthed(updateReceptionistFn, {
        data: {
          id,
          patch: {
            name: value!.name,
            greeting: value!.greeting,
            custom_instructions: value!.custom_instructions,
            voice_id: value!.voice_id,
          },
        },
      }),
    onSuccess: () => {
      toast.success("Saved — your receptionist has been updated.");
      setDraft(null);
      queryClient.invalidateQueries({ queryKey: ["receptionist", id] });
      queryClient.invalidateQueries({ queryKey: ["receptionists"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const retry = useMutation({
    mutationFn: () => callAuthed(retryReceptionistFn, { data: { id } }),
    onSuccess: () => {
      toast.success("Retrying…");
      queryClient.invalidateQueries({ queryKey: ["receptionist", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => callAuthed(deleteReceptionistFn, { data: { id } }),
    onSuccess: () => {
      toast.success("Receptionist deleted");
      queryClient.invalidateQueries({ queryKey: ["receptionists"] });
      navigate({ to: "/app/receptionists" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (detail.isLoading || !value || !rec) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Link
        to="/app/receptionists"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All receptionists
      </Link>

      <PageHeader
        title={rec.name}
        description={rec.status_message ?? "Changes here apply to browser tests and phone calls."}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={rec.status} />
            {rec.status === "error" && (
              <Button variant="outline" onClick={() => retry.mutate()} disabled={retry.isPending}>
                <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
              aria-label="Delete receptionist"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card-elevated space-y-4 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="r-name">Name</Label>
            <Input
              id="r-name"
              value={value.name}
              onChange={(e) => setDraft({ ...value, name: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="r-voice">Voice</Label>
            <div className="flex items-center gap-2">
              <Select
                value={value.voice_id}
                onValueChange={(v) => setDraft({ ...value, voice_id: v })}
              >
                <SelectTrigger id="r-voice" className="flex-1">
                  <SelectValue placeholder="Choose a voice" />
                </SelectTrigger>
                <SelectContent>
                  {(voices.data ?? []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <span className="flex items-center gap-1.5">
                        {v.name} <AccentFlag accent={v.accent} />
                        {v.description ? ` — ${v.description}` : ""}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <VoicePreviewButton
                previewUrl={(voices.data ?? []).find((v) => v.id === value.voice_id)?.preview_url}
                voiceName={
                  (voices.data ?? []).find((v) => v.id === value.voice_id)?.name ?? "voice"
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Pick a voice, then press play to hear it.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="r-greeting">Greeting</Label>
            <Textarea
              id="r-greeting"
              rows={2}
              value={value.greeting}
              onChange={(e) => setDraft({ ...value, greeting: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="r-instructions">Extra instructions</Label>
            <Textarea
              id="r-instructions"
              rows={5}
              placeholder="Anything else callers should be told — parking, payment, who to transfer to…"
              value={value.custom_instructions}
              onChange={(e) => setDraft({ ...value, custom_instructions: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => save.mutate()} disabled={!draft || save.isPending}>
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
            {draft && (
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            )}
          </div>
        </section>

        <section className="card-elevated p-6">
          <VoiceSession
            title="Test in your browser"
            subtitle="Talk to your receptionist just like a caller would. Free test · 1 minute."
            startLabel="Start test call"
            maxSeconds={60}
            getToken={() => callAuthed(getTestTokenFn, { data: { id } })}
          />
        </section>
      </div>
    </div>
  );
}
