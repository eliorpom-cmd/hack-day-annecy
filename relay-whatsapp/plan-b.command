#!/bin/zsh
# Plan B for the demo: backup WhatsApp relay on Elior's Mac, from the GRNBL number (…1570).
# It sends a message only if the main relay (Maxime's Mac) has not sent it within 20 s, so nothing goes out twice.
# Double-click in Finder, or run it in Terminal. Keep the window open; the Mac does not sleep while it runs.
cd "$(dirname "$0")"
if ! grep -q '^WHATSAPP_RELAY_TOKEN=.' .env 2>/dev/null; then
  echo "Il manque le jeton : créez relay-whatsapp/.env avec la ligne WHATSAPP_RELAY_TOKEN=<le jeton de Cloudflare>"
  exit 1
fi
[ -d node_modules ] || npm install
# GRNBL session: only one program at a time may use it
if lsof +D "$HOME/Documents/Code/Perso/grnbl/data/whatsapp-auth" >/dev/null 2>&1; then
  echo "La session WhatsApp GRNBL est déjà ouverte par un autre programme : fermez-le d'abord."
  exit 1
fi
exec caffeinate -i node relay.mjs --secours
