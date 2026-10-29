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

Décision du 29/10 (15 h) : **on quitte Lovable / Supabase** et on passe sur la stack Cloudflare qu'Elior maîtrise déjà (Printomatic, print-on-my-desk, video.byelior.com).

- **Back** : un Cloudflare Worker en TypeScript, `wrangler`
- **Données** : D1 (SQLite) avec migrations `wrangler d1 migrations`
- **Tâches programmées** : Cron Triggers du Worker (mail récap du lundi)
- **Front** : React + Vite + Tailwind + shadcn/ui, servi par le même Worker (static assets). On reprend les composants `ui/` du MVP.
- **Tests** : `node --test`
- **IA vocale** : ElevenLabs (agents), téléphonie Twilio, agenda Google Calendar : on reprend la logique du MVP (`app/src/lib/elevenlabs`, `telephony`, `receptionist`, `crawler`, `calendar`, ~1 850 lignes, surtout des appels `fetch`, facile à porter).
- **À remplacer** : l'auth Lovable Cloud, la base Supabase (20 tables → D1), la passerelle IA de Lovable utilisée par le scan du site.
- **Secrets** : `wrangler secret put` / `.dev.vars`, jamais commités.

`app/` (le MVP Lovable importé) sert de **référence** pendant le portage, puis il partira.

## Contrat d'API

| Méthode | Route | Entrée | Sortie |
|---|---|---|---|
| | | | |

Types partagés :

## Ownership

| Qui | Rôle |
|---|---|
| Elior | Design UI/UX (web et mobile), tests |
| Maxime | Product manager : schémas Excalidraw du fonctionnement, slides du pitch |
| Mathieu | Entretien avec un plombier (user interview), puis connecteurs : ElevenLabs, Twilio, Google Ads, Meta Ads, réseaux sociaux |

| Dossier | Responsable |
|---|---|
| | |

Intégrateur (relit et merge les PR, répare `main`) :

## Commandes

- Dev : `cd app && npm install && npm run dev`
- Lint / build / test : `npm run lint` (0 erreur, 28 avertissements), `npm run build` ; pas encore de `npm test`
- URL de démo :
