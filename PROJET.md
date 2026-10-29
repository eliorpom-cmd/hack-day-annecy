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
- **Surface principale** (décidé le 29/10) : le **message WhatsApp/SMS** reçu après chaque appel, avec un lien vers la page web de l'appel. Le tableau de bord sert peu. Textes : `COPY.md`.
- **Produit** : un mode simple par défaut, et un mode avancé (connecter son agenda, enrichir la base de connaissances, personnaliser l'accueil, etc.).
- **Nom** : sans nom d'entreprise (auto-entrepreneur), le répondeur, le prompt et les messages disent « {prénom} {nom}, {métier} » (`businessDisplayName`, `lib/greeting.ts`).
- **Documentation par questions** : après la lecture du site (ou la saisie), le répondeur pose à l'artisan, une par une, les questions que le site ne couvre pas (« Le répondeur aimerait savoir : … ») ; chaque réponse devient une question de la documentation.
- **Onboarding** : scanner le site de l'artisan s'il en a un, sinon saisie à la main → choisir une voix (clonage de sa voix ou voix de la bibliothèque) → acheter un numéro → dashboard. Agenda Google proposé mais facultatif : sans agenda, pas de prise de rendez-vous, juste un lead.
- **Routage des appels** (tâches 24 et 26) : deux façons, choisies à l'étape « Votre numéro » (`businesses.forwarding_mode`). **Garder mon numéro** (`renvoi`, recommandé) : l'artisan garde son numéro (rien à changer sur Google) et compose sur son portable les codes de renvoi vers le numéro du répondeur (`**61*+33…**20#` sans réponse, `**67*+33…#` refus/occupé, `**62*+33…#` injoignable, `##002#` pour arrêter ; `lib/forwarding.ts`) ; un appel renvoyé (mode `renvoi` ou `ForwardedFrom` Twilio) va directement à l'agent, son portable a déjà sonné. **Nouveau numéro** (`numero`, ou non choisi) : les clients appellent le numéro du répondeur ; pendant les horaires, son portable sonne ~15 s, puis l'agent ; hors horaires, l'agent tout de suite ; **sans horaires fixes** (aucune ligne `business_hours`), son portable sonne d'abord à toute heure. Décision : `lib/telephony/routing.ts` `shouldRingArtisan`.
- **Urgence** : SMS instantané à l'artisan (+ transfert de l'appel si possible).
- **Prix au téléphone** : prix exact s'il est dans la base, sinon fourchette + « sur devis », sinon « l'artisan vous rappelle ». Jamais de prix inventé.
- **CRM** : rempli par les appels, pas d'import des clients existants pour l'instant.
- **Récap** : dashboard + mail récapitulatif chaque semaine.
- **Ce que la démo montre (3 min)** : 1) l'onboarding, 2) un vrai appel d'un client, 3) ce que reçoit l'artisan (SMS, fiche dans le dashboard).
- **Hors périmètre aujourd'hui** : site web, réseaux sociaux, pubs, import CRM (on les cite dans le pitch).


## État et reprise (29/10/2026, ~18 h 30)

**Passage de relais** : un coéquipier reprend le projet sur Lovable. Ce dépôt (`web/`) reste la référence de ce qui marche : routes, prompts, messages (COPY.md), design (DESIGN.md).

**En ligne** : https://hack-day-annecy.eliorpom-0bc.workers.dev (compte Cloudflare Eliorpom, base D1 migrée jusqu'à 0013). Publier : `bin/publier` (copie propre de `main`).

**Fait sur `main`** : landing, connexion, configuration v2 (nom d'entreprise et horaires facultatifs, interview de l'artisan, « Garder mon numéro » par renvoi d'appel), appels, page d'un appel, réglages, hub ordinateur (Site web, Fiche Google, Réseaux sociaux, Publicités : générateurs IA), faux site d'artisan pour la démo `/plomberie-martin/`.

**Relais WhatsApp** (sur `main`, pas encore en ligne) : file `whatsapp_outbox` (migration 0014), routes `/api/whatsapp-relay/outbox` et `/ack` (jeton `WHATSAPP_RELAY_TOKEN`), relais Mac `relay-whatsapp/` (Baileys, session GRNBL, voir son README).

**Inachevé** : configuration de démo pré-remplie sur Plomberie Martin, branche `wip/demo-prefill` (tests OK, jamais parcourue dans un navigateur). Paquet de passage à Lovable (`LOVABLE.md`) pas écrit : arrêté au changement de compte Claude.

**Clés** : seul `TWILIO_WEBHOOK_TOKEN` est posé sur Cloudflare (vérifié le 29/10 à 18 h 40) ; tant que les autres manquent, le clonage de voix en ligne répond « Votre voix ne peut pas encore être enregistrée ».

**Démo décidée** : l'appel est réel ; la configuration est montrée pré-remplie (faux site Plomberie Martin, on valide seulement) ; le message WhatsApp part du second numéro d'Elior (GRNBL), plan B : envoyé à la main.

**Réserves connues** : barre latérale ordinateur dont le fond s'arrête à mi-hauteur (AppShell) ; `lib/site.ts` n'utilise pas `businessDisplayName` ; un agent ElevenLabs de test a peut-être été créé en local.

**Bloquant pour la démo** :
1. Les clés : Elior les a mises dans `web/.dev.vars` (lecture interdite à Claude par ses réglages). Il doit les envoyer à Cloudflare lui-même, dans Terminal : `cd web && python3 -c "…" | npx wrangler secret bulk` (commande complète donnée le 29/10 : convertit .dev.vars en JSON sans APP_URL ni TWILIO_WEBHOOK_TOKEN). Ensuite tester en ligne : POST /api/agent (démo), GET /api/numbers, puis un vrai appel (tâche 18).
2. Webhook post-call à créer dans ElevenLabs vers `https://hack-day-annecy.eliorpom-0bc.workers.dev/api/elevenlabs/post-call`, puis son secret en `ELEVENLABS_WEBHOOK_SECRET`.
3. Bac à sable WhatsApp Twilio activé, téléphone d'Elior inscrit.

**Figma** (https://www.figma.com/design/MBwpM4E1rVdPEZgHL1qWBt) : fondations, composants et page d'un appel faits ; les autres écrans (mobile + ordinateur) restent à ajouter. Le connecteur claude.ai Figma ne marche pas sur le compte bruno ; le serveur MCP `figma` a été ajouté à Claude Code (`claude mcp add … https://mcp.figma.com/mcp`) mais doit être autorisé par Elior (`/mcp` → figma → Authenticate). Plan de l'agent : `/private/tmp/claude-501/-Users-elior-Documents-Code/15fcdd9f-3a8b-4963-8458-975568b2a716/scratchpad/figma/plan-ecrans.md` (peut disparaître au redémarrage du Mac).

**Publier** (toujours depuis une copie propre de `main`, jamais depuis le dossier où des agents travaillent) : `git worktree add --detach <dossier> origin/main`, lien `node_modules`, `npx wrangler d1 migrations apply hack-day-annecy --remote`, `npx astro build`, `npx wrangler deploy`.

**Reste** (TACHES.md) : 18 appel réel, 22 prompt réglé sur le scénario de Maxime, 27 écoute des voix, 28 étude Meta Ads, Figma, puis répéter la démo (`docs/demo-repetition.md`). Maxime : script (13) et slides (14). Mathieu : retours de l'entretien plombier.

**Décisions de la journée** : mobile d'abord (l'ordinateur ensuite), surface principale = le message WhatsApp ; « le répondeur » (jamais « assistante ») ; légal ignoré pour la démo ; Lovable abandonné, stack Cloudflare ; fonctions Google, réseaux et pubs = générateurs IA qui marchent, publication directe « Bientôt ».

## Persona et voix (décidé le 29/10)

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
| PUT | /api/business | champs de `businesses` (dont `last_name`, `forwarding_mode` : `renvoi` \| `numero`) | `{business}` |
| PUT | /api/business/hours | `[{weekday, opens, closes}]` (`[]` = pas d'horaires fixes) | `{hours}` |
| GET/POST | /api/faqs | `{question, answer, kind}` | `{faqs}` / `{faq}` |
| PUT/DELETE | /api/faqs/:id | idem | `{faq}` / 204 |
| POST | /api/onboarding/scan | `{url}` | `{business, faqs}` proposés (pas encore enregistrés) |
| POST | /api/onboarding/questions | `{business:{name, trade, city, description}, faqs:[{question, answer}]}` (facultatif, sinon la fiche enregistrée) | `{questions:[{question, kind}], source:{ai_model}}` : 5 à 7 questions que le site ne couvre pas (Workers AI, liste fixe en secours) |
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
| POST | /api/twilio/voice?token= | webhook Twilio (appel entrant) | TwiML : sonne chez l'artisan pendant ses horaires (ou toujours sans horaires fixes), sinon l'agent ; appel renvoyé → l'agent direct |
| POST | /api/twilio/fallback?token= | webhook Twilio (fin du `<Dial>`) | TwiML : l'agent si pas de réponse / refus |
| POST | /api/elevenlabs/post-call | webhook ElevenLabs (fin d'appel) | enregistre l'appel + le lead, SMS si urgence |
| GET | /api/whatsapp-relay/outbox | jeton `WHATSAPP_RELAY_TOKEN` (Bearer), sans session | `{messages:[{id, to_phone, body}]}` à envoyer par le relais Mac (`relay-whatsapp/`) |
| POST | /api/whatsapp-relay/ack | `{id, error?}`, même jeton | `{ok}` |

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
- URL de démo : https://hack-day-annecy.eliorpom-0bc.workers.dev (publier : `cd web && npm run deploy`, compte Cloudflare Eliorpom)
