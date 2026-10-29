import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { callAuthed } from "@/lib/auth/client";
import { getWorkspaceFn } from "@/lib/org/org.functions";

type Workspace = Awaited<ReturnType<typeof getWorkspaceFn>>;

interface WorkspaceContextValue {
  workspace: Workspace;
  refetch: () => Promise<unknown>;
  isFetching: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspaceQuery() {
  return useQuery({
    queryKey: ["workspace"],
    queryFn: () => callAuthed(getWorkspaceFn),
  });
}

export function WorkspaceProvider({
  workspace,
  refetch,
  isFetching,
  children,
}: WorkspaceContextValue & { children: ReactNode }) {
  return (
    <WorkspaceContext.Provider value={{ workspace, refetch, isFetching }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
