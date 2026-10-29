import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { callAuthed } from "@/lib/auth/client";
import {
  getAdminOverviewFn,
  retryReceptionistFn,
  setOrgSuspendedFn,
} from "@/lib/admin/admin.functions";

export const Route = createFileRoute("/app/admin")({
  head: () => ({
    meta: [{ title: "Admin — AI Phone Desk" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { workspace } = useWorkspace();
  const q = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => callAuthed(getAdminOverviewFn),
    enabled: workspace.isAdmin,
    refetchInterval: 60000,
  });
  if (!workspace.isAdmin) return <Navigate to="/app" />;

  async function suspend(id: string, suspended: boolean) {
    if (suspended && !confirm("Suspend this account? Its receptionists will stop answering calls."))
      return;
    await callAuthed(setOrgSuspendedFn, { data: { organizationId: id, suspended } });
    toast.success(suspended ? "Account suspended" : "Account restored");
    q.refetch();
  }
  async function retry(id: string) {
    const r = await callAuthed(retryReceptionistFn, { data: { receptionistId: id } });
    if (r.ok) toast.success("Receptionist rebuilt");
    else toast.error(r.error);
    q.refetch();
  }

  const d = q.data;
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Admin"
        description="Every customer, receptionist and number across AI Phone Desk."
      />
      {!d ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Workspaces" value={String(d.stats.organizations)} />
            <StatCard label="Paying customers" value={String(d.stats.paying)} />
            <StatCard label="Monthly revenue" value={`$${d.stats.mrr.toLocaleString()}`} />
            <StatCard label="Extra minutes billed" value={`$${d.stats.overageBilled.toFixed(2)}`} />
            <StatCard label="Live receptionists" value={String(d.stats.liveReceptionists)} />
            <StatCard label="Live numbers" value={String(d.stats.liveNumbers)} />
            <StatCard label="Calls this month" value={String(d.stats.callsThisMonth)} />
            <StatCard label="Minutes this month" value={String(d.stats.minutesThisMonth)} />
          </div>

          <Tabs defaultValue="customers">
            <TabsList>
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="failed">
                Needs attention {d.failed.length > 0 && `(${d.failed.length})`}
              </TabsTrigger>
              <TabsTrigger value="logs">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="customers" className="card-elevated mt-4 overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3">Business</th>
                    <th className="p-3">Plan</th>
                    <th className="p-3">Minutes</th>
                    <th className="p-3">Number</th>
                    <th className="p-3">Joined</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {d.customers.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="p-3">
                        <p className="font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.owner ?? "—"}</p>
                      </td>
                      <td className="p-3">
                        <p>{c.plan}</p>
                        {c.subscription && (
                          <p className="text-xs text-muted-foreground">{c.subscription}</p>
                        )}
                      </td>
                      <td className="p-3">
                        {c.minutesUsed != null ? `${c.minutesUsed} / ${c.includedMinutes}` : "—"}
                      </td>
                      <td className="p-3">{c.liveNumbers.join(", ") || "—"}</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        {c.suspended ? (
                          <Button size="sm" variant="outline" onClick={() => suspend(c.id, false)}>
                            Restore
                          </Button>
                        ) : c.receptionists > 0 ? (
                          <Button size="sm" variant="ghost" onClick={() => suspend(c.id, true)}>
                            Suspend
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabsContent>

            <TabsContent value="failed" className="mt-4 flex flex-col gap-3">
              {d.failed.length === 0 ? (
                <p className="card-elevated p-6 text-center text-sm text-muted-foreground">
                  Nothing needs attention. Every receptionist and number is healthy.
                </p>
              ) : (
                d.failed.map((f) => (
                  <div
                    key={f.id}
                    className="card-elevated flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        <Badge variant="secondary" className="mr-2">
                          {f.kind === "phone" ? "Number" : "Receptionist"}
                        </Badge>
                        {f.label} · <span className="text-muted-foreground">{f.org}</span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{f.message}</p>
                    </div>
                    {f.kind === "receptionist" && (
                      <Button size="sm" onClick={() => retry(f.id)}>
                        Retry
                      </Button>
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="logs" className="card-elevated mt-4 divide-y p-0">
              {d.logs.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <span className="text-foreground">
                    {l.action}
                    <span className="text-muted-foreground"> · {l.org ?? "—"}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(l.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
