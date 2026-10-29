import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { callAsAppUser, appUserReconnectRequired } from "@/integrations/lovable/appUserConnector";
import { AppError, log } from "@/lib/server/errors.server";

export const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
export const GOOGLE_CAL = "google_calendar";
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

// ---------- encryption ----------
function key(): Buffer {
  const raw = process.env["APP_USER_CONNECTION_KEY_SECRET"];
  if (!raw) throw new Error("APP_USER_CONNECTION_KEY_SECRET is not set");
  return Buffer.from(raw, "base64");
}
export function encryptKey(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64");
}
export function decryptKey(stored: string) {
  const buf = Buffer.from(stored, "base64");
  const d = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function getUserConnection(userId: string) {
  const db = await admin();
  const { data } = await db
    .from("app_user_connections")
    .select(
      "id, organization_id, connection_key_ciphertext, account_email, calendar_id, reconnect_required",
    )
    .eq("user_id", userId)
    .eq("connector_id", GOOGLE_CAL)
    .maybeSingle();
  return data;
}

/** The calendar that powers an organization's availability (first connected one). */
export async function getOrgConnection(orgId: string) {
  const db = await admin();
  const { data } = await db
    .from("app_user_connections")
    .select("id, connection_key_ciphertext, account_email, calendar_id, reconnect_required")
    .eq("organization_id", orgId)
    .eq("connector_id", GOOGLE_CAL)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return data;
}

async function google(
  conn: { id: string; connection_key_ciphertext: string },
  path: string,
  init?: RequestInit,
) {
  const res = await callAsAppUser({
    gatewayBaseUrl: GATEWAY_BASE_URL,
    connectionAPIKey: decryptKey(conn.connection_key_ciphertext),
    connectorId: GOOGLE_CAL,
    path,
    init: {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(12000),
    },
    requiredScopes: GOOGLE_SCOPES,
  });
  if (await appUserReconnectRequired(res)) {
    const db = await admin();
    await db.from("app_user_connections").update({ reconnect_required: true }).eq("id", conn.id);
    throw new AppError("Your Google Calendar access needs to be renewed.", { status: 409 });
  }
  if (!res.ok) {
    const body = await res.text();
    log("google_calendar.error", { status: res.status, path, body: body.slice(0, 500) });
    throw new AppError("We couldn't reach Google Calendar right now.", { status: 502 });
  }
  return res.json();
}

export async function fetchAccountEmail(connectionAPIKey: string) {
  const res = await callAsAppUser({
    gatewayBaseUrl: GATEWAY_BASE_URL,
    connectionAPIKey,
    connectorId: GOOGLE_CAL,
    path: "/calendar/v3/calendars/primary",
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { id?: string };
  return j.id ?? null;
}

// ---------- time zone helpers (no external deps) ----------
function tzOffsetMin(date: Date, tz: string) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return (
    (Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) -
      date.getTime()) /
    60000
  );
}
export function zoned(dateStr: string, hhmm: string, tz: string) {
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  const [h, mi] = hhmm.split(":").map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, h, mi);
  return new Date(guess - tzOffsetMin(new Date(guess), tz) * 60000);
}
export function localDate(date: Date, tz: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
function addDays(dateStr: string, n: number) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function speak(date: Date, tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

// ---------- availability ----------
type Busy = { start: number; end: number };

async function orgContext(orgId: string) {
  const db = await admin();
  const [{ data: bp }, { data: hours }] = await Promise.all([
    db
      .from("business_profiles")
      .select("timezone, business_name")
      .eq("organization_id", orgId)
      .maybeSingle(),
    db
      .from("business_hours")
      .select("day_of_week, enabled, open_time, close_time")
      .eq("organization_id", orgId),
  ]);
  return {
    tz: bp?.timezone || "America/New_York",
    name: bp?.business_name ?? "",
    hours: hours ?? [],
  };
}

async function busyBetween(
  orgId: string,
  from: Date,
  to: Date,
): Promise<{ busy: Busy[]; source: "google" | "built_in" }> {
  const db = await admin();
  const { data: appts } = await db
    .from("appointments")
    .select("starts_at, ends_at")
    .eq("organization_id", orgId)
    .eq("status", "confirmed")
    .lt("starts_at", to.toISOString())
    .gt("ends_at", from.toISOString());
  const busy: Busy[] = (appts ?? []).map((a) => ({
    start: Date.parse(a.starts_at),
    end: Date.parse(a.ends_at),
  }));
  const conn = await getOrgConnection(orgId);
  if (!conn || conn.reconnect_required) return { busy, source: "built_in" };
  const fb = (await google(conn, "/calendar/v3/freeBusy", {
    method: "POST",
    body: JSON.stringify({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      items: [{ id: conn.calendar_id }],
    }),
  })) as { calendars?: Record<string, { busy?: { start: string; end: string }[] }> };
  for (const b of fb.calendars?.[conn.calendar_id]?.busy ?? [])
    busy.push({ start: Date.parse(b.start), end: Date.parse(b.end) });
  return { busy, source: "google" };
}

export async function getAvailability(
  orgId: string,
  opts: { date?: string; durationMinutes?: number; days?: number },
) {
  const { tz, hours } = await orgContext(orgId);
  const duration = Math.min(Math.max(opts.durationMinutes ?? 30, 15), 240);
  const now = new Date();
  const today = localDate(now, tz);
  const startDate = opts.date && opts.date >= today ? opts.date : today;
  const span = opts.date ? 1 : (opts.days ?? 7);
  const from = zoned(startDate, "00:00", tz);
  const to = zoned(addDays(startDate, span), "00:00", tz);
  const { busy, source } = await busyBetween(orgId, from, to);

  const days: { date: string; slots: { start: string; label: string }[] }[] = [];
  for (let i = 0; i < span; i++) {
    const date = addDays(startDate, i);
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
    const h = hours.find((x) => x.day_of_week === dow);
    if (!h?.enabled) {
      days.push({ date, slots: [] });
      continue;
    }
    const open = zoned(date, String(h.open_time).slice(0, 5), tz).getTime();
    const close = zoned(date, String(h.close_time).slice(0, 5), tz).getTime();
    const slots: { start: string; label: string }[] = [];
    for (let t = open; t + duration * 60000 <= close; t += 30 * 60000) {
      const end = t + duration * 60000;
      if (t < now.getTime() + 30 * 60000) continue;
      if (busy.some((b) => b.start < end && b.end > t)) continue;
      slots.push({ start: new Date(t).toISOString(), label: speak(new Date(t), tz) });
    }
    days.push({ date, slots });
  }
  return {
    timezone: tz,
    today,
    todayLabel: new Intl.DateTimeFormat("en-US", { timeZone: tz, dateStyle: "full" }).format(now),
    source,
    duration,
    days,
  };
}

// ---------- booking ----------
export async function bookAppointment(
  orgId: string,
  input: {
    start: string;
    durationMinutes?: number;
    name: string;
    phone?: string;
    email?: string;
    service?: string;
    notes?: string;
    source: string;
    receptionistId?: string | null;
  },
) {
  const { tz, name: businessName } = await orgContext(orgId);
  const duration = Math.min(Math.max(input.durationMinutes ?? 30, 15), 240);
  const start = new Date(input.start);
  if (Number.isNaN(start.getTime()) || start.getTime() < Date.now())
    return { confirmed: false, reason: "That time is not available." };
  const end = new Date(start.getTime() + duration * 60000);

  // Re-check: the slot must still be open in business hours and free.
  const avail = await getAvailability(orgId, {
    date: localDate(start, tz),
    durationMinutes: duration,
  });
  const open = avail.days.some((d) => d.slots.some((s) => Date.parse(s.start) === start.getTime()));
  if (!open)
    return { confirmed: false, reason: "That time was just taken or is outside business hours." };

  let externalId: string | null = null;
  let provider = "built_in";
  const conn = await getOrgConnection(orgId);
  if (conn && !conn.reconnect_required) {
    const ev = (await google(
      conn,
      `/calendar/v3/calendars/${encodeURIComponent(conn.calendar_id)}/events`,
      {
        method: "POST",
        body: JSON.stringify({
          summary: `${input.service ? `${input.service} — ` : ""}${input.name}`,
          description: [
            input.phone && `Phone: ${input.phone}`,
            input.email && `Email: ${input.email}`,
            input.notes,
            `Booked by your ${businessName} receptionist.`,
          ]
            .filter(Boolean)
            .join("\n"),
          start: { dateTime: start.toISOString(), timeZone: tz },
          end: { dateTime: end.toISOString(), timeZone: tz },
        }),
      },
    )) as { id?: string; status?: string };
    if (!ev.id) return { confirmed: false, reason: "The calendar did not confirm the booking." };
    externalId = ev.id;
    provider = "google";
  }

  const db = await admin();
  const { data, error } = await db
    .from("appointments")
    .insert({
      organization_id: orgId,
      receptionist_id: input.receptionistId ?? null,
      caller_name: input.name,
      caller_phone: input.phone ?? null,
      caller_email: input.email ?? null,
      service: input.service ?? null,
      notes: input.notes ?? null,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: "confirmed",
      source: input.source,
      calendar_provider: provider,
      external_event_id: externalId,
    })
    .select("id")
    .single();
  if (error || !data) return { confirmed: false, reason: "We couldn't save the booking." };
  log("appointment.booked", { org_id: orgId, appointment_id: data.id, provider });
  return { confirmed: true, appointmentId: data.id, when: speak(start, tz) };
}

export async function cancelAppointment(orgId: string, id: string) {
  const db = await admin();
  const { data: appt } = await db
    .from("appointments")
    .select("id, external_event_id, calendar_provider")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!appt) throw new AppError("Appointment not found.", { status: 404 });
  if (appt.calendar_provider === "google" && appt.external_event_id) {
    const conn = await getOrgConnection(orgId);
    if (conn) {
      await callAsAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey: decryptKey(conn.connection_key_ciphertext),
        connectorId: GOOGLE_CAL,
        path: `/calendar/v3/calendars/${encodeURIComponent(conn.calendar_id)}/events/${encodeURIComponent(appt.external_event_id)}`,
        init: { method: "DELETE" },
      }).catch(() => null);
    }
  }
  await db.from("appointments").update({ status: "cancelled" }).eq("id", id);
}

// ---------- Google events (view + edit) ----------
export type GEvent = {
  id: string;
  summary: string;
  description: string;
  start: string;
  end: string;
  allDay: boolean;
  htmlLink?: string;
};

function requireConn<T>(c: T | null | undefined): T {
  if (!c) throw new AppError("Connect Google Calendar first.", { status: 400 });
  return c;
}

export async function listGoogleEvents(orgId: string, from: string, to: string): Promise<GEvent[]> {
  const conn = requireConn(await getOrgConnection(orgId));
  const q = new URLSearchParams({
    timeMin: from,
    timeMax: to,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const data = (await google(
    conn,
    `/calendar/v3/calendars/${encodeURIComponent(conn.calendar_id)}/events?${q}`,
  )) as { items?: any[] };
  return (data.items ?? [])
    .filter((e) => e.status !== "cancelled")
    .map((e) => ({
      id: e.id,
      summary: e.summary ?? "(No title)",
      description: e.description ?? "",
      start: e.start?.dateTime ?? e.start?.date,
      end: e.end?.dateTime ?? e.end?.date,
      allDay: !e.start?.dateTime,
      htmlLink: e.htmlLink,
    }));
}

export async function saveGoogleEvent(
  orgId: string,
  ev: { id?: string; summary: string; description?: string; start: string; end: string },
) {
  const conn = requireConn(await getOrgConnection(orgId));
  const base = `/calendar/v3/calendars/${encodeURIComponent(conn.calendar_id)}/events`;
  const body = JSON.stringify({
    summary: ev.summary,
    description: ev.description ?? "",
    start: { dateTime: ev.start },
    end: { dateTime: ev.end },
  });
  return ev.id
    ? google(conn, `${base}/${encodeURIComponent(ev.id)}`, { method: "PATCH", body })
    : google(conn, base, { method: "POST", body });
}

export async function deleteGoogleEvent(orgId: string, id: string) {
  const conn = requireConn(await getOrgConnection(orgId));
  const res = await callAsAppUser({
    gatewayBaseUrl: GATEWAY_BASE_URL,
    connectionAPIKey: decryptKey(conn.connection_key_ciphertext),
    connectorId: GOOGLE_CAL,
    path: `/calendar/v3/calendars/${encodeURIComponent(conn.calendar_id)}/events/${encodeURIComponent(id)}`,
    init: { method: "DELETE", signal: AbortSignal.timeout(12000) },
    requiredScopes: GOOGLE_SCOPES,
  });
  if (!res.ok && res.status !== 410 && res.status !== 404)
    throw new AppError("We couldn't delete that event.", { status: 502 });
  const db = await admin();
  await db
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("organization_id", orgId)
    .eq("external_event_id", id);
}
