import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — AI Phone Desk" },
      {
        name: "description",
        content:
          "How AI Phone Desk collects, uses, and protects your information and your callers' information.",
      },
      { property: "og:title", content: "Privacy Policy — AI Phone Desk" },
      {
        property: "og:description",
        content:
          "How AI Phone Desk collects, uses, and protects your information and your callers' information.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

const EFFECTIVE = "September 25, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <MarketingLayout>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Effective date: {EFFECTIVE}</p>

        <Section title="1. Who we are">
          <p>
            AI Phone Desk ("AI Phone Desk", "we", "us") provides AI receptionist software that
            answers phone calls, books appointments, and manages customer conversations on behalf
            of the businesses that use it ("Customers"). This policy explains what information we
            collect, why, and how it is protected.
          </p>
        </Section>

        <Section title="2. Information we collect">
          <p>
            <strong className="text-foreground">Account information.</strong> When you sign up we
            collect your name, email address, and authentication credentials. If you subscribe, our
            payment processor collects billing details; we never see or store full card numbers.
          </p>
          <p>
            <strong className="text-foreground">Business information.</strong> Content you provide
            or that we gather from your public website at your request (services, hours, pricing,
            staff, FAQs) to configure your receptionist.
          </p>
          <p>
            <strong className="text-foreground">Call data.</strong> When callers phone your AI
            receptionist we process call audio, transcripts, caller phone numbers, and conversation
            metadata (duration, time, outcome) on your behalf. Recordings and transcripts belong to
            you.
          </p>
          <p>
            <strong className="text-foreground">Calendar data.</strong> If you connect a calendar
            (for example Google Calendar), we access availability and create or modify events only
            as needed to provide the booking feature. We do not read event contents unrelated to
            scheduling, and we never share calendar data with third parties.
          </p>
          <p>
            <strong className="text-foreground">Usage and technical data.</strong> Log data, device
            and browser information, and product usage metrics used to operate, secure, and improve
            the service.
          </p>
        </Section>

        <Section title="3. How we use information">
          <ul className="list-disc space-y-2 pl-5">
            <li>Provide, operate, and maintain the service, including answering calls and booking appointments for your business.</li>
            <li>Process payments, manage subscriptions, and prevent fraud.</li>
            <li>Send service-related communications (receipts, security notices, product updates).</li>
            <li>Improve reliability, safety, and performance of the service.</li>
            <li>Comply with legal obligations and enforce our Terms of Service.</li>
          </ul>
          <p>
            We do not sell your personal information or your callers' personal information. We do
            not use your call recordings or transcripts to advertise to you or your callers.
          </p>
        </Section>

        <Section title="4. Your role for caller data">
          <p>
            For call recordings, transcripts, and caller contact details, you (the Customer) are the
            data controller and we act as a processor on your behalf. You are responsible for
            informing your callers that calls may be answered by an AI and may be recorded, where
            required by applicable law (including two-party consent states).
          </p>
        </Section>

        <Section title="5. Service providers">
          <p>
            We use a small number of trusted subprocessors to deliver the service: cloud hosting
            and database infrastructure, voice and language processing, telephony carriers, and
            payment processing. Each is bound by contractual confidentiality and data-protection
            obligations and may only process data to provide their service to us.
          </p>
        </Section>

        <Section title="6. Data retention and deletion">
          <p>
            We retain account and call data while your account is active. You can delete
            conversations, recordings, and business data from your dashboard at any time. When you
            delete your account, we delete or anonymize your data within 30 days, except where
            retention is required by law (for example billing records).
          </p>
        </Section>

        <Section title="7. Security">
          <p>
            We use encryption in transit and at rest, strict access controls, row-level tenant
            isolation, and audit logging. No method of transmission or storage is 100% secure, but
            we work to protect your information and will notify you of any breach affecting your
            data as required by law.
          </p>
        </Section>

        <Section title="8. Your rights">
          <p>
            You may access, correct, export, or delete your personal information from your account
            settings or by contacting us. Depending on your state or country, you may have
            additional rights (for example under CCPA/CPRA or GDPR); we honor those requests for
            all users regardless of location.
          </p>
        </Section>

        <Section title="9. Children">
          <p>
            The service is intended for businesses and is not directed at children under 13. We do
            not knowingly collect personal information from children.
          </p>
        </Section>

        <Section title="10. Changes">
          <p>
            We may update this policy from time to time. Material changes will be announced in the
            product or by email before they take effect. The effective date above shows the latest
            revision.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            Questions about this policy or your data: email{" "}
            <a href="mailto:privacy@ai-phone-desk.com" className="text-primary underline underline-offset-2">
              privacy@ai-phone-desk.com
            </a>
            .
          </p>
        </Section>
      </div>
    </MarketingLayout>
  );
}
