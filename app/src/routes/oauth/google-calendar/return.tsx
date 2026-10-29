import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/google-calendar/return")({
  head: () => ({ meta: [{ title: "Connecting Google Calendar — AI Phone Desk" }, { name: "robots", content: "noindex" }] }),
  component: OAuthReturn,
});

function OAuthReturn() {
  const [message, setMessage] = useState("Finishing connection…");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notify = (type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed", code?: string | null) => {
      window.opener?.postMessage({ type, connectorId: "google_calendar", code: code ?? null }, window.location.origin);
      window.close();
    };
    if (params.get("success") !== "true") {
      setMessage(params.get("error") ?? "Google Calendar was not connected.");
      notify("appUserConnectorOAuthFailed");
      return;
    }
    const code = params.get("code");
    if (!code) {
      setMessage("Connection finished without a code.");
      notify("appUserConnectorOAuthFailed");
      return;
    }
    notify("appUserConnectorOAuthComplete", code);
  }, []);
  return <p className="p-8 text-sm text-muted-foreground">{message}</p>;
}
