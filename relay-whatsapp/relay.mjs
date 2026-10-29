// WhatsApp relay for the demo: the Worker queues the post-call messages (table whatsapp_outbox),
// this process on Elior's Mac sends them from the GRNBL WhatsApp number with Baileys, then acks.
// No tunnel: the relay polls the Worker.
//
//   node relay.mjs             polls every 2 s, sends, acks (one log line per message)
//   node relay.mjs --dry-run   polls and prints the queue, sends nothing, acks nothing, no WhatsApp connection
//   node relay.mjs check       connects to WhatsApp, prints the linked number, disconnects
//
// Env: WHATSAPP_RELAY_TOKEN (required except for check), RELAY_URL (default: the demo Worker),
//      GRNBL_WA_AUTH (default: ~/Documents/Code/Perso/grnbl/data/whatsapp-auth, the session Baileys keeps up to date).

import makeWASocket, { Browsers, DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";
import pino from "pino";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const AUTH = process.env.GRNBL_WA_AUTH || path.join(os.homedir(), "Documents/Code/Perso/grnbl/data/whatsapp-auth");
const RELAY_URL = (process.env.RELAY_URL || "https://hack-day-annecy.eliorpom-0bc.workers.dev").replace(/\/+$/, "");
const TOKEN = process.env.WHATSAPP_RELAY_TOKEN;
const POLL_MS = 2000;
const OPEN_TIMEOUT_MS = 60_000;

const args = process.argv.slice(2);
const mode = args.includes("check") ? "check" : args.includes("--dry-run") ? "dry-run" : "run";

const log = (...parts) => console.log(new Date().toLocaleTimeString("fr-FR"), ...parts);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mask = (digits) => `${"•".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;

// "+33 6 12 34 56 78" or "0612345678" → "33612345678"
function toDigits(phone) {
  let d = String(phone).replace(/\D/g, "");
  if (d.length === 10 && d.startsWith("0")) d = `33${d.slice(1)}`;
  return d;
}

// ---- Worker side ----

async function api(pathname, init = {}) {
  const res = await fetch(`${RELAY_URL}/api/whatsapp-relay/${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 401) throw new Error("401: WHATSAPP_RELAY_TOKEN differs from the Worker secret (or the secret is not set)");
  if (!res.ok) throw new Error(`${pathname} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}
const fetchOutbox = async () => (await api("outbox")).messages ?? [];
const ack = (id, error) => api("ack", { method: "POST", body: JSON.stringify(error ? { id, error } : { id }) });

// ---- WhatsApp side ----

// Opens a socket on the GRNBL session; resolves once connected. `onClose(code)` fires if it drops later.
async function connect(onClose = () => {}) {
  if (!existsSync(path.join(AUTH, "creds.json"))) throw new Error(`No WhatsApp session in ${AUTH}`);
  const { state, saveCreds } = await useMultiFileAuthState(AUTH);
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    browser: Browsers.macOS("grnbl"),
    markOnlineOnConnect: false, // the phone keeps receiving its own notifications
    syncFullHistory: false,
  });
  sock.ev.on("creds.update", saveCreds);
  await new Promise((resolve, reject) => {
    let open = false;
    const timer = setTimeout(() => reject(new Error(`WhatsApp did not connect within ${OPEN_TIMEOUT_MS / 1000} s`)), OPEN_TIMEOUT_MS);
    sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
      if (connection === "open") { open = true; clearTimeout(timer); resolve(); }
      if (connection === "close") {
        const code = lastDisconnect?.error?.output?.statusCode;
        clearTimeout(timer);
        if (open) onClose(code);
        else if (code === DisconnectReason.restartRequired) connect(onClose).then((s) => { sock.reconnected = s; resolve(); }, reject);
        else reject(Object.assign(new Error(`Connection closed (${code ?? "unknown"})`), { code }));
      }
    });
  });
  return sock.reconnected ?? sock;
}

// ---- Modes ----

async function check() {
  const sock = await connect();
  const digits = (sock.user?.id ?? "").split(/[:@]/)[0];
  log(`Connecté. Compte lié : +${mask(digits)} (${sock.user?.name ?? "sans nom"})`);
  await sleep(2000); // let Baileys save the refreshed keys
  sock.end(undefined);
  process.exit(0);
}

async function dryRun() {
  log(`Lecture seule de ${RELAY_URL} toutes les ${POLL_MS / 1000} s (rien n'est envoyé ni acquitté).`);
  const seen = new Set();
  for (;;) {
    try {
      for (const m of await fetchOutbox()) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        log(`[dry-run] ${m.id} → ${toDigits(m.to_phone)}@s.whatsapp.net\n${m.body}\n`);
      }
    } catch (e) {
      log(`Erreur de lecture : ${e.message}`);
    }
    await sleep(POLL_MS);
  }
}

async function run() {
  let sock = null;
  // id → error|null: sent (or failed) but the ack has not reached the Worker yet; never re-sent
  const toAck = new Map();
  const handled = new Set();

  const open = async () => {
    for (let attempt = 1; ; attempt++) {
      try {
        sock = await connect((code) => {
          sock = null;
          if (code === DisconnectReason.loggedOut) {
            log("Session WhatsApp déconnectée (logged out) : il faut relier à nouveau le compte GRNBL. Arrêt.");
            process.exit(1);
          }
          log(`Connexion WhatsApp perdue (${code ?? "inconnu"}), reconnexion…`);
          open();
        });
        log(`WhatsApp connecté (+${mask((sock.user?.id ?? "").split(/[:@]/)[0])}).`);
        return;
      } catch (e) {
        if (e.code === DisconnectReason.loggedOut) {
          log("Session WhatsApp déconnectée (logged out) : il faut relier à nouveau le compte GRNBL. Arrêt.");
          process.exit(1);
        }
        const wait = Math.min(30_000, 2000 * attempt);
        log(`Connexion impossible (${e.message}), nouvel essai dans ${wait / 1000} s.`);
        await sleep(wait);
      }
    }
  };

  const flushAcks = async () => {
    for (const [id, error] of toAck) {
      try { await ack(id, error); toAck.delete(id); } catch (e) { log(`Acquittement de ${id} en attente : ${e.message}`); return; }
    }
  };

  const deliver = async (m) => {
    const digits = toDigits(m.to_phone);
    let error = null;
    try {
      const [hit] = (await sock.onWhatsApp(`${digits}@s.whatsapp.net`)) ?? [];
      if (!hit?.exists) error = "not on WhatsApp";
      else await sock.sendMessage(hit.jid, { text: m.body });
    } catch (e) {
      error = String(e.message ?? e).slice(0, 300);
    }
    handled.add(m.id);
    toAck.set(m.id, error);
    log(error ? `ÉCHEC  ${m.id} → +${mask(digits)} : ${error}` : `ENVOYÉ ${m.id} → +${mask(digits)} (${m.body.length} car.)`);
  };

  await open();
  log(`Relais actif sur ${RELAY_URL}, interrogation toutes les ${POLL_MS / 1000} s.`);
  for (;;) {
    try {
      await flushAcks();
      if (sock) {
        for (const m of await fetchOutbox()) {
          if (handled.has(m.id) || !sock) continue;
          await deliver(m);
        }
        await flushAcks();
      }
    } catch (e) {
      log(`Erreur : ${e.message}`);
    }
    await sleep(POLL_MS);
  }
}

if (mode !== "check" && !TOKEN) {
  console.error("WHATSAPP_RELAY_TOKEN manquant (même valeur que le secret du Worker).");
  process.exit(1);
}
try {
  await (mode === "check" ? check() : mode === "dry-run" ? dryRun() : run());
} catch (e) {
  console.error(e.message ?? String(e));
  process.exit(1);
}
