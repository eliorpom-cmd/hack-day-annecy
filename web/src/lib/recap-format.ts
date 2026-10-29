// Pure formatting of the weekly recap e-mail (no Cloudflare imports, so node --test can load it).

export type RecapLead = {
  name: string | null;
  phone: string | null;
  need: string | null;
  urgency: string;
  status: string;
};

export type RecapInput = {
  businessName: string;
  // First day of the recap period (UTC date is used for the label)
  weekStart: Date;
  calls: number;
  handledByAgent: number;
  urgent: number;
  leads: RecapLead[];
};

export type RecapContent = { subject: string; html: string; text: string };

// The e-mail lists at most this many leads; the rest stays on the dashboard
export const MAX_LEADS_IN_EMAIL = 10;

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

const STATUS_LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  rappele: "Rappelé",
  devis: "Devis",
  gagne: "Gagné",
  perdu: "Perdu",
};

// Escapes the characters that are special in HTML text and attribute values.
// Every value coming from a caller or a lead goes through it before entering the HTML.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// "urgence" is the value written by the call pipeline; "urgent" is accepted too
function isUrgent(urgency: string): boolean {
  return urgency === "urgence" || urgency === "urgent";
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function periodLabel(start: Date): string {
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const from = `${start.getUTCDate()} ${MONTHS[start.getUTCMonth()]}`;
  const to = `${end.getUTCDate()} ${MONTHS[end.getUTCMonth()]}`;
  return `Du ${from} au ${to}`;
}

function subjectFor(input: RecapInput): string {
  if (input.calls === 0 && input.leads.length === 0) return "Votre semaine : aucun appel";
  let subject = `Votre semaine : ${plural(input.calls, "appel", "appels")}`;
  if (input.urgent > 0) subject += `, ${plural(input.urgent, "urgence", "urgences")}`;
  return subject;
}

function urgencyLabel(urgency: string): string {
  return isUrgent(urgency) ? "Urgent" : "Normal";
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function orDash(value: string | null): string {
  return value && value.trim() ? value.trim() : "Non renseigné";
}

export function buildRecap(input: RecapInput): RecapContent {
  const subject = subjectFor(input);
  const period = periodLabel(input.weekStart);
  const empty = input.calls === 0 && input.leads.length === 0;
  const shown = input.leads.slice(0, MAX_LEADS_IN_EMAIL);
  const hidden = input.leads.length - shown.length;

  const emptyMessage = "Aucun appel n'a été reçu cette semaine. Le répondeur est prêt pour la suite.";
  const noLeadsMessage = "Aucune nouvelle demande cette semaine.";

  // Plain text version
  const textLines = [
    `Bonjour,`,
    ``,
    `Voici le récapitulatif de ${input.businessName} (${period}).`,
    ``,
    `Appels reçus : ${input.calls}`,
    `Gérés par l'assistant : ${input.handledByAgent}`,
    `Urgences : ${input.urgent}`,
    ``,
  ];
  if (empty) {
    textLines.push(emptyMessage);
  } else if (input.leads.length === 0) {
    textLines.push(noLeadsMessage);
  } else {
    textLines.push(`Nouveaux clients (${input.leads.length}) :`);
    for (const lead of shown) {
      textLines.push(
        `- ${orDash(lead.name)} | ${orDash(lead.phone)} | ${orDash(lead.need)} | ${urgencyLabel(lead.urgency)} | ${statusLabel(lead.status)}`,
      );
    }
    if (hidden > 0) textLines.push(`... et ${hidden} autre(s) dans votre tableau de bord.`);
  }
  textLines.push("", "À bientôt,", "Votre assistant téléphonique");
  const text = textLines.join("\n");

  // HTML version: inline styles only, every user value escaped
  const cell = "padding:8px;border-bottom:1px solid #e5e5e5;text-align:left;vertical-align:top;";
  const head = "padding:8px;border-bottom:2px solid #222;text-align:left;font-weight:600;";
  const statBox = "padding:12px;text-align:center;border:1px solid #e5e5e5;border-radius:8px;";

  const statsHtml = `<table role="presentation" cellpadding="0" cellspacing="8" style="width:100%;border-collapse:separate;margin:16px 0;">
<tr>
<td style="${statBox}"><div style="font-size:24px;font-weight:700;">${input.calls}</div><div style="font-size:12px;color:#666;">Appels reçus</div></td>
<td style="${statBox}"><div style="font-size:24px;font-weight:700;">${input.handledByAgent}</div><div style="font-size:12px;color:#666;">Gérés par l'assistant</div></td>
<td style="${statBox}"><div style="font-size:24px;font-weight:700;">${input.urgent}</div><div style="font-size:12px;color:#666;">Urgences</div></td>
</tr>
</table>`;

  let leadsHtml: string;
  if (empty) {
    leadsHtml = `<p style="margin:16px 0;">${escapeHtml(emptyMessage)}</p>`;
  } else if (input.leads.length === 0) {
    leadsHtml = `<p style="margin:16px 0;">${escapeHtml(noLeadsMessage)}</p>`;
  } else {
    const rows = shown.map((lead) => `<tr>
<td style="${cell}">${escapeHtml(orDash(lead.name))}</td>
<td style="${cell}">${escapeHtml(orDash(lead.phone))}</td>
<td style="${cell}">${escapeHtml(orDash(lead.need))}</td>
<td style="${cell}">${escapeHtml(urgencyLabel(lead.urgency))}</td>
<td style="${cell}">${escapeHtml(statusLabel(lead.status))}</td>
</tr>`).join("\n");
    const more = hidden > 0
      ? `<p style="font-size:13px;color:#666;">... et ${hidden} autre(s) demande(s) dans votre tableau de bord.</p>`
      : "";
    leadsHtml = `<h2 style="font-size:16px;margin:24px 0 8px;">Nouveaux clients (${input.leads.length})</h2>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;">
<thead><tr>
<th style="${head}">Nom</th><th style="${head}">Téléphone</th><th style="${head}">Besoin</th><th style="${head}">Urgence</th><th style="${head}">Statut</th>
</tr></thead>
<tbody>
${rows}
</tbody>
</table>
${more}`;
  }

  const html = `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:16px;background:#ffffff;color:#222222;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;">
<p style="font-size:13px;color:#666;margin:0;">${escapeHtml(period)}</p>
<h1 style="font-size:20px;margin:4px 0 0;">${escapeHtml(input.businessName)}</h1>
${statsHtml}
${leadsHtml}
<p style="font-size:12px;color:#888;margin-top:32px;">Vous recevez ce récapitulatif chaque semaine.</p>
</div>
</body>
</html>`;

  return { subject, html, text };
}
