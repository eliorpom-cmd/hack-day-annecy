import type { APIRoute } from "astro";
import { db } from "../../../lib/db";
import { startSession } from "../../../lib/auth";
import { newId } from "../../../lib/tokens";
import { trialEmail } from "../../../lib/demo-setup";

// « Essayer la configuration » : a blank throwaway account that starts at step 1 of the setup.
// Its e-mail marks it as a demo account: the setup is pre-filled with Plomberie Martin (lib/demo-setup.ts).
export const POST: APIRoute = async ({ cookies, url, redirect }) => {
  const userId = newId();
  await db().batch([
    db().prepare("INSERT INTO users (id, email) VALUES (?, ?)").bind(userId, trialEmail(userId)),
    db().prepare("INSERT INTO businesses (id, owner_id) VALUES (?, ?)").bind(newId(), userId),
  ]);
  await startSession(cookies, userId, url.protocol === "https:");
  return redirect("/onboarding", 303);
};
