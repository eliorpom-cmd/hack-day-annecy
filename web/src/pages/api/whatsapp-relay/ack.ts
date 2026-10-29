// Relay on Elior's Mac reports each send: {id} = sent, {id, error} = failed (Bearer WHATSAPP_RELAY_TOKEN, no session)
import type { APIRoute } from "astro";
import { db } from "../../../lib/db";
import { secret } from "../../../lib/env";
import { handleAck } from "../../../lib/telephony/whatsapp-relay";

export const POST: APIRoute = ({ request }) =>
  handleAck(request, { db: db(), token: secret("WHATSAPP_RELAY_TOKEN") });
