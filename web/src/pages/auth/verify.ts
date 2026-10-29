import type { APIRoute } from "astro";
import { consumeMagicLink, startSession } from "../../lib/auth";

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const userId = await consumeMagicLink(url.searchParams.get("token") ?? "");
  if (!userId) return redirect("/login?expired=1", 303);
  await startSession(cookies, userId, url.protocol === "https:");
  return redirect("/app", 303);
};
