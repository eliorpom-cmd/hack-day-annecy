# Répétition de la démo (3 min)

App : https://hack-day-annecy.eliorpom-0bc.workers.dev, ouverte sur le téléphone d'Elior, écran projeté.

## Avant de répéter (une fois)

- [ ] Clés de Mathieu branchées (ElevenLabs, Twilio) et app republiée
- [ ] Un numéro Twilio déjà acheté (on le relie pendant la démo, on ne l'achète pas en direct)
- [ ] Bac à sable WhatsApp Twilio activé, téléphone d'Elior inscrit
- [ ] Secret du webhook ElevenLabs posé (adresse : `/api/elevenlabs/post-call`)
- [ ] Un essai complet réussi, filmé (plan B)

## Déroulé

### 1 · La configuration en direct (≈ 60 s)

1. Page de connexion → **« Essayer la configuration »** (compte vierge à chaque fois, on peut répéter autant qu'on veut).
2. **Votre activité** : taper `plombier-annecy.fr` → « Lecture de votre site… » (≈ 17 s, testé) → la fiche, les horaires et les prix se remplissent. Montrer : « on n'a rien tapé ». Mettre le prénom et le portable d'Elior.
3. **Voix du répondeur** : choisir une voix (ou « Utiliser ma voix » si le clonage est prêt), montrer le message d'accueil.
4. **Votre numéro** : relier le numéro Twilio déjà acheté.
5. **Essai** : le numéro s'affiche en grand.

### 2 · L'appel en direct (≈ 60 s)

1. Maxime appelle le numéro. Le portable d'Elior sonne : **il refuse l'appel** devant le jury.
2. Le répondeur décroche. Scénario : « J'ai une fuite sous l'évier, ça coule dans le salon. » Le répondeur demande nom, adresse, juge l'urgence, ne donne que les prix connus.
3. Raccrocher.

### 3 · Ce que reçoit l'artisan (≈ 45 s)

1. Le WhatsApp arrive : « 🔴 Urgence : fuite d'eau, … », la raison, l'adresse, le numéro, le lien.
2. Ouvrir le lien → la page de l'appel. Appuyer sur **Rappeler**, revenir : « Avez-vous eu … ? »
3. Montrer **Visibilité** : le site web généré à partir de la lecture du site.

## Plan B

- Le WhatsApp n'arrive pas : montrer la page d'un appel de démo, https://hack-day-annecy.eliorpom-0bc.workers.dev/a/demo-fuite
- Le répondeur ne décroche pas : passer la vidéo de l'essai réussi.
- Le réseau tombe : la vidéo.

## Tests à faire maintenant (sans les clés)

- [ ] Configuration complète avec « Essayer la configuration » sur le téléphone, jusqu'à l'étape 2 (les étapes 2 et 3 affichent une erreur claire sans les clés, c'est normal)
- [ ] Liste des appels et page d'un appel avec « Voir la démo »
- [ ] Rappeler → revenir → la question s'affiche
