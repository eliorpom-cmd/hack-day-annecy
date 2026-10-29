# Répondeur artisans · Copy

> Court, concret, en « vous ». Dit ce qui s'est passé et qui rappeler, l'action d'abord. Jamais d'enthousiasme, jamais de mot technique.

- **Surface** : 1) le message WhatsApp/SMS envoyé après chaque appel (surface principale) ; 2) la page web d'un appel, ouverte depuis le lien du message (mobile) ; 3) le tableau de bord (peu utilisé) ; 4) ce que dit le répondeur au téléphone.
- **Langue** : français
- **Origin** : created on 2026-10-29 (persona et choix d'Elior, défauts de la skill adn-copy)
- **Updated** : 2026-10-29 (retours d’Elior)
- **String files** : `web/src/lib/telephony/postcall.ts` (message), `web/src/lib/prompt.ts` (répondeur), `web/src/pages/**/*.astro` (pages)

Lecteur : artisan de 30-40 ans en reconversion, au début de son activité, sur chantier, téléphone en main. Il lit le message en 3 secondes entre deux tâches.

## Voice

1. **L'action d'abord.** La première ligne dit quoi faire ou ce qui compte : la priorité, puis qui, puis quoi. « Rappelez Mme Lefèvre d'abord. » pas « Vous avez reçu plusieurs appels aujourd'hui ».
2. **Nommer les choses.** Le nom du client, la panne, la rue, l'heure. « Fuite sous l'évier, 12 rue Royale » pas « une demande d'intervention ».
3. **Une idée par phrase, 10 mots en moyenne.** Le message se lit en diagonale.
4. **Le produit ne dit jamais « nous ».** Il parle de ce qui s'est passé, pas de lui-même.
5. **Rien de technique.** L'artisan ne doit jamais voir comment ça marche : pas d'IA, pas d'agent, pas de transcription.

## Tone by context

| Contexte | Ton | Exemple |
|---|---|---|
| Message après un appel urgent | factuel, la raison de l'urgence en une phrase | 🔴 Urgence : fuite d'eau, Mme Lefèvre · L'eau coule dans le salon. |
| Message après un appel normal | neutre, la demande en une phrase | 🟢 Devis salle de bain, M. Durand · Veut un devis pour remplacer la baignoire. |
| Succès | participe passé, 1-2 mots | Enregistré |
| Erreur | ce qui a échoué + quoi faire | Numéro introuvable · Vérifiez le numéro et réessayez. |
| État vide | ce qui va apparaître ici, sans détail superflu | Aucun appel · Vos appels s'afficheront ici. / Personne à rappeler · Les nouveaux appels s'afficheront ici. |
| Configuration | ce qu'on demande, puis à quoi ça sert concrètement | Votre métier et vos horaires · Le répondeur les donne aux clients qui appellent. |
| Répondeur au téléphone | poli, court, comme un secrétariat | Bonjour, ici l'assistant de Plomberie Martin. Marc est sur un chantier, que puis-je faire pour vous ? |

## Mechanics

- **Person** : vous ; le produit ne dit jamais nous
- **Buttons** : infinitif, majuscule au premier mot seulement, 1 à 3 mots (« Rappeler », « Continuer », « Enregistrer les horaires »)
- **Titles** : majuscule au premier mot seulement, sans point
- **Final period** : aucun sur titres, boutons, libellés ; toujours sur les phrases complètes
- **Exclamation marks** : never
- **Em dash** : never
- **Ellipsis** : … (un caractère) sur la progression (« Lecture de votre site… »), jamais "..."
- **Quotes and apostrophes** : ’ et « » avec espaces insécables
- **Typographie** : espace insécable avant : ; ? ! et dans « »
- **Numbers** : en chiffres ; téléphones au format 06 12 34 56 78 ; heures « 14 h 30 »
- **Emoji** : uniquement le point de priorité en tête du message (🔴 Urgence, 🟠 Prioritaire, 🟢 Normal, ⚪ Sans message) ; aucun ailleurs

## Lengths

| Texte | Cible | Maximum |
|---|---|---|
| Ligne 1 du message (priorité, objet, client) | 5-8 mots | 60 caractères |
| Message complet | 5 lignes | 600 caractères |
| Bouton | 1-2 mots | 3 |
| Titre de page | 1-3 mots | 5 |
| Phrase d'interface | 10 mots | 20 |
| Réplique du répondeur au téléphone | 1 phrase | 2 phrases |

## Vocabulary

- **Banned** : lead, CRM, IA, intelligence artificielle, agent, bot, transcription, base de connaissances, onboarding, dashboard, workflow, optimiser, booster, simplement, facilement, en quelques clics, n'hésitez pas, veuillez, désolé, oups, solution, révolutionner

| Avoid | Use |
|---|---|
| lead, prospect | client, demande |
| CRM | mes clients |
| agent IA, assistante | le répondeur |
| base de connaissances | documentation |
| transcription | contenu de la conversation |
| onboarding | configuration |
| dashboard | tableau de bord |
| appel manqué | appel pris par le répondeur |
| statut | (pas de libellé : la pastille suffit) |

Statuts d'un client : Nouveau, Rappelé, Devis envoyé, Gagné, Perdu.
Priorités : Urgence, Prioritaire, Normal (valeurs en base : urgence, urgent, normal).

## Patterns

### Message après un appel (WhatsApp ou SMS)

Ordre fixe, une information par ligne, la ligne vide est interdite (le message doit tenir sans défiler) :

```
🔴 Urgence : fuite d'eau, Mme Lefèvre
Pourquoi : l'eau coule dans le salon.
Demande : réparer la fuite sous l'évier aujourd'hui.
12 rue Royale, Annecy
Rappeler : 06 12 34 56 78
Détails : https://…/a/x7k2
```

- Ligne 1 : point + priorité + objet (2-4 mots) + client. Si le nom manque : « un client ».
- « Pourquoi » seulement pour Urgence et Prioritaire.
- Le numéro seul sur sa ligne : WhatsApp et SMS le rendent cliquable, c'est le bouton « appeler ».
- Appel sans message : « ⚪ Appel sans message, 06 12 34 56 78 · Rappeler : 06 12 34 56 78 ».

### Page d'un appel (ouverte depuis le lien)

Le moins de texte possible : l'artisan ne lit pas, il regarde. Priorité, panne, client, une ligne de raison, l'adresse, le bouton. Le reste est replié.

- Titre = le nom du client (« Mme Lefèvre »), puis « Appel il y a 12 min » en petit. L'objet n'est pas répété : il est dans le bloc « Demande ».
- Bouton principal en bas : « Rappeler ». Bouton secondaire : « Marquer comme rappelé ».
- Sections : « Demande », « Adresse », « Contenu de la conversation » (repliée).

### Configuration

- Titre d'étape = ce que l'artisan donne : « Votre activité », « La voix », « Votre numéro ».
- Une phrase qui dit à quoi sert l'information, en action concrète (« Le répondeur les donne aux clients qui appellent. »), jamais un but vague (« Pour répondre à vos clients »). Puis le champ, puis « Continuer ».
- Progression : « Lecture de votre site… » ; fin : « Votre répondeur est prêt. »
- Champ facultatif : « (facultatif) » à la fin du nom du champ (« Nom de l’entreprise (facultatif) »).
- Choix entre deux options : un titre court en gras (« Garder mon numéro (recommandé) », « Pas d’horaires fixes ») et une ligne qui dit la conséquence concrète (« Votre portable sonne d’abord, à toute heure. »).
- Questions à l’artisan : « Question 2 sur 6 », « Le répondeur aimerait savoir : », puis la question telle qu’un client la pose. Boutons « Suivant » et « Passer ».
- Codes à composer : le code seul sur sa ligne, en gras, avec « Composer » et « Copier » ; « Pour arrêter : ##002# ».

### Répondeur au téléphone

- Voix clonée de l'artisan : il répond comme lui-même : « Oui allô, Plomberie Martin. »
- Voix de la bibliothèque : « Bonjour, ici l'assistant de Plomberie Martin. Marc est sur un chantier, que puis-je faire pour vous ? » (« l'assistante » si la voix choisie est féminine).
- Client déjà suivi (chantier, devis, facture en cours) : le répondeur ne dit jamais où en est le dossier ; il note et promet le rappel. Le message dit « Suivi de dossier ».
- Prix : exact s'il est dans la documentation, sinon une fourchette + « le prix exact se fait sur devis », sinon « Marc vous rappelle pour le prix ».
