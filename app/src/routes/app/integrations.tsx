import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/app/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { callAuthed } from "@/lib/auth/client";
import { getCalendarOverviewFn } from "@/lib/calendar/calendar.functions";

export const Route = createFileRoute("/app/integrations")({
  head: () => ({ meta: [{ title: "Integrations — AI Phone Desk" }] }),
  component: IntegrationsPage,
});

const COMING_SOON = [
  { name: "Outlook", description: "Sync appointments with Outlook calendar and contacts." },
  { name: "Calendly", description: "Offer your Calendly booking links during calls." },
  {
    name: "Cal.com",
    description: "Let your receptionist book directly into your Cal.com availability.",
  },
  { name: "HubSpot", description: "Log calls and new contacts to your HubSpot CRM." },
  { name: "Zapier", description: "Connect your receptionist to thousands of other apps." },
];

function IntegrationsPage() {
  const cal = useQuery({
    queryKey: ["calendar-overview"],
    queryFn: () => callAuthed(getCalendarOverviewFn),
  });
  const google = cal.data?.google;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Integrations"
        description="Connect your calendar and other tools. More integrations are on the way."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card-elevated flex flex-col gap-3 p-5 ring-1 ring-accent/30">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold text-foreground">
              Google Calendar
            </h3>
            {cal.isLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : google?.reconnectRequired ? (
              <Badge variant="destructive">Reconnect needed</Badge>
            ) : google ? (
              <Badge className="bg-accent/15 text-accent hover:bg-accent/15">Connected</Badge>
            ) : (
              <Badge variant="secondary">Not connected</Badge>
            )}
          </div>
          <p className="flex-1 text-sm text-muted-foreground">
            {google
              ? `Your receptionist checks open times and books calls into ${google.email ?? "your calendar"}.`
              : "Your receptionist checks your real open times and books appointments straight into your calendar."}
          </p>
          <Button
            asChild
            size="sm"
            variant={google && !google.reconnectRequired ? "outline" : "default"}
          >
            <Link to="/app/calendar">
              {google
                ? google.reconnectRequired
                  ? "Reconnect"
                  : "Manage"
                : "Connect Google Calendar"}
            </Link>
          </Button>
        </div>
        {COMING_SOON.map((i) => (
          <div key={i.name} className="card-elevated flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-semibold text-foreground">{i.name}</h3>
              <Badge variant="secondary">Coming soon</Badge>
            </div>
            <p className="flex-1 text-sm text-muted-foreground">{i.description}</p>
            <Button variant="outline" size="sm" disabled>
              Coming soon
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
