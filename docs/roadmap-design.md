# Roadmap design (Elior)

Mobile d'abord : l'artisan est sur chantier, téléphone en main. Puis la version ordinateur.
Référence : `references/reception-ai/` (captures). Le code suit `PROJET.md` (contrat d'API) : chaque écran a déjà sa route.

## P1 — pour la démo (avant 18 h)

| # | Écran | Contenu | Route API |
|---|---|---|---|
| 1 | Connexion | e-mail → lien magique ; bouton « Voir la démo » | /api/auth/* |
| 2 | Onboarding 1 : votre activité | champ « adresse de votre site » ou « je n'ai pas de site » ; écran d'attente du scan (animé, GSAP) ; fiche pré-remplie à valider : nom, métier, ville, description, horaires, prix et questions fréquentes | /api/onboarding/scan, /api/business, /api/business/hours, /api/faqs |
| 3 | Onboarding 2 : votre assistante | cartes de voix avec bouton écouter ; message d'accueil modifiable | /api/voices, /api/agent |
| 4 | Onboarding 3 : votre numéro | votre portable (sonne en premier) ; durée de sonnerie ; choisir un numéro | /api/numbers/* |
| 5 | Onboarding 4 : c'est prêt | le numéro à appeler pour tester ; comment le donner aux clients | – |
| 6 | Dashboard : accueil | chiffres de la semaine (appels, urgences, nouveaux clients) ; derniers appels, urgences en haut | /api/stats, /api/calls |
| 7 | Fiche d'un appel / client | résumé, urgence, besoin, adresse ; bouton « Rappeler » ; statut (nouveau → rappelé → devis → gagné / perdu) ; transcription repliée | /api/leads/:id |
| 8 | SMS d'urgence | ce que l'artisan reçoit sur son téléphone (pour la démo) | – |

## P2 — si le temps le permet (18 h → 20 h)

| # | Écran | Contenu |
|---|---|---|
| 9 | Liste des clients (CRM) | filtres par statut |
| 10 | Réglages / mode avancé | horaires, base de connaissances et prix, accueil, voix, agenda Google |
| 11 | Mail récap du lundi | modèle d'e-mail |

## P3 — pour le pitch seulement

| # | Écran | Contenu |
|---|---|---|
| 12 | Page d'accueil | le pitch : trouvez plus de clients, ne les perdez plus |
| 13 | Le hub (« bientôt ») | site web, fiche Google, réseaux sociaux, pubs |
