import { listConversations, getConversation, type ConversationDetail } from "@/lib/elevenlabs/conversations.server";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

function callerPhone(d: ConversationDetail): string | null {
  const meta = d.metadata as Record<string, any>;
  const pc = meta?.phone_call as Record<string, any> | undefined;
  const dyn = (d as any).conversation_initiation_client_data?.dynamic_variables ?? {};
  const v = pc?.external_number ?? dyn.system__caller_id ?? null;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function isPhone(d: ConversationDetail) {
  const meta = d.metadata as Record<string, any>;
  return !!meta?.phone_call || !!(d as any).conversation_initiation_client_data?.dynamic_variables?.system__caller_id;
}

/**
 * Pull recent conversations for every receptionist in the org from ElevenLabs
 * and store them. Idempotent: keyed on the ElevenLabs conversation id.
 */
export async function syncOrgCalls(orgId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as Admin;
  const { data: recs } = await db
    .from("receptionists")
    .select("id, elevenlabs_agent_id")
    .eq("organization_id", orgId)
    .not("elevenlabs_agent_id", "is", null);
  if (!recs?.length) return { synced: 0 };

  const { data: existing } = await db.from("calls").select("external_id, status").eq("organization_id", orgId);
  const known = new Map((existing ?? []).map((c) => [c.external_id, c.status]));

  const toFetch: { id: string; receptionistId: string }[] = [];
  for (const r of recs) {
    let cursor: string | undefined;
    for (let page = 0; page < 3; page++) {
      const res = await listConversations(r.elevenlabs_agent_id!, cursor);
      let allDone = true;
      for (const c of res.conversations) {
        if (known.get(c.conversation_id) !== "done") {
          toFetch.push({ id: c.conversation_id, receptionistId: r.id });
          allDone = false;
        }
      }
      if (!res.has_more || !res.next_cursor || allDone) break;
      cursor = res.next_cursor;
    }
  }

  let synced = 0;
  for (const item of toFetch.slice(0, 30)) {
    try {
      const d = await getConversation(item.id);
      if (!d) continue;
      const phone = isPhone(d);
      const row = {
        organization_id: orgId,
        receptionist_id: item.receptionistId,
        external_id: d.conversation_id,
        channel: phone ? "phone" : "browser",
        caller_phone: phone ? callerPhone(d) : null,
        status: d.status,
        outcome: d.analysis?.call_successful ?? null,
        summary: d.analysis?.transcript_summary ?? null,
        title: ((d.analysis as any)?.call_summary_title as string | undefined) ?? null,
        transcript: (d.transcript ?? [])
          .filter((t) => t.message)
          .map((t) => ({ role: t.role, message: t.message, t: t.time_in_call_secs })),
        duration_secs: Math.round(d.metadata?.call_duration_secs ?? 0),
        has_audio: !!d.has_audio,
        started_at: new Date((d.metadata?.start_time_unix_secs ?? Date.now() / 1000) * 1000).toISOString(),
        synced_at: new Date().toISOString(),
      };
      const { error } = await db.from("calls").upsert(row, { onConflict: "external_id" });
      if (error) throw error;
      synced++;
    } catch (e) {
      console.error(JSON.stringify({ level: "error", event: "calls.sync_failed", conversation: item.id, error: String(e) }));
    }
  }

  if (synced) await rebuildClients(db, orgId);
  return { synced };
}

async function rebuildClients(db: Admin, orgId: string) {
  const { data: calls } = await db
    .from("calls")
    .select("id, caller_phone, started_at, summary")
    .eq("organization_id", orgId)
    .eq("channel", "phone")
    .not("caller_phone", "is", null)
    .order("started_at", { ascending: true });
  const { data: appts } = await db
    .from("appointments")
    .select("caller_phone, caller_name, caller_email")
    .eq("organization_id", orgId)
    .not("caller_phone", "is", null);
  const names = new Map((appts ?? []).map((a) => [a.caller_phone, a]));

  const byPhone = new Map<string, { first: string; last: string; count: number; summary: string | null; ids: string[] }>();
  for (const c of calls ?? []) {
    const p = c.caller_phone!;
    const cur = byPhone.get(p) ?? { first: c.started_at, last: c.started_at, count: 0, summary: null, ids: [] };
    cur.last = c.started_at;
    cur.count++;
    cur.summary = c.summary ?? cur.summary;
    cur.ids.push(c.id);
    byPhone.set(p, cur);
  }
  for (const [phone, v] of byPhone) {
    const a = names.get(phone);
    const { data: client } = await db
      .from("clients")
      .upsert(
        {
          organization_id: orgId,
          phone,
          name: a?.caller_name ?? null,
          email: a?.caller_email ?? null,
          first_call_at: v.first,
          last_call_at: v.last,
          call_count: v.count,
          last_summary: v.summary,
        },
        { onConflict: "organization_id,phone" },
      )
      .select("id")
      .single();
    if (client) await db.from("calls").update({ client_id: client.id }).in("id", v.ids);
  }
}
