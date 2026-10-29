import type { APIRoute } from "astro";
import { startSession } from "../../../lib/auth";

// One click into the fictional demo artisan (for the pitch)
export const POST: APIRoute = async ({ cookies, url, redirect }) => {
  await startSession(cookies, "demo", url.protocol === "https:");
  return redirect("/app", 303);
};
