import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Authorization headers for calling protected server functions from the browser. */
export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in to continue.");
  return { Authorization: `Bearer ${token}` };
}

/**
 * Call a protected server function with the current session attached.
 * Usage: `await callAuthed(getWorkspaceFn)` or `await callAuthed(saveBusinessFn, { data })`.
 */
export async function callAuthed<TResult>(
  fn: (opts: { headers: Record<string, string> }) => Promise<TResult>,
): Promise<TResult>;
export async function callAuthed<TData, TResult>(
  fn: (opts: { data: TData; headers: Record<string, string> }) => Promise<TResult>,
  opts: { data: TData },
): Promise<TResult>;
export async function callAuthed(fn: (opts: any) => Promise<unknown>, opts?: { data?: unknown }) {
  const headers = await authHeaders();
  return fn({ ...(opts ?? {}), headers });
}

export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return { session, user: session?.user ?? null, loading: session === undefined };
}

export async function getSessionOrNull() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
