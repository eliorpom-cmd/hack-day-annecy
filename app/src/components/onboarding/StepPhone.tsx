import { Button } from "@/components/ui/button";
import { PhoneNumbersPanel } from "@/components/phone/PhoneNumbersPanel";

export function StepPhone({ onContinue }: { onContinue: () => void }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-foreground">Add a phone number</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a number and your receptionist starts answering calls on it right away.
      </p>
      <div className="mt-8">
        <PhoneNumbersPanel onClaimed={onContinue} />
      </div>
      <Button variant="ghost" className="mt-6" onClick={onContinue}>
        Skip for now — I'll use the browser test
      </Button>
    </div>
  );
}
