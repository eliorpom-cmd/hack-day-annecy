import { useEffect, useRef, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Globe, Pencil, Plus, Trash2, Loader2, AlertTriangle, ArrowRight, Check, Terminal, Search } from "lucide-react";
import { toast } from "sonner";
import { callAuthed } from "@/lib/auth/client";
import { startScanFn, advanceScanFn, saveBusinessFn, getBusinessFn } from "@/lib/onboarding/onboarding.functions";
import { businessProfileSchema, emptyBusinessProfile, defaultHours, INDUSTRIES, DAY_NAMES, type BusinessProfile, type BusinessProfileInput } from "@/lib/business/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { VoiceOrb } from "@/components/voice/VoiceOrb";

type Stage = "loading" | "choice" | "scanning" | "failed" | "review";
type ScanState = {
  stage: string;
  progress: number;
  pagesCrawled: number;
  pagesFound: number;
  error?: string | null;
  errorId?: string | null;
};

const SCAN_ACTIVITY = [
  "Opening your website securely",
  "Mapping the public pages we can read",
  "Reading your homepage and business overview",
  "Looking for the services customers can ask about",
  "Checking service descriptions and pricing notes",
  "Learning how your business describes itself",
  "Finding your address and service area",
  "Checking phone and email contact details",
  "Reading opening hours for each day",
  "Looking for holiday and after-hours guidance",
  "Finding common customer questions",
  "Reading the answers your team provides",
  "Looking for staff names and responsibilities",
  "Checking booking and appointment instructions",
  "Reviewing cancellation and rescheduling rules",
  "Looking for urgent-call and escalation guidance",
  "Organizing details into clear caller responses",
  "Checking that answers stay within your website content",
  "Preparing the information for your receptionist",
  "Running a final accuracy check",
] as const;

function ScanProgress({ scan }: { scan: ScanState }) {
  const [visibleLines, setVisibleLines] = useState(2);
  const feedRef = useRef<HTMLDivElement>(null);
  const progress = Math.max(0, Math.min(100, scan.progress));

  useEffect(() => {
    const interval = window.setInterval(() => {
      setVisibleLines((current) => Math.min(SCAN_ACTIVITY.length, current + 1));
    }, 720);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const progressLines = Math.max(2, Math.ceil((progress / 100) * SCAN_ACTIVITY.length));
    setVisibleLines((current) => Math.max(current, progressLines));
  }, [progress]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    feed.scrollTo({ top: feed.scrollHeight, behavior: "smooth" });
  }, [visibleLines]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <VoiceOrb state="connecting" size="sm" />
          <div className="text-left">
            <p className="eyebrow">Reading your website</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Teaching your receptionist</h2>
          </div>
        </div>
        <div className="font-display text-4xl font-semibold tabular-nums text-foreground" aria-hidden="true">
          {progress}%
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-4 text-sm">
          <span className="font-medium text-foreground">{scan.stage}</span>
          <span className="shrink-0 text-muted-foreground">
            {scan.pagesFound > 0 ? `${scan.pagesCrawled} of ${scan.pagesFound} pages read` : "Finding pages…"}
          </span>
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-label="Website reading progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-primary/20 bg-primary text-primary-foreground shadow-card">
        <div className="flex items-center justify-between border-b border-primary-foreground/15 px-4 py-3">
          <div className="flex items-center gap-2 font-mono text-xs font-medium">
            <Terminal className="h-3.5 w-3.5 text-accent" />
            Live reading activity
          </div>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-primary-foreground/65">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            In progress
          </span>
        </div>
        <div ref={feedRef} className="h-64 overflow-y-auto px-4 py-3 text-left font-mono text-xs leading-6 sm:h-72">
          {SCAN_ACTIVITY.slice(0, visibleLines).map((message, index) => {
            const isCurrent = index === visibleLines - 1 && visibleLines < SCAN_ACTIVITY.length;
            return (
              <div key={message} className="flex items-start gap-2 animate-fade-up">
                {isCurrent ? (
                  <Search className="mt-1.5 h-3 w-3 shrink-0 animate-pulse text-accent" />
                ) : (
                  <Check className="mt-1.5 h-3 w-3 shrink-0 text-accent" />
                )}
                <span className={isCurrent ? "text-primary-foreground" : "text-primary-foreground/70"}>{message}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-2 text-primary-foreground/50" aria-hidden="true">
            <span className="text-accent">›</span>
            <span className="inline-block h-3 w-1.5 animate-pulse bg-accent" />
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        You can review and edit everything before your receptionist is created.
      </p>
    </div>
  );
}

export function StepBusiness({ onSaved }: { onSaved: (profile: BusinessProfile) => void }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [url, setUrl] = useState("");
  const [scan, setScan] = useState<ScanState | null>(null);
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    callAuthed(getBusinessFn)
      .then(({ profile: existing }) => {
        if (cancelled) return;
        if (existing) {
          setProfile(existing);
          setHasExisting(true);
          setStage("review");
        } else {
          setStage("choice");
        }
      })
      .catch(() => setStage("choice"));
    return () => {
      cancelled = true;
    };
  }, []);

  async function runScan() {
    if (!url.trim()) return;
    setStage("scanning");
    setScan({ stage: "Starting scan…", progress: 5, pagesCrawled: 0, pagesFound: 0 });
    try {
      const { jobId } = await callAuthed(startScanFn, { data: { url: url.trim() } });
      await poll(jobId);
    } catch (e) {
      setScan({ stage: "Scan failed", progress: 0, pagesCrawled: 0, pagesFound: 0, error: e instanceof Error ? e.message : "We couldn't start the scan." });
      setStage("failed");
    }
  }

  async function poll(jobId: string) {
    for (;;) {
      const res = await callAuthed(advanceScanFn, { data: { jobId } });
      setScan({
        stage: res.stage,
        progress: res.progress,
        pagesCrawled: res.pagesCrawled,
        pagesFound: res.pagesFound,
        error: res.error,
        errorId: res.errorId,
      });
      if (res.status === "completed" && res.profile) {
        setProfile(res.profile);
        setStage("review");
        return;
      }
      if (res.status === "failed") {
        setStage("failed");
        return;
      }
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  if (stage === "loading") {
    return (
      <div className="space-y-3">
        <div className="skeleton-shimmer h-8 w-2/3 rounded-full" />
        <div className="skeleton-shimmer h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (stage === "choice") {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Tell us about your business</h1>
        <p className="mt-1 text-sm text-muted-foreground">We'll use this to teach your receptionist how to talk about your business.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="card-elevated flex flex-col gap-3 p-6">
            <Globe className="h-5 w-5 text-accent" />
            <h3 className="font-display text-base font-semibold text-foreground">Scan my website</h3>
            <p className="text-sm text-muted-foreground">We'll read your site and fill everything in for you.</p>
            <div className="mt-auto flex flex-col gap-2 pt-2">
              <Input
                placeholder="yourbusiness.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runScan()}
              />
              <Button onClick={runScan} disabled={!url.trim()}>
                Scan my website
              </Button>
            </div>
          </div>
          <div className="card-elevated flex flex-col gap-3 p-6">
            <Pencil className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-display text-base font-semibold text-foreground">Enter details manually</h3>
            <p className="text-sm text-muted-foreground">No website yet? No problem — add your details yourself.</p>
            <Button
              variant="outline"
              className="mt-auto"
              onClick={() => {
                setProfile({ ...emptyBusinessProfile(), hours: defaultHours() });
                setStage("review");
              }}
            >
              Enter details manually
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "scanning") {
    return (
      <div className="card-elevated p-5 sm:p-8">
        <ScanProgress scan={scan ?? { stage: "Starting website reader…", progress: 5, pagesCrawled: 0, pagesFound: 0 }} />
      </div>
    );
  }

  if (stage === "failed") {
    return (
      <div className="card-elevated flex flex-col items-center p-10 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <h2 className="mt-4 font-display text-xl font-semibold text-foreground">We couldn't finish that scan</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{scan?.error ?? "Something went wrong reading that website."}</p>
        {scan?.errorId && <p className="mt-1 text-xs text-muted-foreground/70">Ref: {scan.errorId}</p>}
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => setStage("choice")}>
            Try again
          </Button>
          <Button
            onClick={() => {
              setProfile({ ...emptyBusinessProfile(), hours: defaultHours() });
              setStage("review");
            }}
          >
            Enter details manually
          </Button>
        </div>
      </div>
    );
  }

  return <ReviewForm initial={profile ?? { ...emptyBusinessProfile(), hours: defaultHours() }} hasExisting={hasExisting} onSaved={onSaved} />;
}

function ReviewForm({
  initial,
  hasExisting,
  onSaved,
}: {
  initial: BusinessProfile;
  hasExisting: boolean;
  onSaved: (profile: BusinessProfile) => void;
}) {
  const [saving, setSaving] = useState(false);
  const form = useForm<BusinessProfileInput, any, BusinessProfile>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: initial,
  });

  const services = useFieldArray({ control: form.control, name: "services" });
  const faqs = useFieldArray({ control: form.control, name: "faqs" });
  const staff = useFieldArray({ control: form.control, name: "staff" });
  const hours = useFieldArray({ control: form.control, name: "hours" });

  async function onSubmit(values: BusinessProfile) {

    setSaving(true);
    try {
      await callAuthed(saveBusinessFn, { data: values });
      onSaved(values);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "We couldn't save your business details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-foreground">
        {hasExisting || initial.business_name ? "Here's what we found" : "Tell us about your business"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Review and adjust anything before we build your receptionist.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
          <section className="card-elevated space-y-4 p-6">
            <h3 className="eyebrow">Business info</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="business_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an industry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INDUSTRIES.map((i) => (
                          <SelectItem key={i.value} value={i.value}>
                            {i.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal code</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </section>

          <section className="card-elevated space-y-3 p-6">
            <h3 className="eyebrow">Description</h3>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea rows={3} placeholder="What does your business do?" {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />
          </section>

          <section className="card-elevated space-y-3 p-6">
            <h3 className="eyebrow">Hours</h3>
            <div className="space-y-2">
              {hours.fields.map((f, i) => (
                <div key={f.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2">
                  <span className="w-24 text-sm font-medium text-foreground">{DAY_NAMES[form.watch(`hours.${i}.day_of_week`) ?? 0] ?? ""}</span>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={!form.watch(`hours.${i}.enabled`)}
                      onCheckedChange={(v) => form.setValue(`hours.${i}.enabled`, !v)}
                    />
                    Closed
                  </label>
                  {form.watch(`hours.${i}.enabled`) && (
                    <div className="flex items-center gap-2">
                      <Input type="time" className="w-32" {...form.register(`hours.${i}.open_time`)} />
                      <span className="text-muted-foreground">to</span>
                      <Input type="time" className="w-32" {...form.register(`hours.${i}.close_time`)} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="card-elevated space-y-3 p-6">
            <div className="flex items-center justify-between">
              <h3 className="eyebrow">Services</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => services.append({ name: "", price_note: "", duration_minutes: null, description: "" })}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add service
              </Button>
            </div>
            <div className="space-y-3">
              {services.fields.map((f, i) => (
                <div key={f.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_100px_auto]">
                  <Input placeholder="Service name" {...form.register(`services.${i}.name`)} />
                  <Input placeholder="Price (e.g. $50)" {...form.register(`services.${i}.price_note`)} />
                  <Input type="number" placeholder="Minutes" {...form.register(`services.${i}.duration_minutes`, { valueAsNumber: true })} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => services.remove(i)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Textarea
                    className="sm:col-span-4"
                    placeholder="Description (optional)"
                    rows={2}
                    {...form.register(`services.${i}.description`)}
                  />
                </div>
              ))}
              {services.fields.length === 0 && <p className="text-sm text-muted-foreground">No services added yet.</p>}
            </div>
          </section>

          <section className="card-elevated space-y-3 p-6">
            <div className="flex items-center justify-between">
              <h3 className="eyebrow">FAQs</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => faqs.append({ question: "", answer: "" })}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add FAQ
              </Button>
            </div>
            <div className="space-y-3">
              {faqs.fields.map((f, i) => (
                <div key={f.id} className="space-y-2 rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Input placeholder="Question" {...form.register(`faqs.${i}.question`)} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => faqs.remove(i)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <Textarea placeholder="Answer" rows={2} {...form.register(`faqs.${i}.answer`)} />
                </div>
              ))}
              {faqs.fields.length === 0 && <p className="text-sm text-muted-foreground">No FAQs added yet.</p>}
            </div>
          </section>

          <section className="card-elevated space-y-3 p-6">
            <div className="flex items-center justify-between">
              <h3 className="eyebrow">Staff</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => staff.append({ name: "", role: "", phone: "" })}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add person
              </Button>
            </div>
            <div className="space-y-2">
              {staff.fields.map((f, i) => (
                <div key={f.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <Input placeholder="Name" {...form.register(`staff.${i}.name`)} />
                  <Input placeholder="Role" {...form.register(`staff.${i}.role`)} />
                  <Input placeholder="Phone" {...form.register(`staff.${i}.phone`)} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => staff.remove(i)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              {staff.fields.length === 0 && <p className="text-sm text-muted-foreground">No staff added yet.</p>}
            </div>
          </section>

          <section className="card-elevated space-y-4 p-6">
            <h3 className="eyebrow">Policies & rules</h3>
            <FormField
              control={form.control}
              name="policies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>General policies</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="booking_rules"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking rules</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cancellation_rules"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cancellation rules</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />
          </section>

          <div className="flex justify-end pb-4">
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Looks good — continue
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
