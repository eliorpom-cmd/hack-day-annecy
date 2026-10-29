// Worker entry: Astro serves pages and API; the cron sends the weekly recap.
import astro from "@astrojs/cloudflare/entrypoints/server";

export default {
  fetch: astro.fetch,
  async scheduled(_controller: ScheduledController, _env: unknown, ctx: ExecutionContext) {
    // Task 09: weekly recap e-mail (src/lib/recap.ts) plugs in here
    const { sendWeeklyRecaps } = await import("./lib/recap");
    ctx.waitUntil(sendWeeklyRecaps());
  },
};
