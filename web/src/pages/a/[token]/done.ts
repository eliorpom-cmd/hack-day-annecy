import type { APIRoute } from "astro";
import { db } from "../../../lib/db";
import { callPageByToken } from "../../../lib/callpage";
import { nowSeconds } from "../../../lib/tokens";

// « Marquer comme rappelé » (form post) or the answer to « Avez-vous eu … ? » (reached=yes|no)
export const POST: APIRoute = async ({ params, request, redirect }) => {
  const token = params.token ?? "";
  const page = await callPageByToken(token);
  if (!page) return new Response(null, { status: 404 });
  const form = await request.formData();
  const reached = String(form.get("reached") ?? "yes") === "yes";
  if (reached) {
    await db().prepare("UPDATE leads SET status = 'rappele', called_back_at = ?, recall_started_at = NULL WHERE id = ?")
      .bind(nowSeconds(), page.lead_id).run();
  } else {
    await db().prepare("UPDATE leads SET recall_started_at = NULL WHERE id = ?").bind(page.lead_id).run();
  }
  // The desktop pane of /app sends where to go back (only /app paths, never another site)
  const next = String(form.get("next") ?? "");
  return redirect(/^\/app(\?[\w=&%.-]*)?$/.test(next) ? next : `/a/${token}`, 303);
};
