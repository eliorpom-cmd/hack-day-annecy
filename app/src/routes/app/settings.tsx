import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { callAuthed } from "@/lib/auth/client";
import { updateOrganizationFn, updateProfileFn } from "@/lib/org/org.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { workspace, refetch } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [orgName, setOrgName] = useState(workspace.organization.name);
  const [profileName, setProfileName] = useState(workspace.profile?.name ?? "");

  const saveOrg = useMutation({
    mutationFn: (name: string) => callAuthed(updateOrganizationFn, { data: { name } }),
    onSuccess: () => {
      toast.success("Business name updated");
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveProfile = useMutation({
    mutationFn: (name: string) => callAuthed(updateProfileFn, { data: { name } }),
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title="Settings" description="Manage your account and organization." />

      <section className="card-elevated space-y-4 p-6">
        <h3 className="eyebrow">Organization</h3>
        <div className="space-y-1.5">
          <Label>Business name</Label>
          <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} maxLength={120} />
        </div>
        <Button onClick={() => saveOrg.mutate(orgName)} disabled={!orgName.trim() || orgName === workspace.organization.name || saveOrg.isPending}>
          {saveOrg.isPending ? "Saving…" : "Save"}
        </Button>
      </section>

      <section className="card-elevated space-y-4 p-6">
        <h3 className="eyebrow">Your profile</h3>
        <div className="space-y-1.5">
          <Label>Full name</Label>
          <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} maxLength={120} />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={workspace.profile?.email ?? ""} disabled />
        </div>
        <Button
          onClick={() => saveProfile.mutate(profileName)}
          disabled={!profileName.trim() || profileName === (workspace.profile?.name ?? "") || saveProfile.isPending}
        >
          {saveProfile.isPending ? "Saving…" : "Save"}
        </Button>
      </section>

      <section className="card-elevated flex items-center justify-between p-6">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">Sign out</h3>
          <p className="text-sm text-muted-foreground">You'll need to sign back in to access your dashboard.</p>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut className="mr-1.5 h-4 w-4" /> Sign out
        </Button>
      </section>
    </div>
  );
}
