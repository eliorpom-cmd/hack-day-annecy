# Comment on bosse (1 page)

On a 8 h 30 et chacun a son agent IA. Le risque : faire deux fois la même chose, ou se marcher dessus. Le repo sert de tableau commun, aussi bien pour nous que pour nos agents.

## Les 3 règles

1. **Toutes les tâches sont dans `TACHES.md`.** Avant de coder, on en prend une : on déplace sa ligne sous « En cours » avec son prénom, puis commit et push tout de suite (à la main, sur GitHub, ou `bin/tache prendre 03 prenom`). Sans tâche prise, on ne code pas.
2. **Un dossier par personne** (tableau « Qui possède quoi » dans `PROJET.md`). On ne touche pas au dossier d'un autre sans lui demander.
3. **On pousse sur `main` au moins toutes les 30 min**, avec le linter et le build au vert. Si quelqu'un casse `main`, on répare avant de continuer.

## Les fichiers que tout le monde (et tous les agents) lit

- `PROJET.md` : le problème, les 3 écrans, la stack, le contrat d'API, qui possède quoi.
- `AGENTS.md` : les règles pour les agents (lu par Claude, Qwen, Codex…).
- `DESIGN.md` : le style de l'interface, pour que tout ait la même tête.

## Ajouter ou prendre une tâche

À la main : ouvrez `TACHES.md` (dans votre éditeur ou sur GitHub, icône crayon), ajoutez une ligne `- Titre` sous « À faire », commit, push. Le numéro est ajouté tout seul.

Au terminal ou par un agent :

```
bin/tache liste                        # le tableau
bin/tache nouvelle "Titre" "détails"   # ajouter une tâche
bin/tache prendre 03 prenom            # prendre la tâche 03
bin/tache finir 03 "ce que j'ai fait"  # la terminer, avec une note pour les suivants
```

Avec Claude Code : tapez `/equipe` et l'agent suit le rituel tout seul. Avec un autre agent, dites-lui : « Lis AGENTS.md et suis-le. »

## Discord

On est assis ensemble : on se parle à voix haute. Discord ne sert qu'à ce qui ne se dit pas.

- `#liens` : URLs, captures, bouts de code, messages d'erreur.
- `#github` : rempli automatiquement par GitHub (chaque push, chaque tâche prise ou finie).

## Planning

| Heure | Quoi |
|---|---|
| 13 h 30 – 14 h 15 | Problème, 3 écrans, contrat d'API, `PROJET.md`, découpage en tâches |
| 14 h 15 – 19 h | On construit en parallèle |
| 19 h | **Plus de nouvelles fonctions.** On rend la démo solide |
| 20 h – 21 h 30 | Corrections, 2 répétitions du pitch |
| 22 h | Code freeze |
