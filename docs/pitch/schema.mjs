#!/usr/bin/env node
// Builds the call-flow diagrams from one description:
//   docs/pitch/schema-appel.excalidraw   (vue métier + vue technique, à ouvrir sur excalidraw.com)
//   the technical SVG inlined in docs/pitch/schema-appel.html (between the TECH markers)
// Run: node docs/pitch/schema.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// ── Vue technique : lanes and messages, read from web/src/pages/api/{twilio,elevenlabs}
const LANES = [
  { id: "client", x: 90, name: "Client", sub: "l'appelant" },
  { id: "twilio", x: 300, name: "Twilio", sub: "numéro +33" },
  { id: "worker", x: 560, name: "Worker", sub: "Cloudflare · web/", w: 200 },
  { id: "el", x: 820, name: "ElevenLabs", sub: "agent vocal" },
  { id: "d1", x: 1000, name: "D1", sub: "base SQLite" },
  { id: "artisan", x: 1160, name: "Artisan", sub: "portable + WhatsApp" },
];
const PHASES = [
  { y: 92, h: 140, label: "1 · Appel entrant" },
  { y: 232, h: 160, label: "2 · Cascade, pendant les horaires" },
  { y: 392, h: 140, label: "3 · L'agent répond" },
  { y: 532, h: 160, label: "4 · Après l'appel" },
  { y: 692, h: 98, label: "5 · Ensuite" },
];
// todo: not built yet (task 15) ; voice: the live conversation
const MESSAGES = [
  { y: 142, from: "client", to: "twilio", label: "compose le numéro de l'artisan" },
  { y: 172, from: "twilio", to: "worker", label: "POST /api/twilio/voice?token=…" },
  { y: 212, from: "worker", to: "d1", label: "SELECT businesses, business_hours · INSERT calls" },
  { y: 300, from: "worker", to: "twilio", label: "TwiML <Dial timeout=15> vers le portable" },
  { y: 336, from: "twilio", to: "artisan", label: "fait sonner le portable 15 s" },
  { y: 372, from: "twilio", to: "worker", label: "POST /api/twilio/fallback · no-answer / busy" },
  { y: 430, from: "worker", to: "el", label: "register_call(agent_id) · direct si hors horaires" },
  { y: 466, from: "worker", to: "twilio", label: "TwiML qui relie l'appel à l'agent" },
  { y: 508, from: "client", to: "el", both: true, voice: true, label: "conversation en direct : FAQ, prix, nom, numéro, adresse, besoin, urgence" },
  { y: 572, from: "el", to: "worker", label: "POST /api/elevenlabs/post-call · signé HMAC · résumé + données" },
  { y: 610, from: "worker", to: "d1", label: "UPDATE calls · INSERT leads" },
  { y: 650, from: "worker", to: "artisan", todo: true, label: "WhatsApp récap à chaque appel (via Twilio)" },
  { y: 730, from: "worker", to: "artisan", label: "cron du lundi : mail récap (Resend)" },
  { y: 766, from: "artisan", to: "worker", label: "tableau de bord : GET /api/calls, /api/leads, /api/stats" },
];
const NOTES = [
  { y: 246, lane: "worker", w: 250, text: "isWithinHours() · heure de Paris" },
  { y: 666, lane: "worker", at: 860, w: 330, text: "aujourd'hui : SMS seulement si urgence · tâche 15", muted: true },
];
const W = 1240, H = 800;
const laneX = (id) => LANES.find((l) => l.id === id).x;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function techSvg() {
  const out = [];
  out.push(`<svg class="diagram tech" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="tech-title">`);
  out.push(`<title id="tech-title">Séquence technique d'un appel : Twilio, Worker Cloudflare, ElevenLabs, D1, artisan</title>`);
  PHASES.forEach((p, i) => {
    out.push(`<rect class="phase${i % 2 ? " alt" : ""}" x="0" y="${p.y}" width="${W}" height="${p.h}"/>`);
    out.push(`<text class="phase-label" x="12" y="${p.y + 18}">${esc(p.label)}</text>`);
  });
  for (const l of LANES) {
    const w = l.w ?? 150;
    out.push(`<line class="lifeline" x1="${l.x}" y1="80" x2="${l.x}" y2="${H - 8}"/>`);
    out.push(`<rect class="lane-head${l.id === "worker" ? " ours" : ""}" x="${l.x - w / 2}" y="18" width="${w}" height="58" rx="10"/>`);
    out.push(`<text class="lane-name${l.id === "worker" ? " ours" : ""}" x="${l.x}" y="43">${esc(l.name)}</text>`);
    out.push(`<text class="lane-sub${l.id === "worker" ? " ours" : ""}" x="${l.x}" y="62">${esc(l.sub)}</text>`);
  }
  for (const n of NOTES) {
    const cx = n.at ?? laneX(n.lane);
    if (n.muted) {
      out.push(`<text class="note-muted" x="${cx}" y="${n.y + 13}">${esc(n.text)}</text>`);
      continue;
    }
    out.push(`<rect class="note" x="${cx - n.w / 2}" y="${n.y}" width="${n.w}" height="28" rx="6"/>`);
    out.push(`<text class="note-text" x="${cx}" y="${n.y + 19}">${esc(n.text)}</text>`);
  }
  for (const m of MESSAGES) {
    const x1 = laneX(m.from), x2 = laneX(m.to), dir = Math.sign(x2 - x1);
    const cls = m.voice ? "msg voice" : m.todo ? "msg todo" : "msg";
    const start = m.both ? x1 + dir * 4 : x1;
    out.push(`<line class="${cls}" x1="${start}" y1="${m.y}" x2="${x2 - dir * 4}" y2="${m.y}" marker-end="url(#${m.todo ? "head-todo" : m.voice ? "head-voice" : "head"})"${m.both ? ` marker-start="url(#head-voice)"` : ""}/>`);
    out.push(`<text class="msg-label${m.todo ? " todo" : ""}" x="${(x1 + x2) / 2}" y="${m.y - 8}">${esc(m.label)}</text>`);
  }
  out.push(`</svg>`);
  return out.join("\n");
}

// ── Excalidraw
let seed = 1;
const base = (type, x, y, w, h, extra = {}) => ({
  id: `${type}-${seed}`, type, x, y, width: w, height: h, angle: 0,
  strokeColor: "#14213d", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 1.5,
  strokeStyle: "solid", roughness: 1, opacity: 100, groupIds: [], frameId: null, roundness: null,
  seed: seed, version: 1, versionNonce: seed++ * 7919, isDeleted: false, boundElements: [],
  updated: 1761739200000, link: null, locked: false, ...extra,
});
const text = (x, y, s, size = 16, extra = {}) => {
  const lines = s.split("\n");
  const w = Math.max(...lines.map((l) => l.length)) * size * 0.55, h = lines.length * size * 1.25;
  const ax = extra.textAlign === "center" ? x - w / 2 : x;
  return base("text", ax, y, w, h, {
    text: s, originalText: s, fontSize: size, fontFamily: 1, textAlign: "left", verticalAlign: "top",
    containerId: null, lineHeight: 1.25, autoResize: true, ...extra,
  });
};
const rect = (x, y, w, h, extra = {}) => base("rectangle", x, y, w, h, { roundness: { type: 3 }, ...extra });
const arrow = (x1, y1, x2, y2, extra = {}) =>
  base("arrow", x1, y1, Math.abs(x2 - x1), Math.abs(y2 - y1), {
    points: [[0, 0], [x2 - x1, y2 - y1]], lastCommittedPoint: null, startBinding: null, endBinding: null,
    startArrowhead: null, endArrowhead: "arrow", roundness: { type: 2 }, ...extra,
  });
const BLUE = "#2346b8", SOFT = "#e3e9fa", YELLOW = "#f2b705", GREEN = "#1fa855", GREY = "#5b6680";

function metierElements(oy) {
  const el = [];
  el.push(text(24, oy - 70, "Vue métier : quand un client appelle", 28));
  el.push(text(24, oy - 32, "trait plein = v1 (la démo) · pointillés = v2", 16, { strokeColor: GREY }));
  const box = (x, y, w, h, s, extra = {}) => {
    el.push(rect(x, oy + y, w, h, extra.box));
    el.push(text(x + 14, oy + y + 12, s, extra.size ?? 16, extra.text));
  };
  box(24, 270, 210, 150, "Un client appelle\nMme Durand\n« J'aimerais un devis\npour changer mon\nchauffe-eau. »");
  el.push(base("diamond", 250, oy + 285, 140, 120, { strokeColor: BLUE }));
  el.push(text(320, oy + 330, "Pendant vos\nhoraires ?", 15, { textAlign: "center" }));
  box(480, 90, 240, 100, "Votre portable sonne\n15 secondes (réglable)");
  box(780, 90, 200, 100, "Vous décrochez :\nvous parlez au client", { box: { strokeColor: GREY } });
  box(1005, 90, 215, 100, "v2 · Filtrage d'appel\nl'assistante annonce\nqui appelle, vous\nchoisissez", { box: { strokeStyle: "dashed", strokeColor: GREY }, size: 14 });
  box(480, 260, 300, 260, "Votre assistante IA répond\n(la voix que vous avez choisie)\n\n• répond avec vos infos et vos prix\n• sinon une fourchette « sur devis »\n• jamais de prix inventé\n• note nom, numéro, adresse,\n  besoin, urgence", { box: { strokeColor: BLUE, backgroundColor: SOFT }, size: 15 });
  box(480, 550, 300, 58, "v2 · Agenda Google :\nl'assistante prend le RDV", { box: { strokeStyle: "dashed", strokeColor: GREY }, size: 14 });
  box(840, 232, 220, 134, "WhatsApp, tout de suite\nNouveau client : Mme Durand\nDevis chauffe-eau 200 L\nAnnecy · pas urgent\nRappeler : 06 12 34 56 78", { box: { strokeColor: GREEN, backgroundColor: "#dcf5e4" }, size: 14 });
  box(840, 384, 220, 80, "La fiche client\nnouveau → rappelé → devis", { size: 14 });
  box(840, 482, 220, 62, "Mail récap du lundi", { size: 15 });
  box(1085, 250, 135, 100, "Vous rappelez,\nfaites le devis,\ngagnez le\nchantier", { box: { backgroundColor: YELLOW, strokeColor: "#14213d" }, size: 14 });
  el.push(arrow(234, oy + 345, 250, oy + 345));
  el.push(arrow(320, oy + 285, 480, oy + 140, { points: [[0, 0], [0, -145], [160, -145]], roundness: null }));
  el.push(text(330, oy + 200, "Oui", 16, { strokeColor: BLUE }));
  el.push(arrow(390, oy + 345, 480, oy + 345));
  el.push(text(398, oy + 316, "Non", 16, { strokeColor: BLUE }));
  el.push(text(394, oy + 352, "soir,\nweek-end", 12, { strokeColor: GREY }));
  el.push(arrow(720, oy + 140, 780, oy + 140));
  el.push(arrow(600, oy + 190, 600, oy + 260));
  el.push(text(610, oy + 214, "pas de réponse\nou refus", 13, { strokeColor: GREY }));
  el.push(arrow(780, oy + 390, 840, oy + 299, { points: [[0, 0], [30, 0], [30, -91], [60, -91]], roundness: null }));
  el.push(arrow(780, oy + 390, 840, oy + 424, { points: [[0, 0], [30, 0], [30, 34], [60, 34]], roundness: null }));
  el.push(arrow(780, oy + 390, 840, oy + 513, { points: [[0, 0], [30, 0], [30, 123], [60, 123]], roundness: null }));
  el.push(arrow(1060, oy + 299, 1085, oy + 299));
  el.push(arrow(630, oy + 520, 630, oy + 550, { strokeStyle: "dashed", strokeColor: GREY }));
  return el;
}

function techElements(oy) {
  const el = [];
  el.push(text(24, oy - 70, "Vue technique : routes du contrat d'API (PROJET.md)", 28));
  el.push(text(24, oy - 32, "jaune pointillé = à faire (tâche 15)", 16, { strokeColor: GREY }));
  PHASES.forEach((p) => {
    el.push(rect(0, oy + p.y, W, p.h, { strokeColor: "transparent", backgroundColor: "#f1f4fa", roundness: null }));
    el.push(text(12, oy + p.y + 6, p.label, 14, { strokeColor: GREY }));
  });
  for (const l of LANES) {
    const w = l.w ?? 150, ours = l.id === "worker";
    el.push(rect(l.x - w / 2, oy + 18, w, 58, { strokeColor: BLUE, backgroundColor: ours ? BLUE : SOFT }));
    el.push(text(l.x, oy + 26, `${l.name}\n${l.sub}`, 15, { textAlign: "center", strokeColor: ours ? "#ffffff" : "#14213d" }));
    el.push(base("line", l.x, oy + 80, 0, H - 88, {
      points: [[0, 0], [0, H - 88]], strokeStyle: "dashed", strokeColor: "#c9d2e3", lastCommittedPoint: null,
      startBinding: null, endBinding: null, startArrowhead: null, endArrowhead: null,
    }));
  }
  for (const n of NOTES) {
    const cx = n.at ?? laneX(n.lane);
    if (!n.muted) el.push(rect(cx - n.w / 2, oy + n.y, n.w, 28, { strokeColor: BLUE, backgroundColor: "#ffffff" }));
    el.push(text(cx, oy + n.y + 5, n.text, 13, { textAlign: "center", strokeColor: n.muted ? GREY : "#14213d" }));
  }
  for (const m of MESSAGES) {
    const x1 = laneX(m.from), x2 = laneX(m.to);
    el.push(arrow(x1, oy + m.y, x2, oy + m.y, {
      strokeColor: m.todo ? YELLOW : m.voice ? BLUE : "#14213d", strokeWidth: m.voice ? 3 : 1.5,
      strokeStyle: m.todo ? "dashed" : "solid", startArrowhead: m.both ? "arrow" : null,
    }));
    el.push(text((x1 + x2) / 2, oy + m.y - 24, m.label, 13, { textAlign: "center" }));
  }
  return el;
}

const scene = {
  type: "excalidraw", version: 2, source: "https://excalidraw.com",
  elements: [...metierElements(100), ...techElements(900)],
  appState: { viewBackgroundColor: "#ffffff", gridSize: null }, files: {},
};
fs.writeFileSync(path.join(here, "schema-appel.excalidraw"), JSON.stringify(scene, null, 1) + "\n");

const htmlPath = path.join(here, "schema-appel.html");
const html = fs.readFileSync(htmlPath, "utf8");
const re = /(<!-- TECH:start -->)[\s\S]*?(<!-- TECH:end -->)/;
if (!re.test(html)) throw new Error("TECH markers missing in schema-appel.html");
fs.writeFileSync(htmlPath, html.replace(re, `$1\n${techSvg()}\n$2`));
console.log("ok : schema-appel.excalidraw + vue technique de schema-appel.html");
