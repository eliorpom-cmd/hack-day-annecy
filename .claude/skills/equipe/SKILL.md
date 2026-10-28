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
5. Commit + `git pull --rebase` + `git push` au moins toutes les 30 min, linter et build verts.
6. Fini : push du code, puis `bin/tache finir NN "<1-3 lignes : fichiers, routes, ce qui reste>"`, puis dis à l'humain quoi tester.

Si la tâche demande de changer le contrat d'API de `PROJET.md` ou le dossier d'un autre : arrête-toi et dis-le à l'humain, qui ira le demander à la personne concernée.
