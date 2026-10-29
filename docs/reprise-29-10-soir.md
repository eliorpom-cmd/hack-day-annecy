# Reprise : session du 29/10 au soir (Maxime + Claude, session cloud)

À lire avant de reprendre sur un ordinateur. Tout ce qui est décrit ici est sur `main` et en ligne :
https://hack-day-annecy.eliorpom-0bc.workers.dev (PR #4 à #14, toutes fusionnées et déployées).

## Déroulé de la démo (décidé par Maxime)

1. **L'appel d'abord** : on appelle le numéro de démo **+1 863 230 2742**. Le client n'a plus d'eau chaude ; le répondeur
   répond aux questions, propose le 1er créneau libre, puis le 2e quand le client refuse, confirme, et note le rendez-vous.
2. **La configuration de l'artisan** : « Essayer la configuration » (Plomberie Martin pré-remplie, voix Elior déjà clonée,
   « Connecter mon calendrier »).
3. **Le message WhatsApp** reçu après l'appel, montré à l'écran (récap : priorité, demande, rendez-vous, numéro, lien).
4. **Les fonctions en plus** sur le portail : Fiche Google (aperçu Maps, avis), réseaux sociaux, publicités, site web.

## État du compte « Voir la démo » (en production)

- Nom « Plomberie Martin », artisan Marc Martin, voix **Elior** (`EMGF1gEbaSmJMCwU3Sne`), accueil
  « Bonjour, ici l'assistant de Plomberie Martin. Marc est sur un chantier, que puis-je faire pour vous ? ».
- Numéro du répondeur **+1 863 230 2742** relié à ce compte ; mode renvoi : un appel direct va tout de suite à l'agent.
- Calendrier connecté (simulé) ; portable / WhatsApp : **06 95 07 05 65** ; écran du renvoi d'appel marqué fait.
- Agent ElevenLabs `agent_8101m64ax62cfassb9r49rkgcb6z`, mis à jour avec les dernières instructions.

## Ce qui a été fait ce soir

- **Renvoi d'appel par défaut** (« Garder mon numéro ») : étape 3 de la configuration ; dans l'app, écran plein écran
  sans fermeture tant que le renvoi n'est pas confirmé (iPhone : copier-coller du code, Android : clavier pré-rempli),
  un code par écran, puis un essai. Réglages → « Renvoi d'appel » le rouvre. Site, annonces, fiche et publications
  donnent le portable de l'artisan en mode renvoi.
- **Voix de démo** : sur un compte démo, l'étape voix affiche « Clonage de voix déjà effectué · Voix Elior sélectionnée ».
  La voix est cherchée sur le compte ElevenLabs par son nom (« Elior », sinon « Quentin » ; ou secrets `DEMO_VOICE_ID`,
  `DEMO_VOICE_NAME`). `web/src/lib/demo-voice.ts`.
- **Comptes démo sans IA** : publications, annonces, description et idées Google, réponses aux avis, accroche du site
  écrites à l'avance (`web/src/lib/demo-content.ts`) ; adresses Facebook, Instagram, LinkedIn et fiche Google
  pré-remplies. Instantané, aucun crédit.
- **Fiche Google** : choix « J'ai une fiche » (lien demandé, données d'exemple) / « Je n'ai pas de fiche » (guide en
  7 écrans) ; aperçu en lecture seule façon Google Maps (photo de chantier sur les comptes démo) ; 6 avis à qui répondre.
- **Réseaux sociaux** : « Vos pages » à relier ; sujets du métier + « Me présenter » + texte libre.
- **Site web** : aperçu, accroche modifiable, liens vers les autres outils. **Publicités** : basées sur le site, toujours
  écrites même si l'IA échoue.
- **Répondeur au téléphone** (`web/src/lib/prompt.ts`) : se présente comme l'assistant, ne redit jamais bonjour, répond
  d'abord aux questions avec la documentation, ne demande pas le numéro (`{{caller_phone}}`), phrases courtes, ne relit
  rien (« D'accord. »), pas de récapitulatif. Calendrier connecté : propose `{{slot_1}}` puis `{{slot_2}}` ; sinon ne
  propose jamais de rendez-vous et demande les disponibilités.
- **Calendrier** : « Connecter mon calendrier » à l'étape 1 (simulé : 2 s puis connecté). Créneaux d'1 h, à 1 h 30 au
  plus tôt, dans les horaires, heure de Paris (`web/src/lib/calendar.ts`), calculés à chaque appel et passés à
  ElevenLabs en variables dynamiques. Le créneau choisi est noté (`appointments`) et ajouté au message WhatsApp.
- **WhatsApp** : Réglages → « Envoyer un test » (même chemin que le message après un appel). Ping testé le 29/10 :
  parti par le relais du Mac en 2 s.
- **Mobile** : menu hamburger vers toutes les pages.
- Nettoyage : réponses de test aux avis Google supprimées (une fois, au déploiement).

## Erreurs et pièges : ne pas les refaire

1. **La clé Cloudflare des sessions cloud n'a pas accès à D1** (`wrangler d1 migrations apply --remote` refusé, code
   7403). Les migrations 0014 à 0016 sont appliquées par le Worker au premier appel (`web/src/lib/schema-upgrade.ts`,
   idempotent, inscrit dans `d1_migrations`). Une nouvelle migration doit être ajoutée aussi dans ce fichier.
2. **Le numéro de démo change de compte** : l'étape « Votre numéro » d'« Essayer la configuration » le reprend pour le
   compte d'essai. Après avoir montré la configuration, **relier de nouveau le numéro au compte démo** avant un nouvel
   appel (Réglages → Numéro du répondeur → Changer de numéro, sur « Voir la démo »).
3. **Les instructions de l'agent ne s'appliquent qu'à sa mise à jour** (`POST /api/agent`, appelé à l'étape « Voix »).
   Un agent créé avant garde ses anciennes instructions et son ancienne voix : c'est pour ça que la voix Elior ne passait
   pas. Après un changement de prompt, relancer `POST /api/agent` sur le compte qui porte le numéro.
4. **Une phrase d'accueil écrite à la main n'est jamais remplacée** : seules les phrases générées le sont.
5. **Vérifier `npm run lint` avant de fusionner** : la PR #5 a été fusionnée avec une erreur de type (corrigée en #6).
6. **Espaces insécables** (COPY.md) : avant « : ? » et dans « ». Les tests les attendent (` `).
7. **Node** : Astro 7 demande Node ≥ 22.23.4. En local sans accès Cloudflare, `astro dev` ne démarre pas (Workers AI
   distant) : construire (`npx astro build`) puis `wrangler dev` sur `dist/server/wrangler.json` sans le binding `ai`.
8. **Ne pas faire `pkill -f` avec un motif présent dans sa propre commande** : il tue le shell.
9. **Garde de sécurité de Claude Code** : sans accord explicite, elle bloque le déploiement et la liaison d'un numéro
   Twilio. CLAUDE.md dit maintenant que Claude déploie seul après chaque fusion ; au besoin, ajouter une règle de
   permission pour `npx wrangler deploy`.
10. **Travail en parallèle** : la tâche 30 de Mathieu (Fiche Google, j'ai / je n'ai pas de fiche) est déjà faite ici ; un
    autre agent travaillait en même temps. `git pull` avant tout, et `TACHES.md` n'a pas été mis à jour par cette session
    (faire `bin/tache finir 30 …` ou la libérer).
11. **La photo de chantier** (`web/public/demo/chantier-plombier.jpg`) montre « Le plombier Annecy » sur la veste : nom
    d'une vraie entreprise. À remplacer si possible.

## À vérifier avant la démo

- [ ] Un vrai appel au +1 863 230 2742 : voix Elior, réponses aux questions, 2 créneaux, rendez-vous, WhatsApp reçu.
- [ ] Webhook de fin d'appel réglé dans ElevenLabs vers `…/api/elevenlabs/post-call` (sinon pas de WhatsApp).
- [ ] Relais WhatsApp lancé sur le Mac, Mac sans veille :
      `cd relay-whatsapp && WA_AUTH=./session WHATSAPP_RELAY_TOKEN=<jeton> node relay.mjs`
- [ ] Après la configuration montrée en direct : numéro relié de nouveau au compte démo (piège 2).
