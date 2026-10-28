# Règles pour tous les agents de l'équipe

Ce fichier est lu par chaque agent IA de l'équipe, quel que soit le modèle (Claude, Qwen, Codex…). Les humains le lisent aussi.

## Avant de coder

1. `git pull --rebase`
2. `bin/tache liste` (ou `node bin/tache liste`) : le tableau de `TACHES.md`, libre (« À faire »), pris (« En cours ») et fini (« Fait »).
3. **Lis dans `TACHES.md` les notes « Fait : »** des tâches qui touchent la tienne : elles disent ce qui existe déjà.
4. `bin/tache prendre NN prenom` (prénom de ton humain ; NN ou quelques mots du titre). Si le script répond que la tâche est déjà prise, choisis-en une autre. **Ne code jamais une tâche que tu n'as pas prise.**

## Pendant

- Ne modifie que **ton dossier** (voir « Qui possède quoi » dans `CLAUDE.md` ou `PROJET.md`). S'il faut toucher au dossier d'un autre, arrête-toi et dis à ton humain d'aller le demander à la personne concernée.
- Respecte le **contrat d'API** et les types de `PROJET.md`. Si le contrat doit changer, ne le change pas toi-même : dis-le à ton humain.
- Suis `DESIGN.md` pour toute interface : couleurs, typo, espacements, composants. N'invente pas de style.
- Petits commits, `git pull --rebase` puis `git push` **au moins toutes les 30 min**. On travaille tous sur `main`.
- Avant chaque push : le linter et le build passent. Un push qui casse `main` se corrige avant toute autre chose.
- Une nouvelle tâche découverte en route ne se fait pas en douce : `bin/tache nouvelle "Titre" "détails"`.
- Les humains modifient aussi `TACHES.md` à la main (tâches sans numéro, déplacées à la main) : c'est normal, le script les numérote. Toi, passe toujours par `bin/tache` pour ce fichier.

## Après

1. Commit et push du code.
2. `bin/tache finir NN "ce que j'ai changé, en 1 à 3 lignes : fichiers, routes, ce qui reste"`.
3. Dis à ton humain que c'est fini et ce qu'il doit tester.

## Interdits

- Réécrire l'historique (`push --force`, `rebase` de commits déjà poussés).
- Ajouter une dépendance lourde sans le dire à ton humain.
- Mettre un secret (clé API, mot de passe) dans le code : il va dans `.env`, qui n'est jamais commité.
- Annoncer « fini, les tests passent » sans les avoir lancés.
