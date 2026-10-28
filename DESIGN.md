# Projet du hackathon — Design

> Outil de travail clair : fond blanc cassé #fafafa, cartes blanches à bord fin, texte presque noir, une seule couleur d'accent sur l'action principale de chaque écran.

- **Surface** : app web (Next.js + Tailwind 4 + shadcn/ui prévu ; à corriger si la stack change)
- **Registre** : minimal (outil métier, pas une page de vente)
- **Gestes** : aucun
- **Origine** : créé le 2026-10-27 pour le kit d'équipe ; tokens aux noms de shadcn/ui, valeurs choisies par Claude d'après le goût d'Elior (pages produit Apple). À ajuster par Elior sur place (accent = couleur de l'entreprise si elle en a une).
- **Mis à jour** : 2026-10-27
- **Fichiers de tokens** : `app/globals.css` (bloc final à coller)

## Principes

1. **Une action principale par écran**, en `--primary`. Tout le reste est en bouton secondaire ou en lien.
2. **Le texte vit en deux tons** : `--foreground` (contenu) et `--muted-foreground` (aide, légendes, dates). Aucun gris en dur.
3. **Aucune valeur hors des tokens** : couleur, arrondi, ombre et durée viennent du bloc final. Besoin d'une nouvelle valeur → l'ajouter ici d'abord.
4. **Composants shadcn/ui tels quels** avant d'en écrire un nouveau (Button, Card, Input, Table, Dialog, Badge, Toast).
5. **Les états vides et le chargement sont dessinés** : jamais d'écran blanc pendant un appel à l'IA (squelette ou message « Analyse en cours… »).

## Couleurs

| Nom | Clair | Sombre | Token | Rôle |
|---|---|---|---|---|
| Fond | `#fafafa` | `#0a0a0a` | `--background` | fond de l'écran |
| Texte | `#0a0a0a` | `#f5f5f5` | `--foreground` | contenu |
| Surface | `#ffffff` | `#141414` | `--card` | cartes, panneaux, dialogues |
| Texte secondaire | `#6b6b6b` | `#a1a1a1` | `--muted-foreground` | aide, légendes, dates |
| Fond discret | `#f0f0f0` | `#1f1f1f` | `--muted` | survol de ligne, zones désactivées |
| Ligne | `#e5e5e5` | `#262626` | `--border` | bords de cartes, séparateurs, champs |
| Accent | `#2563eb` | `#3b82f6` | `--primary` | action principale, lien, focus |
| Texte sur accent | `#ffffff` | `#ffffff` | `--primary-foreground` | texte des boutons principaux |
| Erreur | `#dc2626` | `#ef4444` | `--destructive` | erreurs, suppression |
| Succès | `#16a34a` | `#22c55e` | `--success` | confirmation, statut « fait » |

`--card-foreground`, `--popover*`, `--secondary*`, `--accent*`, `--input` et `--ring` sont des alias exigés par shadcn/ui : ils reprennent les valeurs ci-dessus (texte, surface, fond discret, ligne, accent).

## Typographie

- **Famille** : Geist Sans (tout le texte), Geist Mono (chiffres de tableau, codes, identifiants)
- **Chargement** : `next/font` (`geist` est la police par défaut de `create-next-app`)

| Rôle | Desktop | Mobile | Graisse | Interlignage | Tracking | Classe |
|---|---|---|---|---|---|---|
| Titre d'écran | 30 px | 24 px | 600 | 1.2 | −0.02 em | `text-3xl` / `text-2xl` |
| Titre de section | 20 px | 18 px | 600 | 1.3 | −0.01 em | `text-xl` / `text-lg` |
| Corps | 15 px | 15 px | 400 | 1.55 | 0 | `text-[15px]` |
| Petit / légende | 13 px | 13 px | 400 | 1.4 | 0 | `text-[13px]` |

Mesure des paragraphes : 70 ch au plus. Chiffres alignés dans les tableaux : `tabular-nums`.

## Espace et mise en page

- **Unité** : 4 px (échelle Tailwind)
- **Échelle** : 4 · 8 · 12 · 16 · 24 · 32 · 48
- **Largeur max du contenu** : 1120 px ; formulaires 560 px
- **Gouttière** : 16 px mobile · 32 px desktop
- **Grille** : barre du haut (nom du projet + action principale) ; contenu centré ; tableaux et listes pleine largeur du conteneur. Pas de barre latérale sous 3 écrans.

## Formes et profondeur

| Élément | Arrondi | Bordure | Ombre |
|---|---|---|---|
| Carte, panneau | 12 px (`--radius`) | 1 px `--border` | aucune |
| Champ, bouton | 8 px | 1 px `--border` (champ) | aucune |
| Dialogue, menu | 12 px | 1 px `--border` | `--shadow-float` |
| Badge | capsule | aucune | aucune |

## Mouvement

- **Survol / pression** : 150 ms ease-out (couleur et fond seulement)
- **Dialogues** : 200 ms, fondu + 4 px de montée
- **Réduit** : `prefers-reduced-motion` → fondu seul

## Composants

### Bouton principal
Une fois par écran. Fond `--primary`, texte `--primary-foreground`, hauteur 40 px, padding 0 16 px, 500, arrondi 8 px. Survol : opacité 90 %. Désactivé : opacité 50 %. Pendant un appel : icône de chargement + texte « … en cours ».
Code : `components/ui/button.tsx` (variant `default`)

### Bouton secondaire
Fond `--card`, bord 1 px `--border`, texte `--foreground`, mêmes dimensions. Code : variant `outline`.

### Carte
Fond `--card`, bord `--border`, arrondi 12 px, padding 24 px (16 px mobile). Titre en « Titre de section ».

### Zone de dépôt de fichier
Pour les documents de l'entreprise (PDF, photo, Excel). Bord 1 px pointillé `--border`, arrondi 12 px, hauteur 160 px, texte `--muted-foreground` au centre ; survol avec un fichier : bord `--primary`.

### Tableau
Lignes de 44 px, séparateur `--border`, survol `--muted`, en-têtes en « Petit » `--muted-foreground` 500.

## Médias et icônes

- **Icônes** : Lucide (`lucide-react`), trait 1.5 px, 16 px dans le texte, 20 px seules. Pas de SF Symbols (web).
- **Visuels** : captures des documents réels de l'entreprise, anonymisées.

## À faire

- Ajuster `--primary` à la couleur de l'entreprise si elle en a une (contraste ≥ 4.5:1 avec le blanc).
- Écrire les textes en français simple, verbes d'action sur les boutons (« Analyser le bon », pas « Valider »).
- Prévoir l'état vide, le chargement et l'erreur de chaque écran qui appelle l'IA.

## À éviter

- Plus d'un bouton `--primary` visible dans un même écran.
- Une ombre sur les cartes : seule la couche flottante (dialogue, menu) porte `--shadow-float`.
- Des dégradés, des emojis dans l'interface, du texte gris en dur.
- Une police en plus de Geist Sans et Geist Mono.

## Tokens

```css
:root {
  --background: #fafafa;
  --foreground: #0a0a0a;
  --card: #ffffff;
  --card-foreground: #0a0a0a;
  --popover: #ffffff;
  --popover-foreground: #0a0a0a;
  --muted: #f0f0f0;
  --muted-foreground: #6b6b6b;
  --border: #e5e5e5;
  --input: #e5e5e5;
  --ring: #2563eb;
  --primary: #2563eb;
  --primary-foreground: #ffffff;
  --secondary: #f0f0f0;
  --secondary-foreground: #0a0a0a;
  --accent: #f0f0f0;
  --accent-foreground: #0a0a0a;
  --destructive: #dc2626;
  --success: #16a34a;
  --radius: 0.75rem;
  --shadow-float: 0 8px 24px rgb(0 0 0 / 0.08), 0 1px 2px rgb(0 0 0 / 0.06);
}
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #f5f5f5;
    --card: #141414;
    --card-foreground: #f5f5f5;
    --popover: #141414;
    --popover-foreground: #f5f5f5;
    --muted: #1f1f1f;
    --muted-foreground: #a1a1a1;
    --border: #262626;
    --input: #262626;
    --ring: #3b82f6;
    --primary: #3b82f6;
    --secondary: #1f1f1f;
    --secondary-foreground: #f5f5f5;
    --accent: #1f1f1f;
    --accent-foreground: #f5f5f5;
    --destructive: #ef4444;
    --success: #22c55e;
    --shadow-float: 0 8px 24px rgb(0 0 0 / 0.5);
  }
}
```
