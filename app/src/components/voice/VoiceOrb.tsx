import { cn } from "@/lib/utils";

export type OrbState = "idle" | "connecting" | "listening" | "speaking" | "error";

export function VoiceOrb({
  state = "idle",
  size = "lg",
  className,
}: {
  state?: OrbState;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const dims = { sm: "h-12 w-12", md: "h-20 w-20", lg: "h-36 w-36", xl: "h-52 w-52" }[size];
  const active = state === "listening" || state === "speaking";
  return (
    <div className={cn("relative flex items-center justify-center", dims, className)} aria-hidden>
      {active && (
        <>
          <span className="absolute inset-0 rounded-full bg-accent/25 animate-pulse-ring" />
          <span className="absolute inset-0 rounded-full bg-accent/15 animate-pulse-ring [animation-delay:0.8s]" />
        </>
      )}
      {state === "connecting" && <span className="absolute inset-[-6px] rounded-full border-2 border-dashed border-accent/50 animate-spin [animation-duration:3s]" />}
      <div
        className={cn(
          "orb relative h-full w-full rounded-full transition-transform duration-500",
          state === "idle" && "animate-orb",
          state === "speaking" && "scale-105",
          state === "listening" && "scale-100",
          state === "error" && "opacity-60 grayscale",
        )}
      >
        {state === "speaking" && (
          <div className="absolute inset-0 flex items-center justify-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-primary-foreground/80 animate-pulse"
                style={{ height: `${18 + ((i * 7) % 20)}%`, animationDelay: `${i * 120}ms`, animationDuration: "700ms" }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
