import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — AI Phone Desk" },
      {
        name: "description",
        content:
          "The terms that govern your use of AI Phone Desk, including subscriptions, acceptable use, and limitations of liability.",
      },
      { property: "og:title", content: "Terms of Service — AI Phone Desk" },
      {
        property: "og:description",
        content:
          "The terms that govern your use of AI Phone Desk, including subscriptions, acceptable use, and limitations of liability.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

const EFFECTIVE = "September 25, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function TermsPage() {
  return (
    <MarketingLayout>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground">
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Effective date: {EFFECTIVE}</p>

        <Section title="1. Agreement">
          <p>
            These Terms of Service ("Terms") are a binding agreement between you ("you", the
            "Customer") and AI Phone Desk ("we", "us"). By creating an account or using the service,
            you agree to these Terms. If you use the service on behalf of a business, you represent
            that you are authorized to bind that business.
          </p>
        </Section>

        <Section title="2. The service">
          <p>
            AI Phone Desk provides software that answers phone calls and messages using an AI
            receptionist, books appointments, and manages customer conversations on your behalf. The
            AI receptionist speaks only from the business information you provide or approve. We may
            improve, update, or modify features over time; we will not materially reduce the core
            functionality of a paid plan during an active billing period.
          </p>
        </Section>

        <Section title="3. Your responsibilities">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Provide accurate business information and keep it up to date. The receptionist's
              answers are only as good as the information you give it.
            </li>
            <li>
              Comply with all laws applicable to your calls, including call-recording consent laws,
              telemarketing rules (TCPA), and industry regulations (for example HIPAA if you handle
              health information — contact us before using the service for regulated data).
            </li>
            <li>
              Inform your callers where required that calls may be answered by an AI and may be
              recorded.
            </li>
            <li>
              Keep your account credentials confidential. You are responsible for all activity under
              your account.
            </li>
            <li>
              Review appointments, messages, and actions taken by the receptionist. You remain
              responsible for your customer relationships and commitments made to your callers.
            </li>
          </ul>
        </Section>

        <Section title="4. Acceptable use">
          <p>You may not use the service to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Make unsolicited marketing or robocalls, or violate anti-spam or telemarketing laws;
            </li>
            <li>
              Impersonate another person or business, or misrepresent the AI as a human where
              disclosure is required;
            </li>
            <li>
              Process emergency calls — the service is not a replacement for 911 or any emergency
              line;
            </li>
            <li>
              Collect payment card numbers, Social Security numbers, or similarly sensitive data
              through calls;
            </li>
            <li>
              Interfere with, probe, or reverse engineer the service, or resell access without our
              written consent;
            </li>
            <li>Violate any third party's rights or any applicable law.</li>
          </ul>
          <p>
            We may suspend or terminate accounts that violate this section, with notice where
            practicable.
          </p>
        </Section>

        <Section title="5. Subscriptions and billing">
          <p>
            Paid plans are billed in advance on a monthly or annual cycle and renew automatically
            until cancelled. Usage beyond your plan's included minutes is billed at the overage rate
            shown on the pricing page. You can cancel anytime from your dashboard; cancellation
            takes effect at the end of the current billing period and no further charges occur.
            Except where required by law, payments are non-refundable and we do not provide refunds
            or credits for partial periods or unused minutes.
          </p>
          <p>
            Free trials require no credit card. When a trial ends, the service reverts to free-tier
            limits unless you subscribe. We may change prices with at least 30 days' notice; changes
            apply from your next renewal.
          </p>
        </Section>

        <Section title="6. Phone numbers">
          <p>
            Phone numbers provisioned through the service are licensed to you for use with the
            service while your subscription is active. If you cancel, numbers may be released after
            a grace period. You are responsible for all activity on your numbers and for complying
            with carrier and regulatory requirements.
          </p>
        </Section>

        <Section title="7. Your data">
          <p>
            You retain all rights to your business information, call recordings, transcripts, and
            customer data. You grant us a limited license to process that data solely to provide and
            improve the service for you. We do not sell your data. You can export or delete your
            data at any time.
          </p>
        </Section>

        <Section title="8. AI-generated content">
          <p>
            The AI receptionist generates responses in real time. While it is configured to speak
            only from your approved business information, AI systems can occasionally produce
            inaccurate or unexpected statements. You acknowledge this and agree that commitments
            made by the receptionist to your callers are your responsibility as between you and your
            callers. We are not liable for statements made by the receptionist to your callers.
          </p>
        </Section>

        <Section title="9. Service availability">
          <p>
            We target high availability but do not guarantee uninterrupted service. The service
            depends on third-party carriers, voice providers, and calendar providers; outages or
            changes by those providers may affect the service. We are not liable for missed calls,
            missed appointments, or lost business resulting from service interruptions, and your
            sole remedy for extended downtime is a pro-rated service credit on request.
          </p>
        </Section>

        <Section title="10. Disclaimers">
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE". TO THE MAXIMUM EXTENT PERMITTED BY
            LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS
            FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL
            BE ERROR-FREE, THAT EVERY CALL WILL BE ANSWERED, OR THAT THE RECEPTIONIST'S RESPONSES
            WILL ALWAYS BE ACCURATE.
          </p>
        </Section>

        <Section title="11. Limitation of liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, AI PHONE DESK WILL NOT BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
            PROFITS, REVENUE, CUSTOMERS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
            OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE IS LIMITED TO THE AMOUNTS YOU
            PAID US IN THE 12 MONTHS BEFORE THE CLAIM. Some jurisdictions do not allow these limits,
            in which case they apply to the fullest extent permitted.
          </p>
        </Section>

        <Section title="12. Indemnification">
          <p>
            You agree to indemnify and hold us harmless from claims, damages, and expenses
            (including reasonable attorneys' fees) arising from your use of the service, your
            business information, your calls and callers, or your violation of these Terms or
            applicable law.
          </p>
        </Section>

        <Section title="13. Termination">
          <p>
            You may close your account at any time. We may suspend or terminate access for breach of
            these Terms, non-payment, or risk to the service or other users. Sections that by their
            nature should survive (including 7, 8, 10, 11, 12, and 14) survive termination.
          </p>
        </Section>

        <Section title="14. Governing law and disputes">
          <p>
            These Terms are governed by the laws of the State of Delaware, USA, without regard to
            conflict-of-law rules. Any dispute will be resolved by binding individual arbitration,
            and you waive the right to participate in class actions or class-wide arbitration. Small
            claims court remains available for qualifying claims.
          </p>
        </Section>

        <Section title="15. Changes to these Terms">
          <p>
            We may update these Terms from time to time. Material changes will be announced in the
            product or by email at least 14 days before they take effect. Continued use after the
            effective date constitutes acceptance.
          </p>
        </Section>

        <Section title="16. Contact">
          <p>
            Questions about these Terms: email{" "}
            <a
              href="mailto:legal@ai-phone-desk.com"
              className="text-primary underline underline-offset-2"
            >
              legal@ai-phone-desk.com
            </a>
            .
          </p>
        </Section>
      </div>
    </MarketingLayout>
  );
}
