import { createServerFn } from "@tanstack/react-start";

/**
 * Returns the PostHog project token (a public, browser-safe token) and region.
 * The value is stored as a server secret, so it is handed to the browser here.
 */
export const getPosthogConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const token = process.env["POSTHOG_PROJECT_TOKEN"] ?? process.env["POSTHOG_API_KEY"] ?? null;
  const region = (process.env["POSTHOG_REGION"] ?? "us").toLowerCase() === "eu" ? "eu" : "us";
  return { token, region };
});
