# Receptionist AI

You are a senior SaaS product engineer, product designer, UX designer, backend architect and AI voice infrastructure engineer.

Build a production-ready multi-tenant SaaS platform that provides AI receptionists for small and medium-sized businesses.

IMPORTANT:

This is NOT a simple landing page.

Build the complete product:

- marketing website

- authentication

- onboarding

- AI receptionist creation

- website scanning

- knowledge extraction

- ElevenLabs agent provisioning

- live browser demo

- phone-number provisioning

- dashboard

- receptionist management

- conversations

- transcripts

- call recordings

- call summaries

- analytics

- calendar/booking infrastructure

- business settings

- billing

- subscription management

- usage tracking

- admin dashboard

- responsive mobile experience

The product should feel like a polished modern SaaS product that could compete with ElevenLabs Reception, Retell, and other AI receptionist platforms.

Do NOT build a generic AI dashboard.

The central product is:

"Give us your business. We'll create an AI receptionist that answers your calls."

==================================================

1. PRODUCT CONCEPT

==================================================

The product allows a business owner to create an AI receptionist in a few minutes.

The user has two onboarding options:

OPTION A — SCAN WEBSITE

The user pastes their business website URL.

The platform:

1. crawls the website

2. extracts:

   - business name

   - description

   - address

   - phone number

   - email

   - opening hours

   - services

   - service descriptions

   - pricing

   - FAQs

   - booking information

   - staff information

   - location information

   - policies

   - useful customer-facing information

3. cleans and structures the content

4. presents the extracted information to the user

5. lets the user edit/correct it

6. generates a receptionist configuration

7. creates the ElevenLabs agent

8. configures the agent's voice

9. makes the receptionist immediately available for browser testing

OPTION B — ENTER INFORMATION MANUALLY

If the user doesn't have a website, provide a guided wizard where they enter:

- business name

- industry

- description

- address

- phone

- email

- opening hours

- services

- pricing

- FAQs

- staff

- booking rules

- cancellation rules

- transfer rules

- emergency rules

- personality

- language

- greeting

The goal is to make onboarding take less than 5 minutes.

==================================================

2. PRODUCT POSITIONING

==================================================

The product should be positioned around:

"Your AI receptionist. Ready in minutes."

Core promise:

- Answer every call

- Never miss a customer

- Book appointments

- Answer questions

- Take messages

- Route important calls

- Work after hours

- Speak naturally

- Work in multiple languages

- Give business owners complete visibility

Avoid positioning it as a technical AI-agent builder.

The customer should NOT need to understand:

- LLMs

- prompts

- APIs

- RAG

- embeddings

- webhooks

- telephony

- SIP

- agent orchestration

The platform abstracts all of this.

==================================================

3. BRAND / DESIGN

==================================================

Use the attached screenshots as PRODUCT UX REFERENCES.

They show the interaction patterns and information architecture of modern AI receptionist products.

Do NOT literally copy proprietary logos, trademarks, illustrations, exact branding or source code.

Reproduce the PRODUCT EXPERIENCE and UX patterns, but create an original visual identity using the supplied brand kit.

The visual language should be:

- premium

- minimal

- modern

- calm

- trustworthy

- extremely clean

- SaaS

- high whitespace

- subtle gradients

- rounded cards

- thin borders

- excellent typography

- strong hierarchy

- restrained use of color

The product should feel closer to:

- modern ElevenLabs

- Linear

- Stripe

- premium AI SaaS

than a traditional call-center dashboard.

Use the provided brand kit wherever available.

Create a centralized design-token system:

COLORS

- background

- foreground

- muted foreground

- primary

- primary foreground

- secondary

- card

- border

- success

- warning

- destructive

TYPOGRAPHY

- display

- heading

- body

- small

- label

RADIUS

- sm

- md

- lg

- xl

SHADOWS

- subtle

- card

- modal

Do not scatter hard-coded colors throughout the codebase.

==================================================

4. TECH STACK

==================================================

Preferred stack:

Frontend:

- Next.js

- React

- TypeScript

- Tailwind CSS

- shadcn/ui or equivalent high-quality component system

Backend:

- Next.js server routes / server actions

OR

- Supabase Edge Functions where appropriate

Database:

- Supabase PostgreSQL

Authentication:

- Supabase Auth

Authorization:

- PostgreSQL Row Level Security

Storage:

- Supabase Storage

Payments:

- Stripe

Voice / AI:

- ElevenLabs Agents API

Telephony:

- Twilio initially

Architecture must allow Telnyx/SIP to be added later without rewriting the product.

Deployment:

- Vercel

- Supabase

Use environment variables for all secrets.

NEVER expose:

- ElevenLabs API key

- Stripe secret key

- Twilio auth token

- Supabase service role key

to the browser.

==================================================

5. MULTI-TENANT ARCHITECTURE

==================================================

Every user belongs to an organization/business.

Database hierarchy:

User

  ↓

Organization

  ↓

Receptionist

  ↓

Agent

  ↓

Phone Number

  ↓

Conversations

  ↓

Call Events

A user can eventually belong to multiple organizations.

All business data must be tenant-isolated.

Implement Row Level Security.

Never trust organization_id supplied by the client.

Derive tenant identity from authenticated session.

==================================================

6. DATABASE

==================================================

Create these tables.

users

- id

- email

- name

- avatar_url

- created_at

- updated_at

organizations

- id

- owner_id

- name

- slug

- industry

- timezone

- country

- created_at

- updated_at

organization_members

- id

- organization_id

- user_id

- role

- created_at

business_profiles

- id

- organization_id

- business_name

- description

- address

- city

- state

- postal_code

- country

- phone

- email

- website

- timezone

- created_at

- updated_at

business_hours

- id

- business_profile_id

- day_of_week

- enabled

- open_time

- close_time

services

- id

- organization_id

- name

- description

- duration_minutes

- price

- currency

- active

- created_at

- updated_at

staff

- id

- organization_id

- name

- role

- email

- phone

- calendar_id

- active

knowledge_sources

- id

- organization_id

- type

- url

- title

- content

- status

- last_synced_at

- created_at

knowledge_documents

- id

- organization_id

- source_id

- title

- content

- metadata

- created_at

- updated_at

receptionists

- id

- organization_id

- name

- status

- elevenlabs_agent_id

- elevenlabs_phone_number_id

- voice_id

- language

- greeting

- personality

- system_prompt

- created_at

- updated_at

receptionist_settings

- id

- receptionist_id

- answering_mode

- after_hours_enabled

- appointment_booking_enabled

- call_transfer_enabled

- voicemail_enabled

- spam_filter_enabled

- recording_enabled

- transcription_enabled

- multilingual_enabled

- max_call_duration

- created_at

- updated_at

phone_numbers

- id

- organization_id

- receptionist_id

- provider

- provider_number_id

- phone_number

- country

- area_code

- status

- monthly_cost

- created_at

conversations

- id

- organization_id

- receptionist_id

- elevenlabs_conversation_id

- phone_number_id

- caller_number

- direction

- status

- started_at

- ended_at

- duration_seconds

- transcript

- summary

- outcome

- successful

- recording_available

- created_at

appointments

- id

- organization_id

- receptionist_id

- customer_name

- customer_phone

- customer_email

- service_id

- staff_id

- calendar_event_id

- starts_at

- ends_at

- status

- created_at

subscriptions

- id

- organization_id

- stripe_customer_id

- stripe_subscription_id

- stripe_price_id

- plan

- status

- current_period_start

- current_period_end

- cancel_at_period_end

- created_at

- updated_at

usage

- id

- organization_id

- period_start

- period_end

- minutes_used

- browser_demo_minutes

- phone_minutes

- overage_minutes

- created_at

- updated_at

billing_events

- id

- organization_id

- stripe_event_id

- event_type

- payload

- created_at

integrations

- id

- organization_id

- type

- provider

- credentials_encrypted

- configuration

- status

- created_at

- updated_at

audit_logs

- id

- organization_id

- user_id

- action

- resource_type

- resource_id

- metadata

- created_at

==================================================

7. LANDING PAGE

==================================================

Build a premium conversion-focused landing page.

Hero:

Eyebrow:

AI RECEPTIONIST

Headline:

"Your AI receptionist.

Always ready to answer."

Subheadline:

"Answer calls, book appointments, and help your customers 24/7 — without hiring another receptionist."

Primary CTA:

"Create your receptionist"

Secondary CTA:

"Talk to the AI"

The "Talk to the AI" CTA should launch an actual browser voice conversation.

This is extremely important.

The user should be able to experience the product BEFORE creating an account.

==================================================

8. FREE INTERACTIVE DEMO

==================================================

Build an interactive AI receptionist demo directly into the landing page.

Example UI:

┌───────────────────────────────────────┐

│                                       │

│       Your AI Receptionist            │

│                                       │

│        [ animated voice orb ]         │

│                                       │

│       "Hi, how can I help?"           │

│                                       │

│       [ Start conversation ]          │

│                                       │

│       Try asking about:               │

│       • opening hours                 │

│       • services                      │

│       • appointments                  │

│                                       │

└───────────────────────────────────────┘

Use ElevenLabs browser conversation technology.

Create a dedicated DEMO agent.

The demo agent must NEVER have access to a customer's private data.

Limit free demo usage to prevent abuse.

Suggested limits:

- 3 minutes per anonymous session

- rate limiting by IP/session

- optionally require email after several sessions

The goal is:

Visitor → hears the AI → understands the product → signs up.

==================================================

9. SIGNUP

==================================================

Authentication options:

- email/password

- magic link

- Google OAuth

After signup:

If no organization exists:

create organization.

Then immediately launch onboarding.

==================================================

10. ONBOARDING

==================================================

The onboarding should visually resemble a high-end AI product setup wizard.

Step 1:

"Let's get your receptionist live"

Two large cards:

SCAN MY WEBSITE

"Paste your website and we'll build your receptionist automatically."

ENTER INFORMATION MANUALLY

"Tell us about your business and we'll guide you through setup."

Show progress indicator.

==================================================

11. WEBSITE SCANNER

==================================================

When the user enters:

https://example.com

show:

"Scanning your website..."

Animated progress.

Then:

"Finding business information..."

"Reading services..."

"Checking opening hours..."

"Finding contact information..."

"Preparing your receptionist..."

The scanner should extract structured business data.

Create a normalized BusinessProfile JSON object.

Example:

{

  "business_name": "",

  "description": "",

  "industry": "",

  "address": "",

  "phone": "",

  "email": "",

  "website": "",

  "hours": [],

  "services": [],

  "pricing": [],

  "faqs": [],

  "staff": [],

  "booking_url": ""

}

Do NOT blindly trust scraped content.

Show the user everything extracted before publishing the agent.

==================================================

12. BUSINESS REVIEW SCREEN

==================================================

After scanning:

"Here's what we found"

Cards:

Business

Services

Opening hours

Location

Contact

FAQs

Booking

Staff

Each card has:

Edit

Allow users to correct information.

Add:

"Looks good — create my receptionist"

==================================================

13. AI RECEPTIONIST GENERATION

==================================================

Once the user approves the business information:

Generate an AI receptionist configuration.

The configuration should include:

Identity:

- name

- business name

Voice:

- ElevenLabs voice ID

Language:

- primary language

- supported languages

Greeting:

- generated from business name

Personality:

- professional

- warm

- concise

- helpful

Knowledge:

- business information

- services

- prices

- hours

- FAQs

- policies

Rules:

- never invent information

- never promise unavailable appointments

- never invent pricing

- never claim an action happened if it did not

- escalate when uncertain

- ask clarifying questions

- protect customer privacy

Call handling:

- answer questions

- take messages

- book appointments

- reschedule

- cancel

- transfer

- collect caller information

==================================================

14. ELEVENLABS INTEGRATION

==================================================

Use the ElevenLabs Agents API as the voice/agent engine.

Create an abstraction:

ElevenLabsService

Methods:

createAgent()

updateAgent()

deleteAgent()

getAgent()

listAgents()

createPhoneNumber()

importPhoneNumber()

assignPhoneNumber()

removePhoneNumber()

listConversations()

getConversation()

getConversationSummary()

getConversationAudio()

createWebhook()

The ElevenLabs API key must only exist server-side.

Environment:

ELEVENLABS_API_KEY

Do not hard-code it.

Do not expose it to frontend JavaScript.

The backend should create the ElevenLabs agent based on the customer's configuration.

Store:

elevenlabs_agent_id

in the receptionist table.

==================================================

15. VOICE CONFIGURATION

==================================================

Create a voice selector.

Initially support a configured set of voices from the platform owner's ElevenLabs account.

Admin can configure:

voice name

voice ID

language

gender

description

recommended industries

active/inactive

Example:

Jason

Calm, conversational, reassuring

Ms. Walker

Warm, professional, reassuring

etc.

Do NOT expose arbitrary ElevenLabs voice management to normal customers in the MVP.

The platform owner controls available voices.

==================================================

16. FIRST MESSAGE

==================================================

Generate a default first message.

Example:

"Hi! Thanks for calling {{business_name}}. How can I help you today?"

The business owner can edit it.

Preview it in the voice demo.

==================================================

17. LIVE TEST EXPERIENCE

==================================================

After the receptionist is generated, immediately show:

"Your receptionist is ready."

Left side:

Large animated voice orb.

Phone number if available.

Button:

"Talk to your receptionist"

Right side:

Agent name

Voice

Greeting

Business

Languages

Allow text and browser voice testing.

The user should be able to test:

"What time do you close?"

"What services do you offer?"

"How much does X cost?"

"Can I book tomorrow?"

"Where are you located?"

==================================================

18. PHONE NUMBER

==================================================

Phone number is a PREMIUM capability.

Free users can:

- test via browser

- configure their receptionist

- preview the agent

- use limited demo minutes

Free users CANNOT:

- receive a dedicated business phone number

- deploy live inbound calling

After selecting a paid plan:

Show:

"Choose your business number"

Fields:

Country

Area code

Number

Example:

United States

312

Then show available numbers.

User selects number.

Backend provisions the number.

==================================================

19. TELEPHONY ARCHITECTURE

==================================================

Create a provider abstraction:

TelephonyProvider

Methods:

searchNumbers()

purchaseNumber()

releaseNumber()

configureNumber()

getNumber()

transferCall()

Implement:

TwilioProvider

first.

Architecture must allow:

TelnyxProvider

later.

For MVP:

Twilio → ElevenLabs

When a phone number is purchased:

1. provision number

2. configure inbound routing

3. import/configure number with ElevenLabs

4. associate phone number with receptionist

5. save provider IDs

6. verify configuration

7. display number as LIVE

Never show "Live" until the backend confirms the configuration.

==================================================

20. TELEPHONY COST CONTROL

==================================================

Create an internal cost model.

Track:

phone_number_cost

telephony_minutes

elevenlabs_minutes

storage

Stripe fees

Do not expose internal costs to customers.

Admin dashboard should show:

Revenue

Estimated infrastructure cost

Gross margin

Minutes

Average revenue per customer

Average cost per customer

==================================================

21. PHONE NUMBER ASSIGNMENT

==================================================

A receptionist can have:

- zero phone numbers

- one phone number

- multiple numbers depending on plan

Database relationship:

organization

→ receptionist

→ phone numbers

Never allow the same phone number to be assigned to multiple active organizations.

==================================================

22. CALL FORWARDING

==================================================

Add:

"Use your existing business number"

Instead of buying a number.

Show instructions for forwarding:

- all calls

- unanswered calls

- after-hours calls

The first MVP can provide provider-specific instructions rather than automating every carrier.

Later add automated forwarding integrations.

==================================================

23. CALL HANDLING

==================================================

Receptionist settings:

Answering mode:

[ Receptionist answers first ]

[ Human answers first ]

[ After-hours only ]

[ Overflow only ]

Call transfer:

Enable/disable.

Transfer destinations:

Name

Department

Phone number

Transfer rules:

- sales

- urgent

- existing customer

- emergency

- appointment

- other

==================================================

24. BUSINESS HOURS

==================================================

Visual weekly schedule.

Monday

09:00 — 17:00

Tuesday

09:00 — 17:00

etc.

Allow:

- multiple periods

- closed days

- holidays

- custom after-hours greeting

Example:

"Thanks for calling. We're currently closed. I can still help you book an appointment or take a message."

==================================================

25. APPOINTMENT BOOKING

==================================================

Build calendar architecture.

MVP integrations:

Google Calendar

Later:

Cal.com

Outlook

Calendly

The receptionist must be able to:

- check availability

- propose times

- book appointment

- reschedule

- cancel

Never claim an appointment exists until the calendar API confirms it.

Appointment flow:

Caller:

"I'd like to book a haircut tomorrow."

Agent:

"Absolutely. What time works for you?"

Agent checks availability.

Agent:

"I have 10:30 AM or 2:00 PM available."

Caller:

"2 PM."

Agent creates appointment.

Agent confirms.

==================================================

26. CONVERSATIONS

==================================================

Create Conversations page.

Table:

Date

Caller

Duration

Outcome

Receptionist

Status

Example:

Sep 23

+1 312...

2m 31s

Appointment booked

Click opens conversation detail.

==================================================

27. CONVERSATION DETAIL

==================================================

Layout:

Header:

Caller

Date

Duration

Outcome

Tabs:

Overview

Transcript

Recording

Analysis

Overview:

Summary

"Caller wanted to schedule a roof inspection..."

Outcome:

Appointment booked

Caller intent:

Booking

Transcript:

Caller:

...

AI:

...

Recording:

[Play recording]

Analysis:

- Intent

- Outcome

- Successful

- Appointment

- Transfer

- Sentiment if available

- Language

Use ElevenLabs conversation APIs to populate this data.

ElevenLabs exposes conversation details including transcript, duration and audio availability, and also provides lightweight generated summaries. :contentReference[oaicite:6]{index=6}

==================================================

28. ANALYTICS

==================================================

Create Analytics.

Date selector:

Today

7 days

30 days

90 days

Custom

Top cards:

Conversations

Calls answered

Minutes

Appointments

Transfers

Missed calls

AI handled %

Charts:

Calls over time

Call duration

Appointments

Call outcomes

Outcomes:

Booked

Message taken

Transferred

Question answered

Spam

Other

Add:

Peak calling hours

Top caller intents

Language distribution

==================================================

29. DASHBOARD HOME

==================================================

Dashboard should immediately communicate:

"Your receptionist is live."

Top card:

Receptionist

LIVE

+1 XXX XXX XXXX

Buttons:

Call

Test

Edit

Then:

Today's calls

0

Appointments

0

Minutes used

0

AI handled

—

Then onboarding/help cards.

If the user has no calls:

"No calls yet"

"Once your receptionist handles its first call, you'll see summaries, transcripts and outcomes here."

==================================================

30. SIDEBAR

==================================================

Sidebar:

LOGO

Phone number

Home

Receptionists

Analytics

----------------

Operations

Calendar

Clients

Staff

Conversations

----------------

Setup

Business

Integrations

Settings

----------------

Upgrade

Show:

"Free trial — X days left"

or

"You're on Basic"

==================================================

31. RECEPTIONISTS PAGE

==================================================

Display all receptionists.

Card:

[avatar/orb]

Business Receptionist

LIVE

Phone:

+1...

Language:

English

Voice:

Jason

Buttons:

Open

Edit

Test

Allow multiple receptionists for higher plans.

==================================================

32. RECEPTIONIST SETTINGS

==================================================

Create a detailed receptionist configuration page.

Sections:

GENERAL

Name

Status

Phone number

Languages

PERSONALITY

Voice

Tone

Greeting

BUSINESS KNOWLEDGE

Website

Services

FAQs

Hours

Policies

CALL HANDLING

Answering order

Transfers

After-hours

Messages

BOOKING

Calendar

Services

Staff

Availability

INTEGRATIONS

Calendar

CRM

Zapier

Webhooks

ADVANCED

Agent instructions

Fallback behavior

Recording

Transcription

Make advanced configuration optional.

Most users should never need to touch the system prompt.

==================================================

33. AI ASSISTANT

==================================================

Include a persistent AI assistant panel in the dashboard.

Similar UX:

"Hi! I'm your personal AI assistant.

I can answer questions about your receptionist and help configure it."

Input:

"Ask your agent to do anything..."

Examples:

"Change my greeting."

"Make the receptionist more concise."

"Add Saturday opening hours."

"Disable appointment booking."

"Use a warmer voice."

The assistant should translate natural language into structured configuration changes.

IMPORTANT:

The assistant must NOT directly make destructive changes without confirmation.

For example:

User:

"Delete my receptionist."

Assistant:

"I can delete it. This will disconnect its phone number. Continue?"

[Cancel] [Delete receptionist]

==================================================

34. STRIPE BILLING

==================================================

Use Stripe.

Create pricing:

FREE

Browser demo

Limited usage

No dedicated phone number

BASIC

Monthly subscription

Dedicated phone number

Included minutes

Overage billing

PRO

More minutes

Multiple numbers

More concurrent calls

Calendar integrations

Priority support

BUSINESS

Custom

Use Stripe Checkout.

Use Stripe Customer Portal.

Use Stripe webhooks.

Events:

checkout.session.completed

customer.subscription.created

customer.subscription.updated

customer.subscription.deleted

invoice.paid

invoice.payment_failed

Never trust frontend billing state.

Stripe webhook events are the source of truth.

==================================================

35. USAGE BILLING

==================================================

Track phone minutes.

Example:

Basic:

$29/month

75 included minutes

Pro:

$79/month

275 included minutes

Premium:

$199/month

1,000 included minutes

These values should be configurable from an admin dashboard.

Do NOT hard-code pricing into components.

Create:

plans table

Fields:

id

name

monthly_price

annual_price

included_minutes

included_numbers

max_concurrent_calls

overage_price_per_minute

features

Usage calculation:

phone minutes consumed

minus included minutes

equals overage minutes

Use Stripe metered/usage billing or invoice line items depending on the final implementation.

==================================================

36. FREE TRIAL

==================================================

Free trial:

No credit card.

User gets:

- browser receptionist

- limited test calls

- business scan

- receptionist creation

- voice testing

Phone number requires upgrade.

Make this extremely clear.

Example:

"Your receptionist is ready to test."

Then:

"Want customers to call it?"

"Activate your business number"

[Upgrade]

==================================================

37. PRICING PAGE

==================================================

Create a premium pricing page.

Toggle:

Monthly / Annual

Cards:

Free

Basic

Pro

Business

Make Pro visually prominent but do not use manipulative dark patterns.

Show:

Included minutes

Phone numbers

Concurrent calls

Integrations

Support

Include usage calculator:

Average booking value

Missed calls per week

Calculate:

Potential recovered revenue

Clearly label it:

"Estimate only."

==================================================

38. ADMIN DASHBOARD

==================================================

Create /admin.

Only platform administrators can access it.

Sections:

Overview

Customers

Organizations

Receptionists

Phone numbers

Usage

Revenue

Costs

Subscriptions

Failed provisioning

Webhooks

System logs

Admin can:

- create/edit plans

- configure voices

- configure supported countries

- configure phone providers

- view customer accounts

- view ElevenLabs agent IDs

- view phone provider IDs

- manually retry provisioning

- suspend accounts

- inspect failed webhooks

==================================================

39. PROVISIONING STATE MACHINE

==================================================

Never create an agent as one giant synchronous request.

Use explicit states.

Receptionist:

draft

scanning

review_required

creating_agent

agent_ready

phone_pending

phone_provisioning

phone_configuring

live

error

suspended

Display these states in the UI.

Example:

Creating your receptionist...

✓ Business information

✓ Knowledge base

✓ Voice

✓ AI agent

○ Phone number

If phone provisioning fails:

"Your receptionist is ready, but we couldn't activate the phone number."

[Retry]

Never leave users on a blank loading screen.

==================================================

40. WEBHOOKS

==================================================

Create secure webhook endpoints.

POST /api/webhooks/elevenlabs

POST /api/webhooks/stripe

POST /api/webhooks/twilio

Validate signatures.

Make all webhook handlers idempotent.

Store webhook events.

Never process the same event twice.

ElevenLabs supports post-call transcription webhook events, which should be used to synchronize completed call information into the platform. :contentReference[oaicite:7]{index=7}

==================================================

41. SECURITY

==================================================

Implement:

- authentication

- RLS

- server-side secret management

- webhook signature validation

- rate limiting

- CSRF protection where applicable

- input validation

- Zod schemas

- tenant isolation

- audit logs

Never put API keys in localStorage.

Never expose secret keys in client bundles.

Never allow one organization to access another organization's data.

==================================================

42. WEBSITE CRAWLER

==================================================

Build a server-side crawler.

Requirements:

- respect robots.txt where applicable

- limit crawl depth

- avoid infinite loops

- deduplicate URLs

- strip navigation noise

- strip cookie banners

- extract readable content

- identify structured business information

Start with:

homepage

services

about

contact

pricing

FAQ

booking

Maximum:

20 pages per scan in MVP.

Show crawl progress.

==================================================

43. KNOWLEDGE MANAGEMENT

==================================================

Knowledge sources:

Website

Text

FAQ

Document

URL

UI:

Knowledge

[Website]

https://example.com

Synced 2 hours ago

[FAQs]

23 entries

[Documents]

3 documents

Allow:

Add source

Delete

Rescan

Edit

==================================================

44. AGENT PROMPT GENERATION

==================================================

Do NOT simply concatenate website text into a prompt.

Generate structured instructions.

Agent instruction template:

IDENTITY

You are the AI receptionist for {{business_name}}.

ROLE

Your role is to answer inbound customer calls, answer questions about the business, help callers book appointments, collect messages and transfer calls when appropriate.

BUSINESS INFORMATION

{{structured_business_data}}

SERVICES

{{services}}

HOURS

{{hours}}

BOOKING RULES

{{booking_rules}}

CALL HANDLING

{{call_handling_rules}}

SAFETY

Never invent information.

If you do not know something, say you don't have that information and offer to take a message or connect the caller with the team.

Never invent availability.

Never confirm an appointment until the booking system confirms it.

Never invent prices.

Never expose private business information.

Always remain polite and concise.

ESCALATION

Transfer calls when:

{{transfer_rules}}

==================================================

45. BROWSER DEMO VS PHONE AGENT

==================================================

The same receptionist configuration should power:

Browser demo

AND

Phone calls

This is important.

There should be ONE source of truth for:

- business information

- greeting

- personality

- voice

- services

- booking rules

- transfer rules

Do not maintain separate browser and phone prompts.

==================================================

46. RESPONSIVE DESIGN

==================================================

Desktop:

Three-column dashboard where appropriate:

sidebar

main content

AI assistant

Mobile:

sidebar becomes drawer

AI assistant becomes bottom sheet

Cards stack vertically.

Tables become cards.

Voice demo remains usable on mobile.

==================================================

47. EMPTY STATES

==================================================

Every page needs polished empty states.

Example:

No conversations:

"No calls yet"

"Once your receptionist answers its first call, you'll see the conversation here."

Button:

"Test your receptionist"

==================================================

48. LOADING STATES

==================================================

Do NOT use generic spinners everywhere.

Use meaningful progress.

Examples:

Scanning website...

Finding your services...

Building your knowledge base...

Creating your receptionist...

Preparing your voice...

Activating your phone number...

==================================================

49. ERROR HANDLING

==================================================

Every external API call must have:

- timeout

- retry

- logging

- user-friendly error

- internal error ID

Never expose raw API errors to customers.

Example:

Bad:

"ElevenLabs returned 422 CreatePhoneRequest..."

Good:

"We couldn't activate your phone number. Your receptionist is still ready to test. Try again."

==================================================

50. API ARCHITECTURE

==================================================

Create backend services:

/api/onboarding/scan-website

/api/onboarding/create-receptionist

/api/receptionists

/api/receptionists/:id

/api/receptionists/:id/test

/api/receptionists/:id/publish

/api/phone-numbers/search

/api/phone-numbers/purchase

/api/phone-numbers/:id/configure

/api/conversations

/api/conversations/:id

/api/appointments

/api/usage

/api/billing/create-checkout

/api/billing/portal

/api/webhooks/stripe

/api/webhooks/elevenlabs

/api/webhooks/twilio

==================================================

51. ELEVENLABS SERVICE LAYER

==================================================

Do not spread ElevenLabs API calls throughout the application.

Create:

lib/elevenlabs/

client.ts

agents.ts

phoneNumbers.ts

conversations.ts

webhooks.ts

Example conceptual interface:

ElevenLabsService.createAgent({

  name,

  voiceId,

  firstMessage,

  prompt,

  language,

  knowledge,

  tools

})

ElevenLabsService.importPhoneNumber(...)

ElevenLabsService.assignPhoneNumber(...)

ElevenLabsService.getConversation(...)

ElevenLabsService.getConversationSummary(...)

ElevenLabsService.getConversationAudio(...)

The exact request schemas MUST follow the current ElevenLabs API documentation rather than assumptions in this prompt.

==================================================

52. TELEPHONY SERVICE LAYER

==================================================

Create:

lib/telephony/

provider.ts

twilio.ts

telnyx.ts

Interface:

searchNumbers()

purchaseNumber()

releaseNumber()

configureInbound()

getNumber()

validateNumber()

Default:

TwilioProvider

Future:

TelnyxProvider

The UI must never know which provider is being used.

==================================================

53. PLAN ENFORCEMENT

==================================================

Create a centralized entitlement service.

Example:

canUsePhoneNumber()

canCreateReceptionist()

canUseCalendar()

canUseMultipleNumbers()

canUseConcurrentCalls()

canUseAdvancedAnalytics()

Never scatter:

if(plan === "pro")

throughout the application.

Use:

entitlements.can(...)

==================================================

54. FEATURE FLAGS

==================================================

Create feature flags.

Examples:

browser_demo

phone_numbers

calendar

call_transfer

analytics

multiple_receptionists

multi_location

advanced_analytics

crm

api_access

Admin can enable/disable features.

==================================================

55. OBSERVABILITY

==================================================

Track:

agent creation failures

phone provisioning failures

webhook failures

Stripe failures

crawl failures

ElevenLabs API latency

telephony API latency

Create structured logs.

Add correlation IDs.

Every major operation should have:

request_id

organization_id

user_id

resource_id

==================================================

56. PERFORMANCE

==================================================

Do not block page loads waiting for:

- ElevenLabs

- Stripe

- Twilio

- website crawler

Use background jobs where possible.

The UI should immediately show:

"Creating..."

and poll/revalidate status.

Use optimistic UI only where safe.

==================================================

57. SEO

==================================================

Landing pages:

/

 /pricing

 /features

 /industries

 /industries/plumbers

 /industries/salons

 /industries/dentists

 /industries/law-firms

 /industries/real-estate

 /industries/home-services

SEO title:

AI Receptionist for Small Businesses | [BRAND]

Create strong metadata.

==================================================

58. LANDING PAGE SECTIONS

==================================================

Hero

Interactive AI demo

"How it works"

1. Tell us about your business

2. We build your receptionist

3. Connect your phone

4. Let it handle your calls

Feature section:

Answer every call

Book appointments

Answer questions

Take messages

Transfer calls

24/7 coverage

Multiple languages

Call summaries

Interactive product preview.

Industry section.

Analytics preview.

Pricing.

FAQ.

Final CTA.

==================================================

59. COPY STYLE

==================================================

Use concise copy.

Do not sound like an enterprise telecom company.

Do not overuse:

"revolutionize"

"transform"

"cutting-edge"

"AI-powered solution"

Prefer:

"Never miss a call."

"Your receptionist is ready."

"Let customers call you."

"Answers questions. Books appointments. Takes messages."

"Set it up in minutes."

==================================================

60. PRODUCT UX PRINCIPLE

==================================================

The entire product should follow this principle:

COMPLEXITY IN THE BACKEND.

SIMPLICITY IN THE FRONTEND.

The customer should feel like:

"I gave you my website and now I have an AI receptionist."

They should NOT feel like:

"I am configuring an AI voice agent."

==================================================

61. DEMO ACCOUNT

==================================================

Create a demo organization:

"Half Price Roof LLC"

Use realistic sample data.

Receptionist:

"Half Price Roof LLC's Receptionist"

Voice:

Jason

Greeting:

"Hello! Thanks for calling Half Price Roof LLC. How can I help you today?"

Phone number:

Use a configurable demo number.

This demo account should demonstrate:

- services

- business hours

- booking

- call transfer

- conversations

- analytics

==================================================

62. SEED DATA

==================================================

Seed:

1 demo organization

1 demo receptionist

5 services

5 staff members

10 demo conversations

5 demo appointments

30 days of analytics

This makes the dashboard look complete immediately in development/demo mode.

==================================================

63. DEVELOPMENT MODE

==================================================

Create a DEMO_MODE environment variable.

When:

DEMO_MODE=true

do not make destructive external API calls.

Mock:

Twilio

Stripe

ElevenLabs

BUT the production architecture must use real services.

Create clean provider interfaces so mock providers can be swapped for production providers.

==================================================

64. REAL API MODE

==================================================

When:

DEMO_MODE=false

use real:

ELEVENLABS_API_KEY

STRIPE_SECRET_KEY

TWILIO_ACCOUNT_SID

TWILIO_AUTH_TOKEN

TWILIO_PHONE_NUMBER

Additional configuration:

STRIPE_WEBHOOK_SECRET

ELEVENLABS_WEBHOOK_SECRET

SUPABASE_SERVICE_ROLE_KEY

==================================================

65. ADMIN CONFIGURATION

==================================================

Admin settings should include:

ElevenLabs API key status

Default voice

Available voices

Twilio credentials status

Stripe status

Plans

Pricing

Included minutes

Overage rates

Countries

Phone providers

Feature flags

Never show raw secrets after saving.

==================================================

66. ONBOARDING UX

==================================================

The complete onboarding should feel like:

Step 1

Your business

Step 2

Your receptionist

Step 3

Test it

Step 4

Get your number

Step 5

Go live

Progress indicator:

Business

Receptionist

Test

Phone

Live

At every stage show what has already been completed.

==================================================

67. FINAL "GO LIVE" SCREEN

==================================================

Show:

Your receptionist is live.

[animated green status]

Business:

Half Price Roof LLC

Phone:

+1 XXX XXX XXXX

Voice:

Jason

Languages:

English

Hours:

24/7

Buttons:

Call your receptionist

Open dashboard

Edit receptionist

Share booking page

Then:

"Your customers can call this number now."

==================================================

68. BOOKING PAGE

==================================================

Create a public booking URL:

/book/:organizationSlug

Show:

Business name

Services

Available staff

Calendar

Available times

The booking page must use the same availability source as the AI receptionist.

Never maintain a separate booking database that can become inconsistent with the real calendar.

==================================================

69. CUSTOMER CRM

==================================================

Basic customer records:

Name

Phone

Email

Last call

Last appointment

Total calls

Notes

Automatically create/update customer records after calls.

==================================================

70. FUTURE-READY ARCHITECTURE

==================================================

Design the code so these can be added later:

- SMS

- WhatsApp

- outbound calls

- review requests

- CRM integrations

- HubSpot

- Salesforce

- GoHighLevel

- Zapier

- n8n

- webhooks

- multi-location

- team accounts

- white-label

- API access

- custom voices

- call campaigns

Do not build all of these now.

Build the architecture so adding them doesn't require rewriting the core system.

==================================================

71. CRITICAL PRODUCT RULES

==================================================

RULE 1

Never expose API secrets client-side.

RULE 2

Never allow cross-tenant access.

RULE 3

Never confirm an appointment until the calendar confirms it.

RULE 4

Never show a phone number as LIVE until provisioning has been confirmed.

RULE 5

Never tell a caller something that isn't present in the business knowledge.

RULE 6

Never allow a failed external API call to leave the product in an unknown state.

RULE 7

All external operations must be retryable.

RULE 8

All webhooks must be idempotent.

RULE 9

All billing state comes from Stripe webhooks.

RULE 10

All voice calls use the same canonical receptionist configuration.

==================================================

72. IMPLEMENTATION ORDER

==================================================

Build in this exact order.

PHASE 1

Design system

Landing page

Authentication

Database

Organization model

PHASE 2

Onboarding

Manual business setup

Website crawler

Business review

PHASE 3

ElevenLabs integration

Agent creation

Voice configuration

Browser voice demo

PHASE 4

Dashboard

Receptionists

Settings

Conversations

Analytics

PHASE 5

Stripe

Plans

Subscriptions

Trial

Entitlements

PHASE 6

Twilio

Number search

Number provisioning

ElevenLabs phone configuration

Go-live flow

PHASE 7

Calendar

Appointments

Booking page

PHASE 8

Admin dashboard

Monitoring

Logs

Provider configuration

PHASE 9

Polish

Responsive

Accessibility

SEO

Performance

Error handling

Empty states

Loading states

==================================================

73. ACCEPTANCE CRITERIA

==================================================

A new user should be able to:

1. Land on the website.

2. Click "Talk to the AI".

3. Have a real browser conversation.

4. Click "Create my receptionist".

5. Create an account.

6. Enter a business URL.

7. Wait while the site is scanned.

8. Review extracted business information.

9. Approve it.

10. Select a voice.

11. Generate an ElevenLabs agent.

12. Talk to the new receptionist.

13. See the receptionist in the dashboard.

14. Select a paid plan.

15. Pay through Stripe.

16. Search for a phone number.

17. Purchase/assign a number.

18. Connect the number to the receptionist.

19. See the receptionist become LIVE.

20. Call the number.

21. Have the AI answer.

22. Have the AI answer a business question.

23. Book an appointment.

24. See the call appear in Conversations.

25. See the transcript.

26. See the summary.

27. See the call in Analytics.

28. See usage minutes update.

29. See billing state update.

There must be no manual developer intervention in this flow.

==================================================

74. QUALITY BAR

==================================================

Do not stop when the UI "looks right."

The application must be functionally connected.

Avoid fake buttons.

Avoid placeholder functionality.

Avoid hardcoded dashboard numbers except explicit demo mode.

Avoid fake API success responses in production.

Avoid storing sensitive secrets in frontend code.

Avoid giant monolithic components.

Use reusable components.

Use typed API contracts.

Use validation.

Use error boundaries.

Use proper loading states.

Use proper empty states.

Use accessible controls.

==================================================

75. IMPORTANT: RESEARCH CURRENT API DOCUMENTATION

==================================================

Before implementing ElevenLabs functionality, inspect the CURRENT official ElevenLabs Agents API documentation.

Do not rely on assumptions from this prompt for exact API request/response schemas.

Verify:

- agent creation

- agent updates

- voice configuration

- knowledge bases

- tools

- browser conversations

- phone numbers

- phone number import

- phone number assignment

- conversations

- transcripts

- summaries

- recordings

- webhooks

Use the official API as the source of truth.

Similarly verify the current Stripe and Twilio APIs before implementation.

==================================================

76. FINAL OUTPUT

==================================================

Build the actual application.

Do not merely create a prototype screenshot.

Create:

- working frontend

- working backend

- database schema

- authentication

- RLS

- API routes

- ElevenLabs integration

- Stripe integration

- Twilio integration

- website crawler

- onboarding

- browser voice demo

- dashboard

- analytics

- billing

- admin

At the end, provide:

1. Environment variables required

2. Database migration

3. API integration setup

4. Stripe setup instructions

5. ElevenLabs setup instructions

6. Twilio setup instructions

7. Local development instructions

8. Production deployment instructions

9. List of remaining optional features

Most importantly:

BUILD THE PRODUCT, not just the marketing page.

The first user journey must work end-to-end:

LANDING PAGE

→ TALK TO AI

→ SIGN UP

→ SCAN WEBSITE

→ REVIEW BUSINESS

→ CREATE RECEPTIONIST

→ TEST RECEPTIONIST

→ UPGRADE

→ GET PHONE NUMBER

→ GO LIVE

→ RECEIVE CALL

→ TRANSCRIPT

→ SUMMARY

→ ANALYTICS

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://your-virtual-agent.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c55f415b-8636-4273-bce3-382322a9dc14).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
