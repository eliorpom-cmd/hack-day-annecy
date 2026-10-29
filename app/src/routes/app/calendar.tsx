import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarIcon, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { callAuthed } from "@/lib/auth/client";
import {
  bookManualAppointmentFn,
  cancelAppointmentFn,
  completeGoogleCalendarConnectFn,
  disconnectGoogleCalendarFn,
  getCalendarOverviewFn,
  startGoogleCalendarConnectFn,
} from "@/lib/calendar/calendar.functions";
import { GoogleWeekCalendar } from "@/components/app/GoogleWeekCalendar";

export const Route = createFileRoute("/app/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — AI Phone Desk" },
      {
        name: "description",
        content: "Connect your calendar so your receptionist books into real open times.",
      },
      { property: "og:title", content: "Calendar — AI Phone Desk" },
      {
        property: "og:description",
        content: "Connect your calendar so your receptionist books into real open times.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarPage,
});

function waitForOAuth(popup: Window) {
  return new Promise<string | null>((resolve, reject) => {
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(poll);
    };
    const onMessage = (e: MessageEvent) => {
      const t = e.data?.type;
      if (
        e.origin !== window.location.origin ||
        e.source !== popup ||
        e.data?.connectorId !== "google_calendar"
      )
        return;
      if (t !== "appUserConnectorOAuthComplete" && t !== "appUserConnectorOAuthFailed") return;
      cleanup();
      if (t === "appUserConnectorOAuthComplete")
        resolve(typeof e.data.code === "string" ? e.data.code : null);
      else reject(new Error("Google Calendar was not connected."));
    };
    window.addEventListener("message", onMessage);
    const poll = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error("The Google window was closed before finishing."));
      }
    }, 500);
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function CalendarPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["calendar"], queryFn: () => callAuthed(getCalendarOverviewFn) });
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  async function connect(isReconnect: boolean) {
    const popup = window.open("", "google-calendar-connect", "width=600,height=720");
    if (!popup) {
      toast.error("Please allow pop-ups and try again.");
      return;
    }
    setBusy(true);
    try {
      const { authorizationUrl } = await callAuthed(startGoogleCalendarConnectFn);
      const done = waitForOAuth(popup);
      popup.location.href = authorizationUrl;
      const code = await done;
      if (code) await callAuthed(completeGoogleCalendarConnectFn, { data: { code } } as never);
      await qc.invalidateQueries({ queryKey: ["calendar"] });
      toast.success(isReconnect ? "Reconnected to Google Calendar" : "Google Calendar connected");
    } catch (e) {
      popup.close();
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    await callAuthed(disconnectGoogleCalendarFn).catch(() => null);
    await qc.invalidateQueries({ queryKey: ["calendar"] });
    setBusy(false);
    toast.success("Google Calendar disconnected. The built-in calendar is used now.");
  }

  async function book() {
    if (!picked || !name.trim()) return;
    setBusy(true);
    const r = await callAuthed(bookManualAppointmentFn, {
      data: { start: picked, name, phone: phone || undefined },
    } as never);
    setBusy(false);
    if (r.confirmed) {
      toast.success("Appointment confirmed");
      setPicked(null);
      setName("");
      setPhone("");
      qc.invalidateQueries({ queryKey: ["calendar"] });
    } else toast.error(r.reason ?? "That time is not available.");
  }

  async function cancel(id: string) {
    await callAuthed(cancelAppointmentFn, { data: { id } } as never);
    qc.invalidateQueries({ queryKey: ["calendar"] });
    toast.success("Appointment cancelled");
  }

  const d = q.data;
  const upcoming = (d?.appointments ?? []).filter((a) => a.status === "confirmed");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Calendar"
        description="Your receptionist checks these open times and books callers straight in."
      />

      <div className="card-elevated flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Connected calendar</p>
          {q.isLoading ? (
            <Skeleton className="mt-2 h-5 w-48" />
          ) : d?.google ? (
            <p className="mt-1 flex items-center gap-2 font-medium text-foreground">
              <CheckCircle2 className="h-4 w-4 text-accent" /> Google Calendar
              {d.google.email ? ` · ${d.google.email}` : ""}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Using the built-in calendar, based on your business hours. Connect Google Calendar so
              busy times block bookings and new appointments show up there.
            </p>
          )}
          {d?.google?.reconnectRequired && (
            <p className="mt-1 text-sm text-destructive">
              Your Google Calendar access needs to be renewed.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {d?.google ? (
            <>
              {d.google.reconnectRequired && (
                <Button onClick={() => connect(true)} disabled={busy}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Reconnect Google Calendar
                </Button>
              )}
              <Button variant="outline" onClick={disconnect} disabled={busy}>
                Disconnect
              </Button>
            </>
          ) : (
            <Button onClick={() => connect(false)} disabled={busy || q.isLoading}>
              {busy ? "Connecting…" : "Connect Google Calendar"}
            </Button>
          )}
        </div>
      </div>

      {d?.google && !d.google.reconnectRequired && <GoogleWeekCalendar />}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Upcoming appointments
        </h2>
        {q.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarIcon}
            title="No appointments yet"
            description="When your receptionist books a caller, it appears here. It only confirms after the calendar has confirmed it."
          />
        ) : (
          <div className="card-elevated divide-y">
            {upcoming.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-foreground">
                    {a.caller_name}
                    {a.service ? ` · ${a.service}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {fmtTime(a.starts_at)}
                    {a.caller_phone ? ` · ${a.caller_phone}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {a.source === "receptionist" ? "Booked by receptionist" : "Added by you"}
                  </Badge>
                  {a.calendar_provider === "google" && (
                    <Badge variant="outline">In Google Calendar</Badge>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => cancel(a.id)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">Open times this week</h2>
        <p className="text-sm text-muted-foreground">
          This is exactly what your receptionist offers callers. Click a time to add an appointment
          yourself.
        </p>
        {q.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : d?.availabilityError ? (
          <p className="text-sm text-destructive">{d.availabilityError}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {d?.availability?.days.map((day) => (
              <div key={day.date} className="card-elevated p-4">
                <p className="font-medium text-foreground">
                  {new Date(`${day.date}T12:00:00Z`).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </p>
                {day.slots.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Closed or fully booked</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {day.slots.map((s) => (
                      <Button
                        key={s.start}
                        size="sm"
                        variant={picked === s.start ? "default" : "outline"}
                        onClick={() => setPicked(s.start)}
                      >
                        {s.label.split(" at ").pop()}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {picked && (
          <div className="card-elevated flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <p className="mb-1 text-sm text-muted-foreground">Book {fmtTime(picked)}</p>
              <Input
                placeholder="Customer name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Input
              className="sm:w-48"
              placeholder="Phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button onClick={book} disabled={busy || !name.trim()}>
              Book
            </Button>
            <Button variant="ghost" onClick={() => setPicked(null)}>
              Cancel
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
