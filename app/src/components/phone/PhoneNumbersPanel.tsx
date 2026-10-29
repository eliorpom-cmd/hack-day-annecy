import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone, Search, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { callAuthed } from "@/lib/auth/client";
import {
  assignNumberFn,
  claimNumberFn,
  getPhoneOverviewFn,
  releaseNumberFn,
  searchNumbersFn,
} from "@/lib/telephony/phone.functions";
import { US_STATES } from "@/lib/telephony/us-states";

type Available = {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  provisioning: "Reserving number",
  configuring: "Connecting calls",
  live: "Live",
  error: "Needs attention",
};

const ANY_STATE = "any";

export function PhoneNumbersPanel({ onClaimed }: { onClaimed?: () => void }) {
  const qc = useQueryClient();
  const overview = useQuery({
    queryKey: ["phone-overview"],
    queryFn: () => callAuthed(getPhoneOverviewFn),
  });
  const [areaCode, setAreaCode] = useState("");
  const [state, setState] = useState<string>(ANY_STATE);
  const [type, setType] = useState<"local" | "toll_free">("local");
  const [results, setResults] = useState<Available[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [receptionistId, setReceptionistId] = useState<string>("");

  if (overview.isLoading || !overview.data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }
  const { allowed, numbers, receptionists, planName } = overview.data;
  const ready = receptionists.filter((r) => r.ready);
  const selectedRec = receptionistId || ready[0]?.id || "";

  if (allowed < 1) {
    return (
      <div className="card-elevated flex flex-col gap-3 p-6">
        <Phone className="h-5 w-5 text-accent" />
        <h3 className="font-display text-base font-semibold text-foreground">
          Get a number your customers can call
        </h3>
        <p className="text-sm text-muted-foreground">
          Phone numbers are included on Basic and Pro. You're on {planName} — you can keep testing
          in the browser.
        </p>
        <Button asChild className="self-start">
          <Link to="/app/billing">Choose a plan</Link>
        </Button>
      </div>
    );
  }

  async function search() {
    if (areaCode && !/^\d{3}$/.test(areaCode)) {
      toast.error("Area code should be 3 digits.");
      return;
    }
    setSearching(true);
    try {
      const res = await callAuthed(searchNumbersFn, {
        data: {
          areaCode: areaCode || undefined,
          region: type === "local" && state !== ANY_STATE ? state : undefined,
          type,
        },
      });
      if (res.error) toast.error(res.error === "upgrade" ? "Upgrade to get a number." : res.error);
      setResults(res.numbers);
    } finally {
      setSearching(false);
    }
  }

  async function assign(numberId: string, recId: string) {
    setAssigning(numberId);
    try {
      const res = await callAuthed(assignNumberFn, {
        data: { id: numberId, receptionistId: recId },
      });
      if (res.error) toast.error(res.error);
      else toast.success("Number connected to that receptionist.");
      await qc.invalidateQueries({ queryKey: ["phone-overview"] });
      await qc.invalidateQueries({ queryKey: ["workspace"] });
    } finally {
      setAssigning(null);
    }
  }

  async function claim(n: Available) {
    if (!selectedRec) {
      toast.error("Finish setting up a receptionist first.");
      return;
    }
    setClaiming(n.phoneNumber);
    try {
      const res = await callAuthed(claimNumberFn, {
        data: { phoneNumber: n.phoneNumber, receptionistId: selectedRec },
      });
      if (res.error) toast.error(res.error);
      else {
        toast.success(`${n.friendlyName} is live. Give it a call!`);
        setResults(null);
        onClaimed?.();
      }
      await qc.invalidateQueries({ queryKey: ["phone-overview"] });
      await qc.invalidateQueries({ queryKey: ["workspace"] });
    } finally {
      setClaiming(null);
    }
  }

  async function release(id: string) {
    if (
      !confirm(
        "Release this number? Callers will no longer reach your receptionist on it, and you may not get it back.",
      )
    )
      return;
    const res = await callAuthed(releaseNumberFn, { data: { id } });
    if (res.error) toast.error(res.error);
    else toast.success("Number released.");
    await qc.invalidateQueries({ queryKey: ["phone-overview"] });
  }

  const atLimit = numbers.length >= allowed;

  return (
    <div className="space-y-6">
      {numbers.length > 0 && (
        <div className="space-y-3">
          {numbers.map((n) => (
            <div
              key={n.id}
              className="card-elevated flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div className="flex items-center gap-3">
                {n.status === "live" ? (
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                ) : n.status === "error" ? (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                )}
                <div>
                  <div className="font-display text-lg font-semibold text-foreground">
                    {formatUs(n.phone_number)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {[n.locality, n.region].filter(Boolean).join(", ") || "United States"}
                  </div>
                  {n.status_message && (
                    <div className="mt-1 text-xs text-destructive">{n.status_message}</div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Answered by</span>
                  <Select
                    value={n.receptionist_id ?? ""}
                    disabled={assigning === n.id || ready.length === 0}
                    onValueChange={(v) => assign(n.id, v)}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue
                        placeholder={ready.length ? "Choose receptionist" : "No receptionist ready"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {ready.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Badge variant={n.status === "live" ? "default" : "secondary"}>
                  {STATUS_LABEL[n.status] ?? n.status}
                </Badge>
                {n.status === "live" && (
                  <Button asChild variant="outline" size="sm">
                    <a href={`tel:${n.phone_number}`}>Call it</a>
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => release(n.id)}>
                  Release
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!atLimit && (
        <div className="card-elevated space-y-4 p-6">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">
              Pick your number
            </h3>
            <p className="text-sm text-muted-foreground">
              US numbers only for now. Anyone in the United States can call it — pick the state or
              area code your customers recognise. Your {planName} plan includes {allowed} number.
            </p>
          </div>
          {ready.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Finish setting up your receptionist first, then come back here.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Select value={type} onValueChange={(v) => setType(v as "local" | "toll_free")}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="toll_free">Toll-free</SelectItem>
                  </SelectContent>
                </Select>
                {type === "local" && (
                  <>
                    <Select value={state} onValueChange={setState}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Any state" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value={ANY_STATE}>Any state</SelectItem>
                        {US_STATES.map((s) => (
                          <SelectItem key={s.code} value={s.code}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="w-40"
                      placeholder="Area code, e.g. 312"
                      inputMode="numeric"
                      maxLength={3}
                      value={areaCode}
                      onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, ""))}
                      onKeyDown={(e) => e.key === "Enter" && search()}
                    />
                  </>
                )}
                {ready.length > 1 && (
                  <Select value={selectedRec} onValueChange={setReceptionistId}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Receptionist" />
                    </SelectTrigger>
                    <SelectContent>
                      {ready.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button onClick={search} disabled={searching}>
                  <Search className="mr-1.5 h-4 w-4" />
                  {searching ? "Searching…" : "Find numbers"}
                </Button>
              </div>

              {searching && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))}
                </div>
              )}
              {!searching && results && results.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No numbers found there. Try a nearby area code.
                </p>
              )}
              {!searching && results && results.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {results.map((n) => (
                    <div
                      key={n.phoneNumber}
                      className="flex items-center justify-between rounded-xl border border-border p-3"
                    >
                      <div>
                        <div className="font-medium text-foreground">{n.friendlyName}</div>
                        <div className="text-xs text-muted-foreground">
                          {[n.locality, n.region].filter(Boolean).join(", ") || "United States"}
                        </div>
                      </div>
                      <Button size="sm" disabled={!!claiming} onClick={() => claim(n)}>
                        {claiming === n.phoneNumber ? "Setting up…" : "Claim"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function formatUs(e164: string) {
  const d = e164.replace(/^\+1/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : e164;
}
