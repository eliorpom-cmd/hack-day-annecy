import type { APIRoute } from "astro";

export const GET: APIRoute = ({ locals }) => Response.json({ user: locals.user, business: locals.business });
