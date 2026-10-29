import { useQuery } from "@tanstack/react-query";
import { callAuthed } from "@/lib/auth/client";
import { getCallDataFn } from "@/lib/calls/calls.functions";

export function useCallData(days = 30) {
  return useQuery({
    queryKey: ["call-data", days],
    queryFn: () => callAuthed(getCallDataFn, { data: { days } }),
    refetchInterval: 60_000,
    staleTime: 20_000,
  });
}

export function fmtDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

export function fmtPhone(p: string | null) {
  if (!p) return "Unknown caller";
  const d = p.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return p;
}

export const outcomeLabel: Record<string, string> = {
  success: "Handled",
  failure: "Needs follow-up",
  unknown: "Unclear",
  error: "Problem",
};
