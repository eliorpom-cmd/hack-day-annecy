import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { callAuthed } from "@/lib/auth/client";
import { listReceptionistsFn, createReceptionistFn } from "@/lib/receptionist/receptionist.functions";
import { getVoicesFn } from "@/lib/public/public.functions";
import { defaultGreeting } from "@/lib/business/schema";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { AccentFlag, VoicePreviewButton, playVoicePreview } from "@/components/voice/VoicePreviewButton";

export const Route = createFileRoute("/app/receptionists/")({
  component: ReceptionistsPage,
});

function ReceptionistsPage() {
  const { workspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const list = useQuery({ queryKey: ["receptionists"], queryFn: () => callAuthed(listReceptionistsFn) });
  const voices = useQuery({ queryKey: ["voices"], queryFn: () => getVoicesFn(), enabled: open });

  const [name, setName] = useState(workspace.business?.business_name ? `${workspace.business.business_name} receptionist` : "My receptionist");
  const [voiceId, setVoiceId] = useState("");
  const [greeting, setGreeting] = useState(defaultGreeting(workspace.business?.business_name ?? "us"));

  const create = useMutation({
    mutationFn: () => callAuthed(createReceptionistFn, { data: { name, voice_id: voiceId, greeting, personality: "professional, warm, concise, helpful", tone: "warm", language: "en" } }),
    onSuccess: () => {
      toast.success("Receptionist created");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["receptionists"] });
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Receptionists"
        description="Each receptionist can answer calls and book appointments for your business."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1.5 h-4 w-4" /> New receptionist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New receptionist</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
                </div>
                <div className="space-y-1.5">
                  <Label>Voice</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={voiceId}
                      onValueChange={(val) => {
                        setVoiceId(val);
                        playVoicePreview(val, voices.data?.find((v) => v.id === val)?.preview_url);
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Choose a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {voices.data?.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            <span className="flex items-center gap-1.5">
                              {v.name} <AccentFlag accent={v.accent} /> {v.gender ? `· ${v.gender}` : ""}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <VoicePreviewButton
                      previewUrl={voices.data?.find((v) => v.id === voiceId)?.preview_url}
                      previewId={voiceId || undefined}
                      voiceName={voices.data?.find((v) => v.id === voiceId)?.name ?? "voice"}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Pick a voice, then press play to hear it.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Greeting</Label>
                  <Textarea value={greeting} onChange={(e) => setGreeting(e.target.value)} maxLength={400} rows={3} />
                </div>
                {create.isError && (
                  <p className="text-sm text-destructive">
                    {create.error.message}{" "}
                    {create.error.message.toLowerCase().includes("upgrade") && (
                      <Link to="/app/billing" className="underline">
                        View plans
                      </Link>
                    )}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => create.mutate()} disabled={!name || !voiceId || !greeting || create.isPending}>
                  {create.isPending ? "Creating…" : "Create receptionist"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {list.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : list.data && list.data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.data.map((r) => (
            <Link key={r.id} to="/app/receptionists/$id" params={{ id: r.id }} className="card-elevated block p-5 transition hover:shadow-glow">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display font-semibold text-foreground">{r.name}</h3>
                <StatusBadge status={r.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{r.voice_name ?? "Default voice"}</p>
              <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{r.greeting}</p>
              <p className="mt-3 text-xs text-muted-foreground">Created {new Date(r.created_at).toLocaleDateString()}</p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bot}
          title="No receptionists yet"
          description="Create a receptionist to start answering calls for your business."
          action={<Button onClick={() => setOpen(true)}>New receptionist</Button>}
        />
      )}
    </div>
  );
}
