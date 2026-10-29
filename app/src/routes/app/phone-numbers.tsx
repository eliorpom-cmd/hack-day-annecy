import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { PhoneNumbersPanel } from "@/components/phone/PhoneNumbersPanel";

export const Route = createFileRoute("/app/phone-numbers")({
  head: () => ({
    meta: [
      { title: "Phone numbers — AI Phone Desk" },
      {
        name: "description",
        content: "Claim a US phone number and let your receptionist answer calls.",
      },
      { property: "og:title", content: "Phone numbers — AI Phone Desk" },
      {
        property: "og:description",
        content: "Claim a US phone number and let your receptionist answer calls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PhoneNumbersPage,
});

function PhoneNumbersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Phone numbers"
        description="Claim a number and your receptionist starts answering calls right away."
      />
      <PhoneNumbersPanel />
    </div>
  );
}
