# Répondeur artisans — Design

> Fond blanc froid #f1f4f8, blocs blancs à bordure fine, texte marine, une icône par information. Un seul bouton vert menthe à texte marine en bas de l'écran. Le rouge et l'orange ne servent qu'à la priorité d'un appel.

- **Surface** : app web mobile d'abord (page d'un appel ouverte depuis le message WhatsApp, liste des appels, configuration), Astro 7 + Tailwind 4 dans `web/`
- **Base** : Material Design 3 ; écarts listés en fin de fichier
- **Origine** : créé le 2026-10-29, chaque valeur choisie par Elior étape par étape (`docs/design-choix/`, pages 1 à 5)
- **Mis à jour** : 2026-10-29 (vue ordinateur, étape 6 option C)
- **Fichiers de tokens** : `web/src/styles/global.css`
- **Textes** : `COPY.md`

## Principes

1. Une seule action principale par écran : le bouton vert, en bas, pleine largeur.
2. Chaque information est un bloc blanc (bordure 1 px `--line`) sur le fond `--page`, avec une icône dans une pastille `--tint` à gauche.
3. La couleur signale, elle ne décore pas : vert = agir, rouge = Urgence, orange = Prioritaire. Tout le reste est marine, gris et blanc.
4. Trois tailles de texte (30 / 17 / 14). La hiérarchie passe d'abord par la graisse (400 / 700), l'italique (la raison d'une urgence) et le gris `--muted`.
5. Toute surface remplie (bloc, bouton, pastille, icône) a un trait de 1 px un ton plus foncé que son fond ; aucune ombre.

## Couleurs

| Nom | Valeur | Token | Rôle |
|---|---|---|---|
| Page | `#f1f4f8` | `--page` | fond de l'écran (blanc froid) |
| Surface | `#ffffff` | `--surface` | blocs, lignes de liste, fenêtres |
| Ligne | `#dbe2ea` | `--line` | bordure des blocs, séparateurs |
| Encre | `#0b2545` | `--ink` | titres, texte, retour, icônes d'info, texte du bouton principal |
| Texte secondaire | `#5f6b7a` | `--muted` | étiquettes, heures, sous-titres |
| Action | `#4ee494` | `--action` | fond du bouton principal |
| Bord d'action | `#2fc777` | `--action-line` | bordure du bouton principal |
| Action sur clair | `#007d35` | `--action-ink` | icônes des raccourcis et du bouton d'appel en liste |
| Teinte | `#ddf6e5` | `--tint` | pastille derrière les icônes, bouton d'appel en liste |
| Bord de teinte | `#b4e6c6` | `--tint-line` | bordure des surfaces `--tint` |
| Urgence | `#d70015` / fond `#fde8ea` / bord `#f5c2c8` | `--urgence`, `--urgence-bg`, `--urgence-line` | pastille Urgence |
| Prioritaire | `#c25e00` / fond `#fdf0e3` / bord `#f1d2b0` | `--prio`, `--prio-bg`, `--prio-line` | pastille Prioritaire |
| Neutre | `#5f6b7a` / fond `#e9eef3` / bord `#d3dbe4` | `--neutral`, `--neutral-bg`, `--neutral-line` | icônes neutres, fond des champs |
| Voile | `rgba(11,37,69,.45)` | `--scrim` | derrière une fenêtre |

Pas de mode sombre pour l'instant.

## Typographie

- **Famille** : Atkinson Hyperlegible Next (tout le texte), graisses 400 et 700, italique 400
- **Chargement** : Google Fonts

| Rôle | Taille | Graisse | Interlignage | Token |
|---|---|---|---|---|
| Titre d'écran (« Fuite d'eau », « Appels ») | 30 px | 700 | 1.1 | `--t-title` |
| Corps, noms, valeurs, boutons | 17 px | 400 / 700 | 1.35 | `--t-body` |
| Étiquettes, heures, pastilles, aide | 14 px | 400 / 700 | 1.35 | `--t-small` |

Exceptions Material : titre de fenêtre 22 px / 700 ; étiquette flottante d'un champ rempli 12 px / 700.

## Espace et mise en page

- **Unité** : 4 px ; échelle 4 · 8 · 12 · 14 · 16 · 24
- **Marges de l'écran** : 16 px sur les côtés
- **Entre deux blocs** : 14 px
- **Intérieur d'une ligne de bloc** : 12 px vertical, 14 px horizontal
- **Barre du bas** : 12 px au-dessus, 24 px en dessous (zone du pouce), fond `--page`
- **Largeur max** : 480 px, centrée (au-delà, l'écran mobile reste centré)
- **Ordinateur (≥ 1024 px, `lg`)** : `layouts/AppShell.astro`. Barre latérale 240 px (fond `--surface`, trait droit 1 px `--line`, 24 px en haut et en bas, 16 px sur les côtés) avec le logo, le menu (Appels, Visibilité, Réglages) et « Se déconnecter » en bas. Sous 1024 px, rien ne change : pas de barre latérale.
- **Logo (provisoire)** : tuile `--action` à bord 1 px `--action-line`, icône Lucide téléphone `--ink` ; 34 px (arrondi 10 px) dans la barre latérale, 64 px (arrondi 14 px) dans l'état vide, nom « Répondeur » en 17 px / 700.
- **Lien du menu** : 48 px de haut, 12 px sur les côtés, arrondi 12 px, 17 px / 700 `--muted` ; actif : fond `--page`, trait 1 px `--line`, texte `--ink`. « Appels » porte le nombre d'urgences à rappeler dans une pastille Urgence.
- **Appels sur ordinateur** : en haut, 3 chiffres de la semaine (blocs, nombre 30 px / 700, libellé 14 px `--muted`, « urgences » en `--urgence`), marges 24 px ; dessous, liste 380 px (24 px de marge, trait droit `--line`) et appel choisi à droite (32 px sur les côtés, 24 px en haut), chacun défilant seul. Détail : grille de blocs sur 2 colonnes à 14 px d'écart, boutons côte à côte en bas (24 px sur les côtés). Ligne choisie : trait gauche 3 px `--action-line`.

## Formes et profondeur

| Élément | Arrondi | Bordure | Ombre |
|---|---|---|---|
| Bloc, ligne de liste groupée | 14 px | 1 px `--line` | aucune |
| Bouton principal / secondaire | 16 px, hauteur 56 px | 1 px `--action-line` / 2 px `--ink` | aucune |
| Raccourci (Itinéraire, Message) | 14 px | 1 px `--line` | aucune |
| Pastille de priorité | 8 px | 1 px bord de sa couleur | aucune |
| Pastille d'icône | 8 px, 30 × 30 px | 1 px `--tint-line` | aucune |
| Bouton d'appel en liste | 12 px, 40 × 40 px | 1 px `--tint-line` | aucune |
| Champ rempli | 4 px en haut, 0 en bas | trait bas 1 px `--muted`, 2 px `--ink` en saisie | aucune |
| Filtre segmenté | 10 px | aucune | aucune |
| Fenêtre | 28 px | 1 px `--line` | aucune, voile `--scrim` |

## Composants

### Bouton principal
L'action de l'écran (« Rappeler », « Continuer »). Fond `--action`, texte `--ink` 17 px / 700, icône Lucide 20 px à gauche, 56 px, pleine largeur, arrondi 16 px, bord 1 px `--action-line`.

### Bouton secondaire
Action d'appoint (« Marquer comme rappelé », « Non, pas de réponse »). Fond blanc, texte `--ink` 17 px / 700, trait 2 px `--ink`, mêmes dimensions. Jamais de coche dans le libellé.

### Pastille de priorité
« Urgence » (rouge) ou « Prioritaire » (orange) ; Normal n'a pas de pastille. 14 px / 700, padding 2 × 8 px, couleur sur son fond teinté.

### Ligne d'appel (liste)
Pastille à gauche du nom (700), sous-ligne « panne · heure » en 14 px `--muted`, bouton d'appel à droite (`--tint`, icône `--action-ink`). Lignes groupées par jour dans un bloc ; titre de groupe (« Aujourd'hui ») en 14 px / 700 `--muted`.

### Page d'un appel
Retour « ‹ Appels » (`--ink`), pastille, nom du client en titre 30 px, « Appel il y a 12 min » en 14 px `--muted`, bloc « Demande », raccourcis Itinéraire et Message, bloc « Pourquoi c'est urgent » (texte en italique), bloc Adresse + Téléphone (icône, étiquette 14 px, valeur 17 px), bloc « Contenu de la conversation › », puis en bas « Rappeler » et « Marquer comme rappelé ».

### Champ de saisie (Material rempli)
Fond `--neutral-bg`, hauteur 56 px. Vide : seulement son nom en 17 px `--muted`. En saisie ou rempli : nom flottant 12 px / 700 au-dessus de la valeur. Aide dessous en 14 px `--muted` (« Exemple : plomberie-martin.fr »). Jamais de valeur d'exemple dans le champ. Valeur trouvée sur le site : aide « Trouvé sur votre site. Corrigez si besoin. »

### Progression de la configuration
4 segments de 6 px (faits en `--ink`, à faire en `--line`), puis « 2 sur 4 · Voix du répondeur » (14 px, nombre en 700).

### Fenêtre au retour d'un rappel
S'ouvre au retour dans l'app après « Rappeler » ; ne se ferme qu'en répondant. Titre « Avez-vous eu Mme Lefèvre ? » (22 px / 700), rappel « Fuite d'eau · appel lancé à 14 h 40 », puis « Oui, c'est fait » (principal) et « Non, pas de réponse » (secondaire).

### Filtre segmenté
« À rappeler · 3 » / « Tous », fond `--neutral-bg`, segment actif blanc à bordure `--line`, texte 14 px / 700.

### Page d'accueil
La page publique (`web/src/pages/index.astro`, `web/src/components/landing/`) garde les couleurs, la police, les boutons et les blocs de l'app, et ajoute une échelle d'affichage qui ne sert qu'à elle (classes `.l-*` dans `index.astro`). Registre apple-like ; deux gestes : le téléphone du hero coupé par le bas de la section, et un seul bloc sur fond `--ink` (les faits).

| Rôle | Mobile | Bureau (≥ 1024 px) | Graisse | Interlignage | Approche |
|---|---|---|---|---|---|
| Titre du hero | 44 px | 80 px | 700 | 1.02 | −0,03 em |
| Titre de section | 34 px | 52 px | 700 | 1.06 | −0,02 em |
| Chiffre du bloc de faits | 64 px | 96 px | 700 | 1 | −0,03 em |
| Titre de carte | 22 px | 22 px | 700 | 1.2 | 0 |
| Accroche sous un titre | 19 px | 21 px | 400, `--muted` (`--line` sur `--ink`) | 1.45 | 0 |

- **Logo provisoire** : tuile 34 px, arrondi 10 px, fond `--action`, bord 1 px `--action-line`, icône Lucide `phone` 18 px `--ink`, puis « Répondeur » 17 px / 700.
- **Mise en page** : conteneur 1200 px max, marges 20 px (mobile) et 40 px (bureau) ; sections espacées de 64 px (mobile) et 112 px (bureau) en haut et en bas ; fonds alternés `--page` / `--surface`, une seule section `--ink`.
- **Cartes** : arrondi 28 px (`--radius-dialog`), bord 1 px `--line`, intérieur 20 px (mobile) et 28 px (bureau) ; visuel en tête de carte à arrondi 20 px.
- **Maquettes d'écran** : écrans de l'app reconstruits en HTML avec les classes de l'app, dans un cadre de téléphone `--ink` (arrondi 58 px) mis à l'échelle avec `zoom` (0,78 mobile, 0,86 à 1 bureau). Aucune image.
- **Bouton « Se connecter »** (en-tête) : 40 px de haut, arrondi 12 px, trait 2 px `--ink`, 14 px / 700. Le seul bouton vert d'un écran reste « Essayer gratuitement ».
- **Mouvement** : apparitions au défilement en 800 ms `expo.out` (GSAP), montée de 20 px (60 px pour le téléphone du hero), décalage 80 ms ; survols 180 ms. Avec `prefers-reduced-motion` : aucune animation. Sans JS, tout est visible.
- **Pastilles du hub** : « Disponible » en `--tint` / `--action-ink`, « Bientôt » en couleurs neutres.

## Médias et icônes

- **Icônes** : Lucide, trait 2 px, 18-20 px, couleur `--ink` (info) ou `--action-ink` (action)
- Pas d'image ni d'illustration dans l'app.

## À faire

- Garder le bouton principal dans la barre du bas, visible sans défiler.
- Relire tout texte avec `COPY.md` (mots, longueurs).
- Mettre une icône Lucide devant chaque information d'un bloc.
- Cibles tactiles de 48 px minimum.

## À éviter

- Une ombre (la profondeur vient des bordures).
- Une quatrième taille de texte hors des deux exceptions Material.
- Le rouge ou l'orange ailleurs que sur la priorité d'un appel.
- Un texte pré-rempli qui ressemble à une vraie valeur.
- Deux boutons verts sur le même écran.

## Écarts avec Material Design 3

- Boutons à arrondi 16 px et hauteur 56 px (M3 classique : pilule de 40 dp) : choix d'Elior, plus facile à toucher sur chantier.
- Blocs groupés à bordure façon fiche contact iPhone plutôt que cartes M3 à élévation.
- Police Atkinson Hyperlegible Next au lieu de Roboto ; échelle réduite à 3 tailles au lieu des 15 rôles M3.

## Tokens

```css
@theme {
  --font-sans: "Atkinson Hyperlegible Next", system-ui, sans-serif;
  --color-page: #f1f4f8;
  --color-surface: #ffffff;
  --color-line: #dbe2ea;
  --color-ink: #0b2545;
  --color-muted: #5f6b7a;
  --color-action: #4ee494;
  --color-action-line: #2fc777;
  --color-action-ink: #007d35;
  --color-tint: #ddf6e5;
  --color-tint-line: #b4e6c6;
  --color-urgence: #d70015;
  --color-urgence-bg: #fde8ea;
  --color-urgence-line: #f5c2c8;
  --color-prio: #c25e00;
  --color-prio-bg: #fdf0e3;
  --color-prio-line: #f1d2b0;
  --color-neutral: #5f6b7a;
  --color-neutral-bg: #e9eef3;
  --color-neutral-line: #d3dbe4;
  --color-scrim: rgba(11, 37, 69, 0.45);
  --text-title: 30px;
  --text-title--line-height: 1.1;
  --text-body: 17px;
  --text-body--line-height: 1.35;
  --text-small: 14px;
  --text-small--line-height: 1.35;
  --radius-chip: 8px;
  --radius-call: 12px;
  --radius-filter: 10px;
  --radius-block: 14px;
  --radius-button: 16px;
  --radius-dialog: 28px;
}
```
