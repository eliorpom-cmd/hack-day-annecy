import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const ONBOARDING_STEPS = [
  { key: "business", label: "Business" },
  { key: "receptionist", label: "Receptionist" },
  { key: "test", label: "Test" },
  { key: "phone", label: "Phone" },
  { key: "live", label: "Live" },
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"];

export function OnboardingProgress({ current }: { current: OnboardingStepKey }) {
  const idx = ONBOARDING_STEPS.findIndex((s) => s.key === current);

  return (
    <div>
      {/* Mobile: compact */}
      <p className="text-sm font-medium text-muted-foreground sm:hidden">
        Step {idx + 1} of {ONBOARDING_STEPS.length} · {ONBOARDING_STEPS[idx]?.label}
      </p>

      {/* Desktop: full steps */}
      <ol className="hidden items-center gap-2 sm:flex">
        {ONBOARDING_STEPS.map((step, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <li key={step.key} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                    done && "bg-accent text-accent-foreground",
                    active && "bg-primary text-primary-foreground",
                    !done && !active && "bg-secondary text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={cn("text-sm", active ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {step.label}
                </span>
              </div>
              {i < ONBOARDING_STEPS.length - 1 && <span className="h-px w-8 bg-border" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
