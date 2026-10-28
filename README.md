# Hack Day Annecy

Notre projet pour le Hacktoberfest Hack Day Annecy (jeudi 29/10). Le problème, les écrans, la stack et qui fait quoi sont dans [`PROJET.md`](PROJET.md).

On a 8 h 30, chacun avec ou sans agent IA. Ce repo sert de tableau commun pour ne pas faire deux fois la même chose ni se marcher dessus.

## Démarrer

```
gh repo clone eliorpom-cmd/hack-day-annecy && cd hack-day-annecy
git config user.name "Prénom Nom"
```

- Avec Claude Code : tapez `/equipe`.
- Avec un autre agent : « Lis AGENTS.md et suis-le. »
- Sans agent : lisez [`TACHES.md`](TACHES.md) et la suite de cette page.

## Les tâches

Toutes les tâches sont dans [`TACHES.md`](TACHES.md), en trois parties : À faire, En cours, Fait.

- **Ajouter** : une ligne `- Titre` sous « À faire », commit, push. Le numéro s'ajoute tout seul.
- **Prendre** : déplacez la ligne sous « En cours » avec votre prénom entre parenthèses, puis commit et push **tout de suite**. Sans tâche prise, on ne code pas.
- **Finir** : déplacez-la sous « Fait » avec, en dessous, `  - Fait : ce que vous avez changé`.

Ça se fait à la main (éditeur, ou sur GitHub avec le crayon) ou au terminal :

```
bin/tache liste                        # le tableau
bin/tache nouvelle "Titre" "détails"   # ajouter
bin/tache prendre 03 prenom            # prendre la tâche 03
bin/tache finir 03 "ce que j'ai fait"  # finir, avec une note pour les suivants
```

Sous Windows : `node bin/tache liste`.

## Pousser son code

Un conflit arrive quand deux personnes modifient le même fichier. Chacun a donc son dossier (« Qui possède quoi » dans `PROJET.md`), et la règle dépend de ce qu'on touche :

| Ce que vous modifiez | Comment |
|---|---|
| Votre dossier, `TACHES.md` | Push direct sur `main`. `git pull --rebase` avant chaque push, au moins toutes les 30 min. |
| Un fichier commun : contrat d'API et types partagés, `package.json` et lockfile, config, le dossier d'un autre | Branche + pull request. Le gardien de `main` la relit et la fusionne. |

Avant chaque push, le linter et le build passent. Si `main` est cassé, on répare avant toute autre chose.

## Discord

On est assis ensemble, donc on se parle à voix haute. Discord sert à ce qui ne se dit pas.

- `#général` : un message pour tout le monde sans couper ceux qui sont concentrés.
- `#liens-importants` : URL de démo, maquettes, accès, docs.
- `#github` : rempli automatiquement par le repo.

## Planning

| Heure | Quoi |
|---|---|
| 13 h 30 – 14 h 15 | Problème, 3 écrans, contrat d'API, `PROJET.md`, découpage en tâches |
| 14 h 15 – 19 h | On construit en parallèle |
| 19 h | **Plus de nouvelles fonctions.** On rend la démo solide |
| 20 h – 21 h 30 | Corrections, 2 répétitions du pitch |
| 22 h | Code freeze |

## Les fichiers

| Fichier | Rôle |
|---|---|
| `PROJET.md` | Le contrat commun : problème, écrans, stack, API, qui possède quoi |
| `TACHES.md` | Le tableau des tâches |
| `AGENTS.md` | Les règles pour les agents IA (Claude, Codex, Qwen…) |
| `DESIGN.md` | Le style de l'interface |
| `docs/ENTRETIEN.md` | Les questions à poser à l'entreprise |
