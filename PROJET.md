# [Nom du projet]

## Le besoin

Specs à jour (source de vérité, écrite par l'équipe) : https://docs.google.com/document/d/1BAAv4wFGkR5YkEVe2x0vCBMw6svuSBUsX_zLp5dOAqw/edit

- **Entreprise** : pas de client. Idée de l'équipe.
- **Idée** : un répondeur téléphonique IA avec CRM pour un type d'artisan.
- **Base** : l'agent vocal ElevenLabs que Mathieu a déjà construit (code à ajouter au dépôt).
- **Cible** : générique, tous les artisans. Étude des métiers en 73/74 : `etude-marche/README.md`.
- **Pitch** : « Trouvez plus de clients, et ne les perdez plus parce que vous n'êtes pas disponible pour leur répondre. » Des Google Ads ne servent à rien si personne ne décroche, surtout pour une urgence.
- **Positionnement** : le tout-en-un de l'artisan. Le répondeur d'abord, puis site web, fiche Google, réseaux sociaux, pubs. Concurrents du répondeur seul : fonio, AUTILIA, Ainora, le modèle « plomberie » d'ElevenLabs.
- **Point de départ** : le MVP de Mathieu, qui marche déjà. On reprend son code, on l'optimise et on **refait toute l'interface et l'onboarding**. Référence d'interface et d'onboarding : reception.ai.
- **Surface principale** (décidé le 29/10, 16 h 30) : le **message WhatsApp/SMS** reçu après chaque appel, avec un lien vers la page web de l'appel. Le tableau de bord sert peu. Textes : `COPY.md`.
- **Produit** : un mode simple par défaut, et un mode avancé (connecter son agenda, enrichir la base de connaissances, personnaliser l'accueil, etc.).
- **Onboarding** : scanner le site de l'artisan s'il en a un, sinon saisie à la main → choisir une voix (clonage de sa voix ou voix de la bibliothèque) → acheter un numéro → dashboard. Agenda Google proposé mais facultatif : sans agenda, pas de prise de rendez-vous, juste un lead.
- **Routage des appels** : le client appelle le numéro de l'artisan. Pendant les horaires de travail, son portable sonne ~15 s ; s'il ne décroche pas ou refuse, l'agent prend l'appel. Hors horaires, l'agent répond tout de suite.
- **Urgence** : SMS instantané à l'artisan (+ transfert de l'appel si possible).
- **Prix au téléphone** : prix exact s'il est dans la base, sinon fourchette + « sur devis », sinon « l'artisan vous rappelle ». Jamais de prix inventé.
- **CRM** : rempli par les appels, pas d'import des clients existants pour l'instant.
- **Récap** : dashboard + mail récapitulatif chaque semaine.
- **Ce que la démo montre (3 min)** : 1) l'onboarding, 2) un vrai appel d'un client, 3) ce que reçoit l'artisan (SMS, fiche dans le dashboard).
- **Hors périmètre aujourd'hui** : site web, réseaux sociaux, pubs, import CRM (on les cite dans le pitch).


## Persona et voix (décidé le 29/10, 16 h 15)

**Persona** : 30-40 ans, en reconversion, au début de son activité d'artisan (sorti d'école). Il arrive sur un marché saturé, où les anciens tiennent déjà la clientèle. Ni technophile ni perdu avec le numérique. Il veut aller droit à l'essentiel.

**Voix de l'app** : directe, comme un collègue, en « vous ». Phrases courtes, l'action d'abord. Exemple : « 2 urgences. Rappelez Mme Martin d'abord. »

**Mots** : aucun mot technique, et pas de tournures molles.
| Au lieu de | On dit |
|---|---|
| lead, CRM | client, demande, à rappeler |
| agent IA, assistante | le répondeur (neutre, pas genré) |
| base de connaissances | documentation |
| transcription | contenu de la conversation |
| onboarding | configuration |

**Message après chaque appel** (WhatsApp de préférence, SMS en secours) : niveau de priorité, pourquoi c'est urgent, résumé de ce que veut le client, nom et numéro pour rappeler.

**Voix au téléphone** :
- voix clonée de l'artisan : il répond comme lui-même (« Oui allô, Plomberie Martin… ») ;
- voix de la bibliothèque (homme ou femme) : « Bonjour, ici l'assistant de Plomberie Martin. Marc est sur un chantier, que puis-je faire pour vous ? » (accordé selon la voix choisie).

## Stack

Décision du 29/10 (15 h) : **on quitte Lovable / Supabase** et on passe sur la stack Cloudflare qu'Elior maîtrise déjà (Printomatic, print-on-my-desk, video.byelior.com).

- **Back** : un Cloudflare Worker en TypeScript, `wrangler`
- **Données** : D1 (SQLite) avec migrations `wrangler d1 migrations`
- **Tâches programmées** : Cron Triggers du Worker (mail récap du lundi)
- **Front** : Astro 7 (rendu serveur, adaptateur Cloudflare) + Tailwind 4 + GSAP pour les animations, servi par le même Worker.
- **Tests** : `node --test`
- **IA vocale** : ElevenLabs (agents), téléphonie Twilio, agenda Google Calendar : on reprend la logique du MVP (`app/src/lib/elevenlabs`, `telephony`, `receptionist`, `crawler`, `calendar`, ~1 850 lignes, surtout des appels `fetch`, facile à porter).
- **À remplacer** : l'auth Lovable Cloud, la base Supabase (20 tables → D1), la passerelle IA de Lovable utilisée par le scan du site.
- **Secrets** : `wrangler secret put` / `.dev.vars`, jamais commités.

`app/` (le MVP Lovable importé) sert de **référence** pendant le portage, puis il partira.

## Contrat d'API

Code dans `web/`. Tables : `web/migrations/0001_init.sql`. Toutes les routes `/api/*` exigent une session, sauf `/api/auth/*`, `/api/twilio/*`, `/api/elevenlabs/*` (webhooks, protégés par jeton ou signature).

| Méthode | Route | Entrée | Sortie |
|---|---|---|---|
| POST | /api/auth/demo | – | session du compte démo, redirige vers /app |
| POST | /api/auth/magic | form `email` | `{sent}` ou `{sent:false, link}` sans clé Resend |
| GET | /auth/verify?token= | – | session, redirige vers /app ou /onboarding |
| POST | /api/auth/logout | – | redirige vers / |
| GET | /api/me | – | `{user, business}` |
| PUT | /api/business | champs de `businesses` | `{business}` |
| PUT | /api/business/hours | `[{weekday, opens, closes}]` | `{hours}` |
| GET/POST | /api/faqs | `{question, answer, kind}` | `{faqs}` / `{faq}` |
| PUT/DELETE | /api/faqs/:id | idem | `{faq}` / 204 |
| POST | /api/onboarding/scan | `{url}` | `{business, faqs}` proposés (pas encore enregistrés) |
| GET | /api/voices | – | `{voices:[{id, name, preview_url}]}` |
| POST | /api/agent | – | crée ou met à jour l'agent ElevenLabs depuis la fiche → `{agent_id}` |
| GET | /api/numbers/search?country=FR | – | `{numbers:[e164]}` |
| POST | /api/numbers | `{e164}` | achète le numéro, branche le webhook → `{number}` |
| GET | /api/calls | – | `{calls}` (récents d'abord) |
| GET | /api/leads | – | `{leads}` |
| PATCH | /api/leads/:id | `{status}` | `{lead}` |
| GET | /api/stats?days=7 | – | `{calls, missed_saved, urgent, leads}` |
| GET | /api/agent | – | aperçu du prompt de l'agent |
| GET | /api/numbers | – | numéros déjà possédés sur le compte Twilio |
| GET | /api/business/hours | – | `{hours}` |
| POST | /api/twilio/voice?token= | webhook Twilio (appel entrant) | TwiML : sonne chez l'artisan pendant ses horaires, sinon l'agent |
| POST | /api/twilio/fallback?token= | webhook Twilio (fin du `<Dial>`) | TwiML : l'agent si pas de réponse / refus |
| POST | /api/elevenlabs/post-call | webhook ElevenLabs (fin d'appel) | enregistre l'appel + le lead, SMS si urgence |

Secrets (`web/.dev.vars` en local, `wrangler secret put` en prod, jamais commités) : `ELEVENLABS_API_KEY`, `ELEVENLABS_WEBHOOK_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM`, `TWILIO_WEBHOOK_TOKEN`, `RESEND_API_KEY`, `MAIL_FROM` ; pour les numéros français : `TWILIO_BUNDLE_SID`, `TWILIO_ADDRESS_SID`. `APP_URL` doit être une URL publique pour que Twilio joigne les webhooks.

## Ownership

| Qui | Rôle |
|---|---|
| Elior | Design UI/UX (web et mobile), tests |
| Maxime | Product manager : schémas Excalidraw du fonctionnement, slides du pitch |
| Mathieu | Entretien avec un plombier (user interview), puis connecteurs : ElevenLabs, Twilio, Google Ads, Meta Ads, réseaux sociaux |

| Dossier | Responsable |
|---|---|
| `web/src/lib/telephony/`, `web/src/pages/api/twilio/`, `web/src/pages/api/elevenlabs/` | Claude (agent téléphonie) |
| `web/src/lib/` (reste), `web/src/pages/api/` (reste) | Claude (agent back) |
| `web/src/pages/*.astro`, `web/src/components/`, design | Elior |

Intégrateur (relit et merge les PR, répare `main`) :

## Commandes

- Dev : `cd web && npm install && npm run db:local && CLOUDFLARE_ACCOUNT_ID=0bcd1b213f9a7a11ff83178c5ebd69d2 npm run dev` (http://localhost:4321 ; l'ID de compte est nécessaire car ce Mac a deux comptes Cloudflare et le scan du site utilise Workers AI à distance)
- Lint / build / test (dans `web/`) : `npm run lint` (astro check), `npm run build`, `npm test`
- URL de démo :
