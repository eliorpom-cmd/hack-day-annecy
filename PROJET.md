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
- **Produit** : un mode simple par défaut, et un mode avancé (connecter son agenda, enrichir la base de connaissances, personnaliser l'accueil, etc.).
- **Onboarding** : scanner le site de l'artisan s'il en a un, sinon saisie à la main → choisir une voix (clonage de sa voix ou voix de la bibliothèque) → acheter un numéro → dashboard. Agenda Google proposé mais facultatif : sans agenda, pas de prise de rendez-vous, juste un lead.
- **Routage des appels** : le client appelle le numéro de l'artisan. Pendant les horaires de travail, son portable sonne ~15 s ; s'il ne décroche pas ou refuse, l'agent prend l'appel. Hors horaires, l'agent répond tout de suite.
- **Urgence** : SMS instantané à l'artisan (+ transfert de l'appel si possible).
- **Prix au téléphone** : prix exact s'il est dans la base, sinon fourchette + « sur devis », sinon « l'artisan vous rappelle ». Jamais de prix inventé.
- **CRM** : rempli par les appels, pas d'import des clients existants pour l'instant.
- **Récap** : dashboard + mail récapitulatif chaque semaine.
- **Ce que la démo montre (3 min)** : 1) l'onboarding, 2) un vrai appel d'un client, 3) ce que reçoit l'artisan (SMS, fiche dans le dashboard).
- **Hors périmètre aujourd'hui** : site web, réseaux sociaux, pubs, import CRM (on les cite dans le pitch).

## Stack

Code : `app/`, copié le 29/10 du MVP Lovable de Mathieu (dépôt `Matthieu1203/your-virtual-agent`). On ne resynchronise pas avec Lovable : on code ici avec nos agents.

- Front : TanStack Start (React 19), Tailwind 4, shadcn/ui
- Back : fonctions serveur TanStack (`app/src/lib/**/*.server.ts`), routes publiques dans `app/src/routes/api/public/` (webhooks Twilio, receptionist, paiements)
- IA : agents vocaux ElevenLabs (`app/src/lib/elevenlabs/`), prompt de l'agent dans `app/src/lib/receptionist/prompt.server.ts`, scan du site dans `app/src/lib/crawler/`
- Téléphonie : Twilio (`app/src/lib/telephony/`) ; pour l'instant numéros américains seulement
- Agenda : Google Calendar (`app/src/lib/calendar/`)
- Paiement : Stripe
- Données : Supabase via Lovable Cloud (`app/supabase/migrations/`) ; clés dans `app/.env`, jamais commité (à récupérer auprès d'Elior ou Mathieu)
- Hébergement : build Cloudflare (nitro / wrangler)

## Contrat d'API

| Méthode | Route | Entrée | Sortie |
|---|---|---|---|
| | | | |

Types partagés :

## Ownership

| Dossier | Responsable |
|---|---|
| | |

Intégrateur (relit et merge les PR, répare `main`) :

## Commandes

- Dev : `cd app && npm install && npm run dev`
- Lint / build / test : `npm run lint` (0 erreur, 28 avertissements), `npm run build` ; pas encore de `npm test`
- URL de démo :
