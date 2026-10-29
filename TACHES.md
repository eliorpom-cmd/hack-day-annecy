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
- 08 · SMS instantané à l'artisan en cas d'urgence
  - déclenché par l'agent ; + transfert de l'appel si possible
- 09 · Mail récap de la semaine
  - appels, urgences, leads ; envoi programmé

## En cours

- 07 · Routage des appels par horaires (Claude)
  - portable de l'artisan ~15 s, puis l'agent si pas de réponse ou refus ; hors horaires : l'agent direct

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
