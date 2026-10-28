# Hack Day Annecy

Projet de l'équipe au Hacktoberfest Hack Day Annecy (29/10). Spec, stack, contrat d'API et ownership : [`PROJET.md`](PROJET.md).

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

## Discord

https://discord.gg/4QHYUJeZ5j · notifications en mentions uniquement.

- `#💬-général` : annonces ; `@everyone` si c'est urgent
- `#🔗-liens-importants` : URL de démo, maquettes, accès, docs
- `#🤖-github-log` : pushs et PR, automatique
