# AI Phone Desk — Phases 1–3

Foundation, marketing site with live voice demo, accounts, onboarding (website scan + manual), receptionist creation, and browser testing. Phases 4–9 (dashboard depth, billing, phone numbers, calendar, admin, polish) follow in later plans on top of this foundation.

## What you get at the end of this plan

A visitor can land on the site, talk to a live AI receptionist demo, sign up, paste a website (or fill a short wizard), review what was found, pick a voice, and talk to their own newly created receptionist in the browser — with a first dashboard page showing it.

## Product surfaces

### Marketing site
- `/` — hero ("Your AI receptionist. Always ready to answer."), interactive voice demo card with animated orb, How it works, feature grid, industries strip, analytics preview, pricing teaser, FAQ, final CTA.
- `/pricing` — Free / Basic / Pro / Business cards, monthly/annual toggle, recovered-revenue calculator labeled "Estimate only". Plan values come from the database `plans` table, not hard-coded.
- `/features`, `/industries`, `/industries/{plumbers,salons,dentists,law-firms,real-estate,home-services}` — SEO pages with unique metadata.
- Free demo: a dedicated demo agent with no customer data, 3-minute session cap, per-IP/session rate limit enforced server-side.

### Accounts
- `/auth` — email/password, magic link, Google sign-in.
- On first sign-in: create organization + membership, then redirect into onboarding.

### Onboarding (`/onboarding`)
Progress: Business → Receptionist → Test → Phone → Live (Phone/Live shown as upcoming, gated to a future plan).
1. Choose: Scan my website / Enter information manually.
2. Scan: staged progress ("Scanning your website…", "Reading services…", "Checking opening hours…") polling a background job. Manual: guided multi-step wizard (business, hours, services, FAQs, staff, rules, personality, greeting).
3. Review screen "Here's what we found": editable cards for Business, Services, Hours, Location, Contact, FAQs, Booking, Staff.
4. Voice + greeting: choose from admin-configured voices, edit generated first message, preview it.
5. Creation progress with explicit states (✓ Business info, ✓ Knowledge, ✓ Voice, ✓ AI agent, ○ Phone number).
6. "Your receptionist is ready": orb + "Talk to your receptionist" on the left; name, voice, greeting, business, languages on the right. Clear "Want customers to call it? Activate your business number — Upgrade" card (upgrade wired in the billing phase).

### First dashboard (`/app`)
- Shell with sidebar (Home, Receptionists, Analytics, Conversations, Business, Settings — later pages show polished empty/coming-soon states), mobile drawer, plan badge.
- Home card: receptionist status, Test / Edit buttons, zero-state stats.
- Receptionists list + basic receptionist edit (name, greeting, voice, personality, language, knowledge review).

## Design system
Original identity for AI Phone Desk (no brand kit supplied): calm, premium, high whitespace. Deep ink-navy foreground, warm off-white background, a single restrained accent (teal-green used for "live"/primary actions), soft card shadows, thin borders, large radii. Typography: a geometric display face for headlines with a clean humanist body face (loaded via link tag). All colors, radii, shadows, and type scales defined as tokens in `src/styles.css`; no hard-coded color utilities in components. Light mode first, dark tokens defined.

## Technical details

Stack: this project runs on TanStack Start (React 19, Vite, Tailwind v4, shadcn) rather than Next.js — same architecture (server functions instead of server actions, server routes for webhooks), deployed on Lovable hosting with Lovable Cloud (Postgres, Auth, Storage). Lovable Cloud will be enabled at the start of the build.

Integrations
- ElevenLabs via the ElevenLabs connector (key server-side only). `src/lib/elevenlabs/{client,agents,phoneNumbers,conversations,webhooks}.server.ts` implementing `ElevenLabsService`; request schemas verified against current Agents API docs before coding. Browser demo uses `@elevenlabs/react` with short-lived conversation tokens minted server-side.
- Extraction and prompt generation via Lovable AI Gateway (structured JSON output into the normalized `BusinessProfile` schema; structured agent instruction template — never raw page dumps).
- Website crawler: server-side fetch of up to 20 pages (home, services, about, contact, pricing, FAQ, booking), robots.txt respected, depth-limited, URL-deduped, boilerplate stripped, runs as a background job with status polling.
- `DEMO_MODE` env flag: mock ElevenLabs provider behind the same interface; real provider when off.

Database (this phase): `profiles`, `organizations`, `organization_members`, `user_roles` (separate table, `has_role()` function), `business_profiles`, `business_hours`, `services`, `staff`, `knowledge_sources`, `knowledge_documents`, `receptionists` (status state machine: draft → scanning → review_required → creating_agent → agent_ready → … → error), `receptionist_settings`, `voices`, `plans`, `feature_flags`, `scan_jobs`, `demo_sessions`, `audit_logs`. RLS on every table with tenant scoped via membership; explicit grants; organization_id always derived from the session. Remaining tables (phone_numbers, conversations, appointments, subscriptions, usage, billing_events, integrations) are added in their phases.

Seed migration: demo org "Half Price Roof LLC" with receptionist, 5 services, 5 staff, admin-configured voices (Jason, Ms. Walker, …), 4 plans, feature flags.

Server layer: `*.functions.ts` server functions for onboarding/scan, create-receptionist, receptionists CRUD, demo token, voices, plans; entitlements service (`entitlements.can(...)`) and feature-flag service stubbed with plan data now, enforced fully in the billing phase. Zod validation on all inputs; friendly errors with internal error IDs; structured logs with request/org/user IDs.

Setup that will need you during the build: approve enabling Lovable Cloud, connect your ElevenLabs account when prompted, and turn on Google sign-in (handled via the managed provider).

## Out of scope for this plan (next plans)
Conversations/transcripts/recordings sync, analytics, Stripe billing and entitlement enforcement, Twilio phone provisioning and go-live, calendar/booking page, AI assistant panel, admin dashboard, full CRM.
