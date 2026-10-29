# Tâches

Pour ajouter une tâche : une ligne `- Titre` sous « À faire », éventuellement des détails en dessous, décalés de deux espaces. Le numéro est ajouté tout seul.
Pour en prendre une : déplace sa ligne sous « En cours » et ajoute ton prénom entre parenthèses, puis commit et push tout de suite.
Pour la finir : déplace-la sous « Fait » et ajoute en dessous `  - Fait : ce que tu as changé`.

Avec un agent ou au terminal : `bin/tache liste`, `nouvelle`, `prendre`, `finir` (voir `AGENTS.md`).

## À faire

- 05 · Refaire l'onboarding (mode simple)
  - scan du site ou saisie, voix, numéro, dashboard ; voir PROJET.md « Onboarding » ; référence reception.ai
- 06 · Refaire le dashboard : leads, appels, mode avancé
  - fiches leads remplies par les appels ; mode avancé = agenda, base de connaissances, accueil

## En cours

- 12 · Schéma du parcours d'un appel (vue pitch + vue technique) (Maxime)
  - page web pour le pitch + docs/schema-appel.excalidraw pour l'équipe
- 13 · Script de la démo de 3 min (Maxime)
  - scénario demande de devis : un appelle, un joue l'artisan
- 14 · Slides du pitch (~5 min) (Maxime)
  - deck web exportable PDF/PPTX
- 16 · Rappel automatique + question au retour (Claude)
  - appui sur Rappeler = appel lancé (tel:) et rappel noté ; au retour dans l'app, fenêtre bloquante « Avez-vous eu Mme X ? » Oui / Non, pas répondu. Oui → statut Rappelé ; Non → reste à rappeler. Le bouton « Marquer comme rappelé » reste sur la fiche (le client a pu rappeler lui-même)

## Fait

- 02 · Ajouter au dépôt le code de l'agent ElevenLabs de Mathieu (Elior)
  - dans un dossier à lui ; noter dans PROJET.md ce que l'agent sait déjà faire
  - Fait : app/ = copie du MVP Lovable (your-virtual-agent @ bf3da68), sans .env ; Prettier appliqué, lint 0 erreur, build OK ; stack décrite dans PROJET.md
- 10 · Squelette web/ (Astro + Worker + D1, connexion démo + lien magique) (Claude)
  - Fait : web/ : Astro 7 + Worker + D1 (migrations/), connexion démo + lien magique testés ; npm run dev
- 03 · Brainstorm : choisir le métier visé et ce que montre la démo (Elior)
  - s'appuyer sur etude-marche/README.md ; remplir Problème, Démo et Hors périmètre dans PROJET.md
  - Fait : générique tous artisans, démo = onboarding + vrai appel + ce que reçoit l'artisan (PROJET.md)
- 04 · Fixer la stack, le contrat d'API et qui possède quoi (Elior)
  - après le brainstorm ; sections Stack, Contrat d'API et Ownership de PROJET.md
  - Fait : Astro + Worker + D1, rôles dans PROJET.md
- 01 · Inviter Mathieu sur GitHub (Elior)
  - demander son pseudo, rôle Write
  - Fait : Mathieu invité
- 09 · Mail récap de la semaine (Claude)
  - appels, urgences, leads ; envoi programmé
  - Fait : web/src/lib/recap*.ts : mail du lundi via Resend (cron du Worker), 9 tests ; aperçu recapPreview(businessId)
- 07 · Routage des appels par horaires (Claude)
  - portable de l'artisan ~15 s, puis l'agent si pas de réponse ou refus ; hors horaires : l'agent direct
  - Fait : web/src/pages/api/twilio/{voice,fallback}.ts : sonne chez l'artisan pendant ses horaires (heure de Paris), sinon/à défaut l'agent ElevenLabs ; testé en local
- 08 · SMS instantané à l'artisan en cas d'urgence (Claude)
  - déclenché par l'agent ; + transfert de l'appel si possible
  - Fait : web/src/pages/api/elevenlabs/post-call.ts : enregistre appel + lead, SMS Twilio si urgence ; à brancher avec les vraies clés
- 11 · Back de l'onboarding et du dashboard (API) (Claude)
  - scan du site, voix, agent ElevenLabs, numéros, fiche, horaires, FAQ, appels, leads, stats ; voir le contrat dans PROJET.md
  - Fait : web/src/pages/api/* + web/src/lib/* : toutes les routes du contrat, scan du site via Workers AI, 39 tests ; données démo (0004) ; à tester avec les vraies clés
- 15 · Récap WhatsApp à l'artisan après chaque appel (Claude)
  - décision de Maxime : remplace le SMS d'urgence seul. Touche web/src/lib/telephony + post-call (agent téléphonie). Démo : sandbox WhatsApp Twilio ; prod : modèle validé par Meta. Change le contrat PROJET.md → à valider par l'intégrateur
  - Fait : déjà fait à 16 h 20 (commit 860773e) : message après chaque appel, WhatsApp puis SMS en secours ; textes dans COPY.md
