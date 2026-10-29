// Relay on Elior's Mac polls this: pending WhatsApp messages (Bearer WHATSAPP_RELAY_TOKEN, no session)
import type { APIRoute } from "astro";
import { db } from "../../../lib/db";
import { secret } from "../../../lib/env";
import { handleOutbox } from "../../../lib/telephony/whatsapp-relay";

export const GET: APIRoute = ({ request }) =>
  handleOutbox(request, { db: db(), token: secret("WHATSAPP_RELAY_TOKEN") });
