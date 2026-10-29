import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AudioLines, Check, Loader2, RefreshCcw, Sparkles } from "lucide-react";
import { AccentFlag, VoicePreviewButton, playVoicePreview } from "@/components/voice/VoicePreviewButton";
import { toast } from "sonner";
import { callAuthed } from "@/lib/auth/client";
import { getVoicesFn } from "@/lib/public/public.functions";
import {
  listReceptionistsFn,
  createReceptionistFn,
  updateReceptionistFn,
  getReceptionistStatusFn,
  retryReceptionistFn,
} from "@/lib/receptionist/receptionist.functions";
import { defaultGreeting } from "@/lib/business/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

const TONES = [
  { value: "warm", label: "Warm" },
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "concise", label: "Concise" },
] as const;

const formSchema = z.object({
  name: z.string().min(1, "Give it a name."),
  voice_id: z.string().min(1, "Choose a voice."),
  greeting: z.string().min(1, "Add a greeting."),
  tone: z.enum(["warm", "professional", "friendly", "concise"]),
  custom_instructions: z.string().max(4000).optional(),
});
type FormValues = z.infer<typeof formSchema>;

type Voice = {
  id: string;
  name: string;
  gender: string | null;
  description: string | null;
  accent: string | null;
  preview_url: string | null;
  recommended_industries: string[] | null;
  is_default: boolean | null;
};

const CHECKLIST = [
  { key: "knowledge", label: "Preparing business knowledge" },
  { key: "voice", label: "Setting up voice" },
  { key: "agent", label: "Creating receptionist" },
  { key: "ready", label: "Ready" },
];

export function StepReceptionist({
  businessName,
  industry,
  existingReceptionistId,
  onCreated,
}: {
  businessName: string;
  industry: string | null;
  existingReceptionistId: string | null;
  onCreated: (id: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [existingId, setExistingId] = useState<string | null>(existingReceptionistId);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: `${businessName}'s Receptionist`,
      voice_id: "",
      greeting: defaultGreeting(businessName),
      tone: "warm",
      custom_instructions: "",
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [voiceList, existing] = await Promise.all([getVoicesFn(), callAuthed(listReceptionistsFn)]);
        if (cancelled) return;
        setVoices(voiceList);
        const rec = existing[0];
        if (rec) {
          setExistingId(rec.id);
          form.reset({
            name: rec.name,
            voice_id: form.getValues("voice_id"),
            greeting: rec.greeting ?? defaultGreeting(businessName),
            tone: form.getValues("tone"),
            custom_instructions: "",
          });
        }
        const recommended = voiceList.find((v) => v.recommended_industries?.includes(industry ?? "")) ?? voiceList.find((v) => v.is_default);
        if (recommended) form.setValue("voice_id", recommended.id);
      } catch {
        toast.error("We couldn't load voice options.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      if (existingId) {
        await callAuthed(updateReceptionistFn, {
          data: { id: existingId, patch: { name: values.name, voice_id: values.voice_id, greeting: values.greeting, tone: values.tone, custom_instructions: values.custom_instructions || null } },
        });
        setCreatingId(existingId);
      } else {
        const res = await callAuthed(createReceptionistFn, {
          data: {
            name: values.name,
            voice_id: values.voice_id,
            greeting: values.greeting,
            tone: values.tone,
            custom_instructions: values.custom_instructions || null,
          },
        });
        setCreatingId(res.id);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "We couldn't create your receptionist.");
      setSubmitting(false);
    }
  }

  if (creatingId) {
    return <CreationProgress id={creatingId} onReady={() => onCreated(creatingId)} />;
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="skeleton-shimmer h-8 w-2/3 rounded-full" />
        <div className="skeleton-shimmer h-56 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-foreground">
        {existingId ? "Update your receptionist" : "Set up your receptionist"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Choose a voice and personality that fits your business.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
          <section className="card-elevated space-y-4 p-6">
            <h3 className="eyebrow">Voice</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {voices.map((v) => {
                const selected = form.watch("voice_id") === v.id;
                const matchesBusiness = !!industry && !!v.recommended_industries?.includes(industry);
                return (
                  <button
                    type="button"
                    key={v.id}
                    onClick={() => {
                      form.setValue("voice_id", v.id, { shouldValidate: true });
                      playVoicePreview(v.id, v.preview_url);
                    }}
                    className={cn(
                      "flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors",
                      selected ? "border-accent bg-accent/5" : "border-border hover:border-foreground/30",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AudioLines className="h-4 w-4 text-accent" />
                        <span className="font-medium text-foreground">{v.name}</span>
                        <AccentFlag accent={v.accent} />
                        {v.gender && <span className="text-xs text-muted-foreground">· {v.gender}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <VoicePreviewButton previewUrl={v.preview_url} previewId={v.id} voiceName={v.name} />
                        {selected && <Check className="h-4 w-4 text-accent" />}
                      </div>
                    </div>
                    {v.description && <p className="text-xs text-muted-foreground">{v.description}</p>}
                    {matchesBusiness && (
                      <Badge variant="secondary" className="w-fit gap-1 text-[10px] font-normal text-accent">
                        <Sparkles className="h-3 w-3" /> Matches your business
                      </Badge>
                    )}
                    {v.recommended_industries && v.recommended_industries.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {v.recommended_industries.slice(0, 3).map((r) => (
                          <Badge key={r} variant="secondary" className="text-[10px] font-normal">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Tap a voice to hear it before you choose.</p>
            {form.formState.errors.voice_id && <p className="text-sm text-destructive">{form.formState.errors.voice_id.message}</p>}
          </section>

          <section className="card-elevated space-y-4 p-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receptionist name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="greeting"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Greeting</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tone</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {TONES.map((t) => (
                        <Label
                          key={t.value}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                            field.value === t.value ? "border-accent bg-accent/5" : "border-border",
                          )}
                        >
                          <RadioGroupItem value={t.value} />
                          {t.label}
                        </Label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="custom_instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anything else it should know? (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Special instructions, things to avoid, etc." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </section>

          <div className="flex justify-end pb-4">
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {existingId ? "Update my receptionist" : "Create my receptionist"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function CreationProgress({ id, onReady }: { id: string; onReady: () => void }) {
  const [status, setStatus] = useState<string>("creating_agent");
  const [message, setMessage] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const res = await callAuthed(getReceptionistStatusFn, { data: { id } });
        if (cancelled || !res) return;
        setStatus(res.status);
        setMessage(res.status_message);
        if (res.status === "agent_ready" || res.status === "live") {
          onReady();
          return;
        }
        if (res.status === "error") return;
        timer = setTimeout(poll, 1500);
      } catch {
        timer = setTimeout(poll, 1500);
      }
    }
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  async function retry() {
    setRetrying(true);
    try {
      await callAuthed(retryReceptionistFn, { data: { id } });
      setStatus("creating_agent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "We couldn't retry that.");
    } finally {
      setRetrying(false);
    }
  }

  const isError = status === "error";
  const stepIndex = isError ? -1 : status === "agent_ready" || status === "live" ? 3 : 2;

  return (
    <div className="card-elevated flex flex-col items-center p-10 text-center">
      <h2 className="font-display text-xl font-semibold text-foreground">Creating your receptionist</h2>
      <ul className="mt-6 w-full max-w-sm space-y-3 text-left">
        {CHECKLIST.map((item, i) => {
          const done = !isError && i < stepIndex;
          const active = !isError && i === stepIndex;
          return (
            <li key={item.key} className="flex items-center gap-3 text-sm">
              {done ? (
                <Check className="h-4 w-4 text-accent" />
              ) : active ? (
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
              ) : (
                <span className="h-4 w-4 rounded-full border border-border" />
              )}
              <span className={cn(done || active ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
            </li>
          );
        })}
      </ul>
      {isError && (
        <div className="mt-6">
          <p className="text-sm text-destructive">{message ?? "We hit a snag creating your receptionist."}</p>
          <Button className="mt-4" onClick={retry} disabled={retrying}>
            {retrying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
