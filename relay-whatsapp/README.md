# Relais WhatsApp (démo)

Après chaque appel, le Worker met le message pour l'artisan dans la table `whatsapp_outbox`. Ce relais, lancé sur le Mac d'Elior, l'envoie depuis le numéro WhatsApp de GRNBL (Baileys, session `~/Documents/Code/Perso/grnbl/data/whatsapp-auth`), puis prévient le Worker. Pas de tunnel : le relais interroge le Worker toutes les 2 s.

Le relais n'est actif que si le secret `WHATSAPP_RELAY_TOKEN` est posé sur le Worker. Sans lui, rien ne change (WhatsApp Twilio ou SMS). Si la mise en file échoue, le Worker envoie un SMS.

## Une fois

```sh
cd relay-whatsapp && npm install
openssl rand -hex 32                                   # le jeton, à garder pour la suite
cd ../web && npx wrangler secret put WHATSAPP_RELAY_TOKEN   # coller le jeton
```

La migration `0014_whatsapp_outbox.sql` part avec `npm run deploy`.

## Le jour de la démo

```sh
cd relay-whatsapp
node relay.mjs check                                   # affiche le compte lié, n'envoie rien
WHATSAPP_RELAY_TOKEN=<jeton> node relay.mjs --dry-run  # lit la file, n'envoie rien
WHATSAPP_RELAY_TOKEN=<jeton> node relay.mjs            # le vrai relais, à laisser ouvert
```

Variables : `RELAY_URL` (par défaut le Worker de démo), `GRNBL_WA_AUTH` (dossier de session).

- Un seul programme à la fois sur la session GRNBL : `lsof +D ~/Documents/Code/Perso/grnbl/data/whatsapp-auth` doit être vide avant de lancer.
- Les messages de plus de 10 min ne sont plus envoyés.
- Un message vers un numéro sans WhatsApp est marqué en erreur, sans nouvel essai.

## Plan B : relais de secours sur le Mac d'Elior

Le relais principal tourne sur le Mac de Maxime. Le Mac d'Elior lance en même temps un relais **de secours** depuis le numéro GRNBL (…1570) : il n'envoie un message que s'il est encore dans la file 20 s après l'avoir vu, donc rien ne part en double.

1. Une fois : créer `relay-whatsapp/.env` (jamais commité) avec `WHATSAPP_RELAY_TOKEN=<le même jeton que sur Cloudflare>`.
2. Double-cliquer `relay-whatsapp/plan-b.command` (ou le lancer dans Terminal). La fenêtre reste ouverte ; le Mac ne se met pas en veille.
3. Le journal affiche `EN ATTENTE` pour chaque message, puis `SECOURS … ENVOYÉ` seulement si le relais principal est tombé.

Plan C, si les deux relais échouent : `bin/dernier-whatsapp` affiche le dernier message et le copie dans le presse-papiers, à coller dans WhatsApp à la main.

## Relier un autre compte WhatsApp (un coéquipier, sur son ordinateur)

Le relais marche avec n'importe quel compte WhatsApp, pas seulement celui de GRNBL. Sur l'ordinateur qui fera le relais :

```sh
cd relay-whatsapp && npm install
node relay.mjs link 33612345678          # son numéro WhatsApp, sans + ; affiche un code de 8 caractères
```

Sur le téléphone : WhatsApp > Appareils connectés > Connecter un appareil > Connecter avec un numéro de téléphone, puis taper le code. La session est enregistrée dans `relay-whatsapp/session/` (jamais commitée). Ensuite :

```sh
WA_AUTH=./session node relay.mjs check
WA_AUTH=./session WHATSAPP_RELAY_TOKEN=<jeton> node relay.mjs
```

Le numéro qui envoie doit être différent de celui qui reçoit (le portable de l'artisan dans l'app).

## Brancher une autre app (Lovable, Supabase…)

Le relais ne dépend pas de l'app : il lit deux adresses sous `RELAY_URL`. Toute app qui les sert, avec le même jeton, marche avec lui.

| Méthode | Adresse | Réponse |
|---|---|---|
| GET | `<RELAY_URL>/api/whatsapp-relay/outbox` | `{"messages":[{"id","to_phone","body"}]}` : messages pas encore envoyés, de moins de 10 min |
| POST | `<RELAY_URL>/api/whatsapp-relay/ack` | corps `{"id"}` (envoyé) ou `{"id","error"}` (échec) → `{"ok":true}` |

Les deux exigent l'en-tête `Authorization: Bearer <WHATSAPP_RELAY_TOKEN>`, sinon 401. `to_phone` est au format `+33612345678` ou `0612345678`. Côté app, après chaque appel : insérer une ligne dans une table équivalente à `web/migrations/0014_whatsapp_outbox.sql` au lieu d'envoyer le message. Code de référence : `web/src/lib/telephony/whatsapp-relay.ts`.
