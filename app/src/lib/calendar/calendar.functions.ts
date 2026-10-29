import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const startGoogleCalendarConnectFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientKey = process.env["GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY"];
    if (!clientKey) throw new Error("Google Calendar is not set up yet.");
    const { authorizeAppUserOAuth } = await import("@/integrations/lovable/appUserConnector");
    const { GATEWAY_BASE_URL, GOOGLE_CAL, GOOGLE_SCOPES, getUserConnection, decryptKey } =
      await import("./calendar.server");
    const request = getRequest();
    const url = new URL(request.url);
    const candidate =
      url.hostname === "localhost" ? (request.headers.get("x-forwarded-host") ?? "") : url.hostname;
    const allowed =
      ["ai-phone-desk.com", "www.ai-phone-desk.com", "your-virtual-agent.lovable.app"].includes(
        candidate,
      ) || /^[a-z0-9-]+\.(lovable\.app|lovableproject\.com)$/i.test(candidate);
    const host = allowed ? candidate : "ai-phone-desk.com";
    const returnUrl = new URL("/oauth/google-calendar/return", `https://${host}`).toString();
    const existing = await getUserConnection(context.userId);
    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: GOOGLE_CAL,
      appUserId: context.userId,
      clientAPIKey: clientKey,
      returnUrl,
      connectionAPIKey: existing ? decryptKey(existing.connection_key_ciphertext) : undefined,
      credentialsConfiguration: { scopes: GOOGLE_SCOPES },
    });
    return { authorizationUrl };
  });

export const completeGoogleCalendarConnectFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { exchangeAppUserOAuthCode } = await import("@/integrations/lovable/appUserConnector");
    const { GATEWAY_BASE_URL, GOOGLE_CAL, encryptKey, fetchAccountEmail } =
      await import("./calendar.server");
    const { requireOrg, audit } = await import("@/lib/org/org.server");
    const { org } = await requireOrg(context.supabase, context.userId);
    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(
      GATEWAY_BASE_URL,
      data.code,
    );
    if (connectorId !== GOOGLE_CAL) throw new Error("Unexpected connection.");
    const email = await fetchAccountEmail(connectionAPIKey);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_user_connections").upsert(
      {
        user_id: context.userId,
        organization_id: org.id,
        connector_id: GOOGLE_CAL,
        connection_key_ciphertext: encryptKey(connectionAPIKey),
        account_email: email,
        reconnect_required: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,connector_id" },
    );
    if (error) throw new Error("We couldn't save the connection.");
    await audit(context.supabase, org.id, context.userId, "calendar.connected", {
      type: "calendar",
      id: GOOGLE_CAL,
    }).catch(() => {});
    return { ok: true, email };
  });

export const disconnectGoogleCalendarFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { disconnectAppUser } = await import("@/integrations/lovable/appUserConnector");
    const { GATEWAY_BASE_URL, GOOGLE_CAL, getUserConnection, decryptKey } =
      await import("./calendar.server");
    const conn = await getUserConnection(context.userId);
    if (!conn) return { ok: true };
    await disconnectAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey: decryptKey(conn.connection_key_ciphertext),
      connectorId: GOOGLE_CAL,
    }).catch(() => {});
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("app_user_connections").delete().eq("id", conn.id);
    return { ok: true };
  });

export const getCalendarOverviewFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireOrg } = await import("@/lib/org/org.server");
    const { getOrgConnection, getAvailability } = await import("./calendar.server");
    const { org } = await requireOrg(context.supabase, context.userId);
    const conn = await getOrgConnection(org.id);
    const { data: appts } = await context.supabase
      .from("appointments")
      .select(
        "id, caller_name, caller_phone, service, starts_at, ends_at, status, source, calendar_provider",
      )
      .eq("organization_id", org.id)
      .gte("ends_at", new Date(Date.now() - 86400000).toISOString())
      .order("starts_at")
      .limit(100);
    let availability: Awaited<ReturnType<typeof getAvailability>> | null = null;
    let availabilityError: string | null = null;
    try {
      availability = await getAvailability(org.id, { days: 7 });
    } catch (e) {
      availabilityError =
        (e as { userMessage?: string }).userMessage ?? "We couldn't load open times.";
    }
    return {
      google: conn
        ? { email: conn.account_email, reconnectRequired: conn.reconnect_required }
        : null,
      appointments: appts ?? [],
      availability,
      availabilityError,
    };
  });

export const bookManualAppointmentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        start: z.string().datetime(),
        name: z.string().trim().min(1).max(120),
        phone: z.string().trim().max(30).optional(),
        service: z.string().trim().max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { requireOrg } = await import("@/lib/org/org.server");
    const { bookAppointment } = await import("./calendar.server");
    const { org } = await requireOrg(context.supabase, context.userId);
    try {
      return await bookAppointment(org.id, { ...data, source: "manual" });
    } catch (e) {
      return {
        confirmed: false as const,
        reason: (e as { userMessage?: string }).userMessage ?? "Booking failed.",
      };
    }
  });

export const cancelAppointmentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { requireOrg } = await import("@/lib/org/org.server");
    const { cancelAppointment } = await import("./calendar.server");
    const { org } = await requireOrg(context.supabase, context.userId);
    await cancelAppointment(org.id, data.id);
    return { ok: true };
  });

export const listGoogleEventsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from: string; to: string }) =>
    z.object({ from: z.string().datetime(), to: z.string().datetime() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { requireOrg } = await import("@/lib/org/org.server");
    const { listGoogleEvents } = await import("./calendar.server");
    const { org } = await requireOrg(context.supabase, context.userId);
    return { events: await listGoogleEvents(org.id, data.from, data.to), timezone: org.timezone };
  });

export const saveGoogleEventFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { id?: string; summary: string; description?: string; start: string; end: string }) =>
      z
        .object({
          id: z.string().max(1024).optional(),
          summary: z.string().trim().min(1).max(200),
          description: z.string().max(4000).optional(),
          start: z.string().datetime({ offset: true }),
          end: z.string().datetime({ offset: true }),
        })
        .refine((v) => new Date(v.end) > new Date(v.start), "End must be after start")
        .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { requireOrg, audit } = await import("@/lib/org/org.server");
    const { saveGoogleEvent } = await import("./calendar.server");
    const { org } = await requireOrg(context.supabase, context.userId);
    await saveGoogleEvent(org.id, data);
    await audit(
      context.supabase,
      org.id,
      context.userId,
      data.id ? "calendar.event_updated" : "calendar.event_created",
    ).catch(() => {});
    return { ok: true };
  });

export const deleteGoogleEventFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().min(1).max(1024) }).parse(d))
  .handler(async ({ context, data }) => {
    const { requireOrg, audit } = await import("@/lib/org/org.server");
    const { deleteGoogleEvent } = await import("./calendar.server");
    const { org } = await requireOrg(context.supabase, context.userId);
    await deleteGoogleEvent(org.id, data.id);
    await audit(context.supabase, org.id, context.userId, "calendar.event_deleted").catch(() => {});
    return { ok: true };
  });
