# AlloPro: an AI phone answering service for tradespeople

Built in one day at **Hacktoberfest Hack Day Annecy** (October 29, 2026) by Elior, Maxime and Mathieu.

Plumbers, electricians and other tradespeople miss calls all day: they are on a ladder, under a sink, driving. Each missed call is a lost job, and ads are wasted money if nobody picks up. AlloPro answers those calls in the artisan's name, books the job in their calendar, and sends them a WhatsApp summary a few seconds after the caller hangs up.

**Live demo:** https://hack-day-annecy.eliorpom-0bc.workers.dev ("Voir la démo" opens a pre-filled account, "Essayer la configuration" runs the setup on a fake plumber's website).

## What it does

1. **Setup in about 2 minutes.** The artisan gives their website; the app reads it (services, prices, hours, area) and asks only the questions the site does not answer. They pick a voice and get a phone number.
2. **A caller rings the number.** A voice agent answers in French, answers questions from the artisan's own documentation (prices only if the artisan wrote them, never invented), and offers two free slots from the calendar. The caller picks one; the agent repeats day, time and address once, then hangs up.
3. **The artisan gets a WhatsApp message** with the priority (urgent, priority, normal), what the client needs, the address, the booked slot and a link to the call page.
4. **The web app** lists every call (with a "Rendez-vous pris" tag when a slot was booked) and shows a week calendar where the latest booking stands out.

Also in the app: AI generators for a simple website, a Google Business Profile, social posts and Google Ads, all written from the artisan's data.

## How it works

```
Caller ──► Twilio number ──► Cloudflare Worker ──► ElevenLabs voice agent
                               │  (picks the agent, passes the caller's number
                               │   and the two free slots as call variables)
                               ▼
              ElevenLabs post-call webhook (signed) ──► Worker
                               │  saves the call, the client and the booking (D1)
                               ▼
                  WhatsApp outbox ──► relay on a Mac (Baileys) ──► artisan's phone
                               (falls back to SMS through Twilio)
```

- **One Cloudflare Worker** serves the Astro site and the API, runs the Twilio and ElevenLabs webhooks and a weekly cron (Monday recap e-mail).
- **D1 (SQLite)** stores businesses, calls, clients, appointments and the WhatsApp queue. Migrations are in `web/migrations/`.
- **ElevenLabs Conversational AI** runs the voice agent. The app builds the agent's prompt from the artisan's data (`web/src/lib/prompt.ts`) and extracts structured fields after each call (name, need, urgency, booked slot).
- **WhatsApp relay** (`relay-whatsapp/`): a small Node process polls the Worker's outbox every 2 s and sends messages from a WhatsApp account, with a backup mode that only sends what the main relay missed.

## Tech stack

Cloudflare Workers, D1, Workers AI · Astro 7 (server rendering) · Tailwind CSS 4 · TypeScript · ElevenLabs Conversational AI · Twilio Voice and Messaging · Baileys (WhatsApp) · `node --test`

## Repository

| Path | What is inside |
|---|---|
| `web/` | The app: pages (`src/pages`), API routes (`src/pages/api`), logic (`src/lib`), tests (`test/`) |
| `relay-whatsapp/` | The WhatsApp relay and its backup launcher |
| `etude-marche/` | Market study of trades around Annecy (in French) |
| `docs/` | Demo script, call-flow diagram for the pitch, team notes |
| `DESIGN.md`, `COPY.md` | Design system and writing rules of the interface |
| `PROJET.md` | Full spec and API contract (in French) |

## Run it locally

Requires Node 22.23 or later and a Cloudflare account (the website reader uses Workers AI).

```sh
cd web
npm install
cp .dev.vars.example .dev.vars    # then add your ElevenLabs and Twilio keys
npm run db:local                  # local D1 database with demo data
npm run dev                       # http://localhost:4321
npm test                          # unit and API tests
```

Without keys, the app runs with demo data and pre-written AI answers; real calls need the ElevenLabs and Twilio keys.

## Team

- **Elior**: product design (web and mobile), development, testing
- **Maxime**: product management, pitch and demo script
- **Mathieu**: user interview with a plumber, ElevenLabs and Twilio setup

The interface is in French: the first users are tradespeople in Haute-Savoie.

## License

Copyright © 2026 Elior, Maxime and Mathieu. All rights reserved. The code is public for the hackathon judging; see [LICENSE](LICENSE).
