import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessProfileForm } from "@/components/business/BusinessProfileForm";
import { callAuthed } from "@/lib/auth/client";
import { getBusinessFn, saveBusinessFn } from "@/lib/onboarding/onboarding.functions";
import { startScanFn, advanceScanFn } from "@/lib/onboarding/onboarding.functions";
import { emptyBusinessProfile, defaultHours, type BusinessProfile } from "@/lib/business/schema";

export const Route = createFileRoute("/app/business")({
  component: BusinessPage,
});

type ScanState = {
  stage: string;
  progress: number;
  status: string;
  error?: string | null;
  profile?: BusinessProfile | null;
};

function BusinessPage() {
  const queryClient = useQueryClient();
  const [formKey, setFormKey] = useState(0);
  const [pending, setPending] = useState<BusinessProfile | null>(null);
  const [scan, setScan] = useState<ScanState | null>(null);
  const [scanning, setScanning] = useState(false);

  const query = useQuery({ queryKey: ["business"], queryFn: () => callAuthed(getBusinessFn) });

  const save = useMutation({
    mutationFn: (values: BusinessProfile) => callAuthed(saveBusinessFn, { data: values }),
    onSuccess: () => {
      toast.success("Business details saved");
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      queryClient.invalidateQueries({ queryKey: ["business"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function rescan(website: string) {
    setScanning(true);
    setScan({ stage: "Starting scan…", progress: 5, status: "crawling" });
    try {
      const { jobId } = await callAuthed(startScanFn, { data: { url: website } });
      for (;;) {
        const res = await callAuthed(advanceScanFn, { data: { jobId } });
        setScan({ stage: res.stage, progress: res.progress, status: res.status, error: res.error, profile: res.profile });
        if (res.status === "completed" || res.status === "failed") break;
        await new Promise((r) => setTimeout(r, 1200));
      }
    } catch (e) {
      setScan({ stage: "Scan failed", progress: 0, status: "failed", error: e instanceof Error ? e.message : "We couldn't scan that website." });
    } finally {
      setScanning(false);
    }
  }

  if (query.isLoading || !query.data) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const initial: BusinessProfile = pending ?? query.data.profile ?? { ...emptyBusinessProfile(), hours: defaultHours() };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Business"
        description="Your receptionist is updated automatically after you save."
      />

      {query.data.profile?.website && (
        <div className="card-elevated flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">Knowledge sources</h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Globe className="h-3.5 w-3.5" /> {query.data.profile.website}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => rescan(query.data.profile!.website!)} disabled={scanning}>
            <RotateCw className={`mr-1.5 h-3.5 w-3.5 ${scanning ? "animate-spin" : ""}`} /> Rescan website
          </Button>
        </div>
      )}

      {scan && (
        <div className="card-elevated space-y-3 p-5">
          <p className="text-sm font-medium text-foreground">{scan.stage}</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${scan.progress}%` }} />
          </div>
          {scan.status === "failed" && <p className="text-sm text-destructive">{scan.error ?? "Something went wrong scanning that website."}</p>}
          {scan.status === "completed" && scan.profile && (
            <Button
              size="sm"
              onClick={() => {
                setPending(scan.profile!);
                setFormKey((k) => k + 1);
                setScan(null);
                toast.success("Applied. Review and save below.");
              }}
            >
              Apply what we found
            </Button>
          )}
        </div>
      )}

      <BusinessProfileForm
        key={formKey}
        initial={initial}
        submitLabel="Save changes"
        onSubmit={async (values) => {
          await save.mutateAsync(values);
          setPending(values);
        }}
      />
    </div>
  );
}
