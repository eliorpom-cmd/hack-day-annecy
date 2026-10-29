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
