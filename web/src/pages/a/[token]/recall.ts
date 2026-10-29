import type { APIRoute } from "astro";
import { db } from "../../../lib/db";
import { callPageByToken } from "../../../lib/callpage";
import { nowSeconds } from "../../../lib/tokens";

// Tap on « Rappeler »: remember it, so the app can ask « Avez-vous eu … ? » on return
export const POST: APIRoute = async ({ params }) => {
  const page = await callPageByToken(params.token ?? "");
  if (!page) return new Response(null, { status: 404 });
  await db().prepare("UPDATE leads SET recall_started_at = ? WHERE id = ?").bind(nowSeconds(), page.lead_id).run();
  return new Response(null, { status: 204 });
};
