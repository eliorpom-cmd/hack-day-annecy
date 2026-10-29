import type { APIRoute } from "astro";
import { requireBusiness } from "../../../lib/env";
import { fail, handle, json, readJson } from "../../../lib/http";
import { parsePostRequest } from "../../../lib/social";
import { generatePost, rateLimited, recentPosts } from "../../../lib/social-run";
import { isDemoAccount } from "../../../lib/demo-voice";
import { demoPostRaw } from "../../../lib/demo-content";

// Last 5 posts written for the artisan
export const GET: APIRoute = handle(async ({ locals }) => {
  const b = requireBusiness(locals);
  return json({ posts: await recentPosts(b.id) });
});

// Writes a post for one network and one topic: {network, topic} → {post, posts}
export const POST: APIRoute = handle(async ({ locals, request }) => {
  const b = requireBusiness(locals);
  const input = parsePostRequest(await readJson(request));
  if (!input.ok) return fail(400, "invalid_input", input.hint);
  // Demo: written in advance, no AI call and no limit
  const demo = isDemoAccount(locals.user) ? demoPostRaw(b, input.value.network, input.value.topic) : undefined;
  if (!demo && await rateLimited(b.id)) return fail(429, "rate_limited", "Beaucoup de publications d’un coup. Réessayez dans quelques minutes.");
  const post = await generatePost(b, input.value.network, input.value.topic, demo);
  if (!post) return fail(502, "ai_failed", "La publication n’a pas pu être écrite. Réessayez dans un instant.");
  return json({ post, posts: await recentPosts(b.id) });
});
