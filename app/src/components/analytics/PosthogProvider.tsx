import { useEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";

import { getPosthogConfigFn } from "@/lib/analytics/posthog.functions";

let initPromise: Promise<typeof import("posthog-js").default | null> | null = null;

async function loadPosthog() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const { token, region } = await getPosthogConfigFn();
      if (!token) return null;
      const posthog = (await import("posthog-js")).default;
      posthog.init(token, {
        api_host: region === "eu" ? "https://eu.i.posthog.com" : "https://us.i.posthog.com",
        person_profiles: "identified_only",
        capture_pageview: false,
        capture_pageleave: true,
        autocapture: true,
        disable_session_recording: false,
      });
      posthog.capture("$pageview");
      return posthog;
    } catch {
      return null;
    }
  })();
  return initPromise;
}

/** Loads PostHog in the browser and records a page view on every route change. */
export function PosthogProvider() {
  const router = useRouter();
  const ready = useRef(false);

  useEffect(() => {
    void loadPosthog().then(() => {
      ready.current = true;
    });
  }, []);

  useEffect(() => {
    return router.subscribe("onResolved", (e) => {
      if (!e.fromLocation || e.fromLocation.pathname === e.toLocation.pathname) return;
      void loadPosthog().then((posthog) => posthog?.capture("$pageview"));
    });
  }, [router]);

  return null;
}
