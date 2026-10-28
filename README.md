# Kit d'équipe du hackathon

Repo de départ pour travailler à plusieurs, chacun avec son agent IA, sans faire deux fois la même chose.

## Le jour J, à 13 h 30 (5 min, sur le Mac d'Elior)

1. Le repo existe déjà (créé le 28/10, nom provisoire `hack-day-annecy`, privé). Le renommer si besoin : `gh repo rename NOM` (le webhook Discord suit).
2. Inviter les coéquipiers : `gh repo edit --add-collaborator PSEUDO` (ou Settings → Collaborators).
3. Remplir `PROJET.md` ensemble (problème, 3 écrans, stack, contrat d'API, qui possède quoi).
4. Poser le squelette de l'app (ex. `npx create-next-app@latest app` puis shadcn/ui), coller le bloc Tokens de `DESIGN.md` dans `globals.css`, ajouter linter et build au `PROJET.md`.
5. Créer les premières tâches dans `TACHES.md` (à la main ou `bin/tache nouvelle "Titre" "détails"`).
6. Webhook GitHub → Discord `#github` : Discord, Paramètres du salon → Intégrations → Webhooks → copier l'URL, puis GitHub, Settings → Webhooks → URL + `/github`, type `application/json`.

## Chez chaque coéquipier

```
gh repo clone eliorpom-cmd/hack-day-annecy && cd hack-day-annecy
git config user.name "Prénom Nom"
```
Puis : `/equipe` dans Claude Code, ou « Lis AGENTS.md et suis-le » pour un autre agent. Note à envoyer à l'équipe : `docs/COMMENT-ON-BOSSE.md`.

## Contenu

| Fichier | Rôle |
|---|---|
| `AGENTS.md` | Règles pour tous les agents (lu par Claude, Codex, Qwen Code…) |
| `PROJET.md` | Le contrat commun, à remplir à 13 h 30 |
| `DESIGN.md` | Le style de l'interface (tokens shadcn/ui), ajusté par Elior |
| `CLAUDE.md` | Importe les trois fichiers ci-dessus pour Claude Code |
| `TACHES.md` | Le tableau des tâches, modifiable à la main par tout le monde |
| `bin/tache` | Le même tableau pour les agents et le terminal (Node) : `liste`, `nouvelle`, `prendre`, `finir` |
| `.claude/skills/equipe/` | La commande `/equipe` |
| `docs/COMMENT-ON-BOSSE.md` | La note d'une page pour l'équipe |
| `docs/ENTRETIEN.md` | Les 10 questions à poser à l'entreprise |

`bin/tache` (Node, 28/10) a été testé avec deux clones : trois courses sur la même tâche (une seule personne l'obtient à chaque fois, l'autre reçoit « Déjà prise »), deux créations simultanées (numéros distincts), une tâche ajoutée à la main sans numéro (numérotée au passage suivant), du code en cours non commité (préservé).
