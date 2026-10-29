import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { callAuthed } from "@/lib/auth/client";
import { getBusinessFn } from "@/lib/onboarding/onboarding.functions";
import { getTestTokenFn } from "@/lib/receptionist/receptionist.functions";
import { Button } from "@/components/ui/button";
import { VoiceSession } from "@/components/voice/VoiceSession";

export function StepTest({
  receptionistId,
  services,
  onContinue,
  onBack,
}: {
  receptionistId: string | null;
  services: { name: string }[];
  onContinue: () => void;
  onBack: () => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([
    "What are your hours?",
    "Can I book an appointment?",
  ]);

  useEffect(() => {
    let cancelled = false;
    callAuthed(getBusinessFn)
      .then(({ profile }) => {
        if (cancelled || !profile) return;
        const serviceQuestions = (profile.services ?? [])
          .slice(0, 2)
          .map((s) => `Do you offer ${s.name}?`);
        setSuggestions([...serviceQuestions, "What are your hours?", "Can I book an appointment?"]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const id = receptionistId;

  return (
    <div className="text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-accent" />
      <h1 className="mt-4 font-display text-2xl font-semibold text-foreground">
        Your receptionist is ready
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Give it a try — ask it something a caller might ask. Free test · 1 minute.
      </p>

      <div className="card-elevated mx-auto mt-8 max-w-lg p-8">
        {id ? (
          <VoiceSession
            getToken={() => callAuthed(getTestTokenFn, { data: { id } })}
            startLabel="Talk to your receptionist"
            suggestions={suggestions}
            maxSeconds={60}
            orbSize="lg"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            We couldn't find your receptionist. Go back and try again.
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Button size="lg" onClick={onContinue}>
          Continue
        </Button>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Adjust greeting or voice
        </button>
      </div>
    </div>
  );
}
