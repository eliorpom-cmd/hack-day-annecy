import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { callAuthed } from "@/lib/auth/client";
import {
  deleteGoogleEventFn,
  listGoogleEventsFn,
  saveGoogleEventFn,
} from "@/lib/calendar/calendar.functions";

type Ev = {
  id: string;
  summary: string;
  description: string;
  start: string;
  end: string;
  allDay: boolean;
  htmlLink?: string;
};
type Draft = {
  id?: string;
  summary: string;
  description: string;
  date: string;
  start: string;
  end: string;
  htmlLink?: string;
};

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
const pad = (n: number) => n.toString().padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function GoogleWeekCalendar() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const from = weekStart.toISOString();
  const to = new Date(weekStart.getTime() + 7 * 86400000).toISOString();
  const q = useQuery({
    queryKey: ["google-events", from],
    queryFn: () => callAuthed(listGoogleEventsFn, { data: { from, to } }),
    refetchInterval: 60_000,
  });

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86400000)),
    [weekStart],
  );
  const byDay = useMemo(() => {
    const m = new Map<string, Ev[]>();
    for (const e of (q.data?.events ?? []) as Ev[]) {
      const k = e.allDay ? e.start : ymd(new Date(e.start));
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    return m;
  }, [q.data]);

  const todayKey = ymd(new Date());

  function openNew(day: Date) {
    setDraft({ summary: "", description: "", date: ymd(day), start: "09:00", end: "10:00" });
  }
  function openEdit(e: Ev) {
    if (e.allDay) {
      if (e.htmlLink) window.open(e.htmlLink, "_blank", "noopener");
      return;
    }
    const s = new Date(e.start);
    setDraft({
      id: e.id,
      summary: e.summary,
      description: e.description,
      date: ymd(s),
      start: hm(s),
      end: hm(new Date(e.end)),
      htmlLink: e.htmlLink,
    });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      await callAuthed(saveGoogleEventFn, {
        data: {
          id: draft.id,
          summary: draft.summary,
          description: draft.description,
          start: new Date(`${draft.date}T${draft.start}`).toISOString(),
          end: new Date(`${draft.date}T${draft.end}`).toISOString(),
        },
      });
      toast.success(draft.id ? "Event updated" : "Event added");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["google-events"] });
      qc.invalidateQueries({ queryKey: ["calendar-overview"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!draft?.id || !confirm("Delete this event from your Google Calendar?")) return;
    setSaving(true);
    try {
      await callAuthed(deleteGoogleEventFn, { data: { id: draft.id } });
      toast.success("Event deleted");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["google-events"] });
      qc.invalidateQueries({ queryKey: ["calendar-overview"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-foreground">Your Google Calendar</h2>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            aria-label="Previous week"
            onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            Today
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-label="Next week"
            onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => openNew(new Date())}>
            <Plus className="mr-1 h-3.5 w-3.5" /> New event
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {days[0]!.toLocaleDateString([], { month: "short", day: "numeric" })} –{" "}
        {days[6]!.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
        {" · "}Your receptionist sees these busy times and books new appointments here.
      </p>
      {q.isError ? (
        <p className="text-sm text-destructive">{(q.error as Error).message}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-7">
          {days.map((day) => {
            const k = ymd(day);
            const evs = byDay.get(k) ?? [];
            return (
              <div
                key={k}
                className={`card-elevated flex min-h-40 flex-col gap-1.5 p-2 ${k === todayKey ? "ring-1 ring-accent/50" : ""}`}
              >
                <button
                  onClick={() => openNew(day)}
                  className="flex items-baseline justify-between rounded px-1 text-left hover:bg-surface"
                  title="Add event"
                >
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    {day.toLocaleDateString([], { weekday: "short" })}
                  </span>
                  <span
                    className={`font-display text-base font-semibold ${k === todayKey ? "text-accent" : "text-foreground"}`}
                  >
                    {day.getDate()}
                  </span>
                </button>
                {q.isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  evs.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => openEdit(e)}
                      className="rounded-md bg-accent/15 px-2 py-1.5 text-left hover:bg-accent/25"
                    >
                      <p className="text-[11px] text-muted-foreground">
                        {e.allDay
                          ? "All day"
                          : new Date(e.start).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                      </p>
                      <p className="line-clamp-2 text-xs font-medium text-foreground">
                        {e.summary}
                      </p>
                    </button>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit event" : "New event"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ev-title">Title</Label>
                <Input
                  id="ev-title"
                  value={draft.summary}
                  onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-3 space-y-1.5 sm:col-span-1">
                  <Label htmlFor="ev-date">Date</Label>
                  <Input
                    id="ev-date"
                    type="date"
                    value={draft.date}
                    onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ev-start">Start</Label>
                  <Input
                    id="ev-start"
                    type="time"
                    value={draft.start}
                    onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ev-end">End</Label>
                  <Input
                    id="ev-end"
                    type="time"
                    value={draft.end}
                    onChange={(e) => setDraft({ ...draft, end: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-notes">Notes</Label>
                <Textarea
                  id="ev-notes"
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>
              {draft.htmlLink && (
                <a
                  href={draft.htmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  Open in Google Calendar <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            {draft?.id ? (
              <Button variant="destructive" onClick={remove} disabled={saving}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={save} disabled={saving || !draft?.summary.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
