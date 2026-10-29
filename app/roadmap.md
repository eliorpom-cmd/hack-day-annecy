# Roadmap

- [x] Finish the detailed website-reading progress screen and verify it.
- [x] Improve website scan extraction quality; use the existing secure Lovable AI connection rather than exposing an OpenAI key.
- [x] US number search filters (state + area code + toll-free) and assigning a purchased number to a receptionist.
- [x] Clients/Conversations empty states reflect an already-live number.

## Calendar integrations
- [x] Google Calendar one-click connect per customer (availability + booking, confirm only after calendar confirms)
- [x] Built-in calendar fallback using business hours
- [x] Receptionist reads availability / books during calls
- [x] Twilio "trial account" message on calls → user must upgrade Twilio account (outside app)
- [ ] Outlook, Calendly, Square/Jobber/Housecall Pro (later, per user)
- [x] Integrations page: show Google Calendar as available/connected

## Production
- [x] Usage limits: minutes meter, 80%/over warnings, overage billed to next invoice, calls paused at 3× included or without a plan
- [x] Admin dashboard (/app/admin): stats, customers, suspend/restore, failed items + retry, activity
- [ ] SEO page "Best AI phone systems for small businesses" (waiting on user)
- [ ] Instant call sync via post-call webhook (waiting on user)

## Ads
- [ ] Connect ad account (waiting on user's platform choice + sign-in)
- [ ] Create first ad campaign (after account is connected)
