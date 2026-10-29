import { Skeleton } from "@/components/ui/skeleton";

export function StatCard({
  label,
  value,
  hint,
  loading,
}: {
  label: string;
  value?: string | number;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="card-elevated p-4">
      <p className="eyebrow">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-16" />
      ) : (
        <p className="mt-1.5 font-display text-2xl font-semibold text-foreground">{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
