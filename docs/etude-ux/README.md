# Étude UX : répondeur IA + mini CRM pour artisans

Date : 29/10/2026. Pour Elior (design Figma). Captures réelles de l'App Store (fr ou us selon l'app) et d'une page web. Je décris seulement ce qui est visible sur les images. Les captures App Store sont des visuels marketing : elles montrent des écrans, mais ne prouvent pas le parcours complet (l'onboarding réel n'est pas visible sauf mention).
Référence déjà dans le dépôt : `references/reception-ai/` (reception.ai, non rouvert ici : le site ne répondait pas depuis cette machine).

## 1. Tableau comparatif

| App | Type | Ce qu'elle fait pour l'utilisateur | Onboarding | Accueil | Appel manqué / nouveau lead | Action principale | Patterns notables | Captures |
|---|---|---|---|---|---|---|---|---|
| Rosie (US) | Répondeur IA | Répond aux appels et SMS, résume, alerte sur les leads | 3 étapes avec pastilles « Train / Customize / Go Live », carte « 3 sur 8 », FAQ à saisir | Liste unique « Conversations » (appels + SMS), filtres All / Open / Starred / Archive, barre d'onglets 4 entrées | Ligne par appelant : nom ou « Anonymous Caller », pastille CALL, extrait du message, date, étoile. Mention « The caller hung up before speaking with me » | Bouton « Continue » violet en bas de l'écran d'étape | Résumé IA en encart sur la fiche, lecteur audio, bouton « Message » sous le nom | `rosie/` |
| fonio (DE/FR) | Répondeur IA | Appels avec bon numéro d'entreprise, contacts d'équipe | Non visible | Clavier téléphonique ; onglets Phone / Calls / Contacts | Non visible | Gros bouton vert d'appel au centre bas du clavier ; en appel : bouton rouge « End » central | Choix du numéro sortant en haut ; contacts avec initiales dans des pastilles | `fonio/` |
| ElevenLabs Agents (web) | Plateforme d'agents vocaux | Page produit pour développeurs | Non visible | Page marketing longue | Non visible | Non visible | Orientée développeurs : liste d'intégrations, tableaux. À ne pas imiter | `reception-ai-web/` |
| Jobber | Terrain, tout-en-un | Devis, factures, planning ; assistant vocal « Jobber AI » | Non visible | Non visible (captures marketing) | Non visible | Devis : bouton vert plein « Approve & Pay Deposit » ; facture : « Close job & invoice now » en vert | Choix de fin de visite en 3 lignes dont une verte mise en avant ; commande vocale avec bulle de confirmation | `jobber/` |
| ServiceTitan Mobile | Terrain, grandes entreprises | Jobs, suivi des performances | Écran de connexion identifiant + mot de passe, bouton « Sign in » bleu clair | Onglets texte en haut (Overview, All Jobs, Follow Up, History…), fiche du job courant avec étiquette « WORKING », bloc de chiffres 3 x 2 (Opps, Avg Ticket, Close Rate, Revenue) | Non visible | Bouton « View current job » contour, plein écran | Chiffres sur 30 jours ; adresse avec icône ; dense, pensé pour l'équipe, pas pour un solo | `servicetitan/` |
| Housecall Pro | Terrain | Planning, devis, équipes | Non visible | Non visible | Non visible | Barre de 4 actions en haut de l'écran devis (Approve, Estimate, Copy to Job, More) | Fiche client avec photo de la rue, icônes appel / message / carte à côté du client, lignes de prestation avec total | `housecall-pro/` |
| Tradify | Terrain, devis/factures | Demandes, devis, factures | Non visible | Écran « Sales » : sections Enquiries, Quotes, Invoices avec compteurs par statut (To Do 6, Draft 11) et bouton « New … » sous chaque section | Section « Enquiries » avec compteur « To Do » | Boutons contour bleus « New Enquiry », « New Quote » | Pastilles de couleur par statut + compteur ; vue carte du planning | `tradify/` |
| Obat | Français, bâtiment | Gestion d'entreprise du bâtiment : CA, encaissé, chantiers, devis | Non visible | Haut : CA du mois, encaissé, montant « en retard » en rouge, histogramme 12 mois ; dessous liste « Chantiers » avec barres de progression | Cloche avec pastille « +9 » en haut à droite | Non visible (captures marketing) | Recherche unique qui renvoie chantiers et devis avec étiquette de type ; point de couleur = statut du devis | `obat/` |
| Planity Pro | Français, pro beauté | Agenda du salon sur téléphone | Connexion e-mail + mot de passe, bouton vert plein « Se connecter », liens « Première connexion » et « Mot de passe oublié » | Non visible | Non visible | « Se connecter » vert, pleine largeur | Écran presque vide : 2 champs, 1 bouton, icônes dans les champs, œil pour le mot de passe, lien client séparé en bas | `planity-pro/` |
| Doctolib Pro | Français, santé | Agenda et messagerie des soignants | Non visible | Agenda en colonnes jour/semaine, bouton « + » rond en bas à droite, barre d'onglets en bas | Non visible | Bouton « + » rond flottant | Agenda en blocs colorés ; messagerie en bulles ; un seul bouton flottant | `doctolib-pro/` |

Nombre d'images : 37 (dont 2 de la page web, une est un recadrage). Les images App Store sont des visuels marketing, certaines contiennent peu d'interface.

## 2. Patterns à reprendre (10 max)

1. **Un seul flux « Conversations » avec filtres en pastilles** (All / Open / Starred / Archive), une ligne par appel : `rosie/ecran-2.jpg`.
2. **Étapes numérotées en pastilles + bouton principal plein en bas** (« Continue », « Back » à côté en secondaire) : `rosie/ecran-4.jpg`.
3. **Résumé IA en tête de la fiche appel**, audio et transcription dessous : `rosie/ecran-3.jpg`.
4. **Bouton de contact direct à côté du nom** (appel, message) : `housecall-pro/ecran-2.jpg`, `rosie/ecran-3.jpg` (bouton « Message »).
5. **Statuts en pastille de couleur + compteur**, une section par étape (To Do, Draft, Awaiting) : `tradify/ecran-1.jpg`.
6. **Chiffres de la période en bloc de 2 x 3 sur l'accueil** : `servicetitan/ecran-2.jpg`. Pour nous : 3 chiffres seulement.
7. **Montant en retard / à traiter en rouge, le reste neutre** ; cloche avec pastille de compteur : `obat/ecran-2.jpg`.
8. **Écran de connexion minimal** : 2 champs, un gros bouton vert, liens discrets : `planity-pro/ecran-2.jpg`.
9. **Un seul bouton flottant rond « + »** pour l'action fréquente : `doctolib-pro/ecran-2.jpg`.
10. **Recherche unique avec étiquette de type** (Chantier / Devis) et point de statut : `obat/ecran-3.jpg`.

## 3. À éviter

1. Onglets texte nombreux en haut (6 onglets) et chiffres denses : `servicetitan/ecran-2.jpg`. Trop pour un solo sur chantier.
2. Barre d'actions à 4 icônes sans libellé fort, boutons contour pâles : `housecall-pro/ecran-2.jpg`, `tradify/ecran-1.jpg`.
3. Écran de connexion par mot de passe : on garde le lien magique.
4. Anglais et jargon (Opps, Enquiries, Close Rate) : tout en français simple (« Urgence », « À rappeler »).
5. Lignes « Anonymous Caller » sans info utile : toujours afficher le besoin résumé en tête de ligne.

## 4. Recommandations pour les 8 écrans P1 (`docs/roadmap-design.md`)

1. **Connexion** : suivre Planity Pro (champ e-mail, un gros bouton vert, lien discret) ; « Voir la démo » en bouton secondaire contour sous le principal, comme « Prendre rendez-vous en ligne » (`planity-pro/ecran-2.jpg`).
2. **Onboarding 1, votre activité** : pastilles d'étapes de Rosie (`rosie/ecran-4.jpg`), un champ par écran, « Continue » en bas. Fiche pré-remplie : lignes éditables courtes.
3. **Onboarding 2, votre assistante** : même gabarit d'étape ; cartes de voix empilées, une action « écouter » par carte (pas de capture de référence, à composer).
4. **Onboarding 3, votre numéro** : même gabarit ; numéro en grands chiffres comme le clavier de fonio (`fonio/ecran-2.jpg`).
5. **Onboarding 4, c'est prêt** : un seul numéro géant et un seul bouton « Appeler pour tester » ; bouton vert d'appel façon fonio.
6. **Dashboard** : 3 chiffres en haut (inspiré d'Obat `obat/ecran-2.jpg` et ServiceTitan), dessous liste façon Rosie avec urgences d'abord en rouge ; pastille de compteur sur la cloche.
7. **Fiche appel / client** : résumé IA en tête (Rosie `ecran-3`), bouton « Rappeler » plein en bas, statut en pastilles (Tradify), transcription repliée.
8. **SMS d'urgence** : aucune référence visuelle trouvée. Message court : mot « URGENT », besoin, adresse, numéro cliquable.

## Limites

- reception.ai n'a pas pu être capturé (site injoignable) ; la page `reception-ai-web/` est celle d'ElevenLabs Agents, peu utile pour l'UI.
- Goodcall et Tolteck : pas d'app trouvée dans l'App Store fr/us avec ce nom. Remplacés par Rosie, Housecall Pro, Obat.
- Les captures sont celles de l'éditeur : les écrans réels peuvent avoir changé.
