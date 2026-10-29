# Hack Day Annecy : fonctionnement de l'équipe

Projet de l'équipe au Hacktoberfest Hack Day Annecy (29/10). Spec, stack, contrat d'API et ownership : [`PROJET.md`](PROJET.md).

## Qui fait quoi

Le projet : un répondeur téléphonique IA + CRM pour les artisans. Brief complet et contrat d'API : `PROJET.md`. Specs : [Google Doc](https://docs.google.com/document/d/1BAAv4wFGkR5YkEVe2x0vCBMw6svuSBUsX_zLp5dOAqw/edit).

| Qui | Rôle | Maintenant | Pour |
|---|---|---|---|
| **Mathieu** | Utilisateurs et connecteurs | Entretien avec un plombier ; dire quel numéro Twilio marche avec son agent ; donner les clés ElevenLabs et Twilio (dans `web/.dev.vars` sur le Mac d'Elior, jamais dans le chat ni dans git) ; ensuite Google Ads, Meta Ads, réseaux sociaux | 16 h 30 |
| **Maxime** | Product manager | Schéma Excalidraw du parcours d'un appel ; script de la démo de 3 min ; slides du pitch | 20 h |
| **Elior** | Design UI/UX, tests | Maquettes de l'onboarding (05) et du dashboard (06), web et mobile ; tester chaque fonction livrée | 18 h |
| **Claude** (agents d'Elior) | Code | Routage des appels par horaires (07), SMS d'urgence (08), API de l'onboarding et du dashboard (11), puis mail récap (09) et intégration des maquettes | 18 h 30 |

Démo (3 min) : 1) l'onboarding, 2) un vrai appel d'un client, 3) ce que reçoit l'artisan (SMS, fiche dans le dashboard).

Code freeze à 22 h.

## Setup

```
gh repo clone eliorpom-cmd/hack-day-annecy && cd hack-day-annecy
git config user.name "Prénom Nom"
```

Agents : Claude Code → `/equipe` ; les autres → « lis AGENTS.md et suis-le ».

## Tâches

[`TACHES.md`](TACHES.md), trois sections : À faire / En cours / Fait. Le fichier vit sur `main`.

- À la main (GitHub ou éditeur après `git pull`) : ajouter `- Titre` sous « À faire » ; pour prendre, déplacer la ligne sous « En cours » avec `(prénom)` et pousser tout de suite ; pour finir, la déplacer sous « Fait » avec `  - Fait : …`.
- En CLI (Node ; `node bin/tache` sous Windows). Écrit directement sur `origin/main` depuis n'importe quelle branche, sans toucher au working tree :

```
bin/tache liste
bin/tache nouvelle "Titre" "détails"
bin/tache prendre 03 prenom      # ou quelques mots du titre
bin/tache finir 03 "note : fichiers, routes, ce qui reste"
```

Pas de code sans tâche prise. On finit une tâche après avoir poussé le code.

## Git

| Changement | Workflow |
|---|---|
| Son dossier (ownership dans `PROJET.md`), `TACHES.md` | Push direct sur `main`, `git pull --rebase` avant, au moins toutes les 30 min |
| Fichiers communs (contrat d'API, types partagés, `package.json`/lockfile, config) ou dossier d'un autre | Branche + PR, relue et mergée par l'intégrateur |

Pas de `push --force`, pas de secret commité (`.env`).

## Tests et CI

Chaque tâche livre ses tests quand c'est testable (logique, routes d'API, parsing des réponses de l'IA). La CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) lance `lint`, `build` et `test` sur chaque push et chaque PR. Un `main` rouge se répare avant toute autre chose.
