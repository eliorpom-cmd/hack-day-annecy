import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSession } from "@/lib/auth/client";
import { useWorkspaceQuery, WorkspaceProvider } from "@/components/app/WorkspaceProvider";
import { AppShell } from "@/components/app/AppShell";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function ShellSkeleton() {
  return (
    <div className="flex min-h-svh w-full">
      <div className="hidden w-64 flex-col gap-4 border-r bg-sidebar p-4 md:flex">
        <Skeleton className="h-8 w-32" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="h-14 w-full" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

function AppLayout() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const query = useWorkspaceQuery();

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth", search: { redirect: "/app" } as never });
    }
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!query.data) return;
    const { organization, receptionists } = query.data;
    if (organization.onboarding_completed === false && receptionists.length === 0) {
      navigate({ to: "/onboarding" });
    }
  }, [query.data, navigate]);

  if (loading || !session || query.isLoading || !query.data) {
    return <ShellSkeleton />;
  }

  return (
    <WorkspaceProvider workspace={query.data} refetch={query.refetch} isFetching={query.isFetching}>
      <RoutedShell />
    </WorkspaceProvider>
  );
}

function RoutedShell() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
