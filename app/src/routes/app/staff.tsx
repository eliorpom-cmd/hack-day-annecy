import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Contact, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { callAuthed } from "@/lib/auth/client";
import { getBusinessFn, saveBusinessFn } from "@/lib/onboarding/onboarding.functions";
import { emptyBusinessProfile, defaultHours, type BusinessProfile, type StaffInput } from "@/lib/business/schema";

export const Route = createFileRoute("/app/staff")({
  component: StaffPage,
});

const emptyMember: StaffInput = { name: "", role: "", phone: "", email: "" };

function StaffPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["business"], queryFn: () => callAuthed(getBusinessFn) });
  const [open, setOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<StaffInput>(emptyMember);

  const save = useMutation({
    mutationFn: (profile: BusinessProfile) => callAuthed(saveBusinessFn, { data: profile }),
    onSuccess: () => {
      toast.success("Team updated");
      queryClient.invalidateQueries({ queryKey: ["business"] });
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (query.isLoading || !query.data) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const profile: BusinessProfile = query.data.profile ?? { ...emptyBusinessProfile(), hours: defaultHours() };
  const staff = profile.staff;

  function openNew() {
    setDraft(emptyMember);
    setEditIndex(null);
    setOpen(true);
  }

  function openEdit(i: number) {
    const member = staff[i];
    if (!member) return;
    setDraft(member);
    setEditIndex(i);
    setOpen(true);
  }

  function remove(i: number) {
    const next = staff.filter((_, idx) => idx !== i);
    save.mutate({ ...profile, staff: next });
  }

  function submit() {
    if (!draft.name.trim()) return;
    const next = [...staff];
    if (editIndex === null) next.push(draft);
    else next[editIndex] = draft;
    save.mutate({ ...profile, staff: next });
    setOpen(false);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader
        title="Staff"
        description="Your receptionist can mention or route callers to your team by name."
        actions={
          <Button onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" /> Add person
          </Button>
        }
      />

      {staff.length === 0 ? (
        <EmptyState
          icon={Contact}
          title="No staff added yet"
          description="Add your team so your receptionist can reference them when talking to callers."
          action={<Button onClick={openNew}>Add person</Button>}
        />
      ) : (
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s, i) => (
                <TableRow key={s.id ?? i}>
                  <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.role || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.phone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.email || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(i)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(i)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editIndex === null ? "Add person" : "Edit person"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Input value={draft.role ?? ""} onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={draft.phone ?? ""} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={draft.email ?? ""} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={!draft.name.trim() || save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
