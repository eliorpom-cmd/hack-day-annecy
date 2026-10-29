import type { APIRoute } from "astro";
import { createMagicLink } from "../../../lib/auth";
import { isValidEmail } from "../../../lib/tokens";

export const POST: APIRoute = async ({ request, url }) => {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) return Response.json({ error: "invalid_email" }, { status: 400 });
  const result = await createMagicLink(email, url.origin);
  return Response.json(result);
};
