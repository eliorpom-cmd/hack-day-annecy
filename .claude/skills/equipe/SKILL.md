---
name: equipe
description: Travailler en équipe sur le repo du hackathon sans faire deux fois la même chose — prendre une tâche avec bin/tache, rester dans son dossier, pousser souvent, finir avec une note. À utiliser dès qu'on commence, reprend ou termine une tâche dans ce repo, ou quand l'humain tape /equipe.
---

# Travail en équipe

Les règles complètes sont dans `AGENTS.md` (déjà chargé par `CLAUDE.md`). Le rituel :

1. `git pull --rebase`, puis `bin/tache liste`.
2. Si l'humain n'a pas nommé de tâche : propose-lui les tâches libres (« À faire » de `TACHES.md`), en une ligne chacune, et attends son choix.
3. `bin/tache prendre NN <prénom de l'humain>`. Code de sortie 2 : la tâche est déjà prise ; montre le tableau et propose une autre tâche.
4. Lis la tâche et les notes « Fait : » des tâches finies qui la touchent, puis code **dans le dossier de l'humain seulement** (`PROJET.md`, « Qui possède quoi »).
5. Écris les tests de la tâche quand elle est testable. Commit + `git pull --rebase` + `git push` au moins toutes les 30 min, `lint`, `build` et `test` verts.
6. Fini : push du code, puis `bin/tache finir NN "<1-3 lignes : fichiers, routes, ce qui reste>"`, puis dis à l'humain quoi tester.

Si la tâche demande de changer un fichier commun (contrat d'API, types partagés, `package.json`, config) ou le dossier d'un autre : dis-le à l'humain ; avec son accord, fais-le sur une branche et ouvre une pull request (`gh pr create`) pour l'intégrateur, sans la fusionner toi-même.
