// Phone number normalization to E.164. France (+33) is the default country.

const COUNTRY_CODES: Record<string, string> = { FR: "33", US: "1", BE: "32", CH: "41", LU: "352" };

export function normalizeE164(raw: string, defaultCountry = "FR"): string | null {
  if (typeof raw !== "string") return null;
  let s = raw.trim().replace(/[\s.\-()/]/g, "");
  if (!s) return null;
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (s.startsWith("+")) {
    // French numbers are sometimes written "+33 (0)6 …"
    s = s.replace(/^\+33\(?0\)?/, "+33");
    return /^\+[1-9]\d{6,14}$/.test(s) ? s : null;
  }
  if (!/^\d+$/.test(s)) return null;
  const cc = COUNTRY_CODES[defaultCountry.toUpperCase()] ?? "33";
  if (cc === "33") {
    // National format: 0X XX XX XX XX (10 digits)
    if (/^0[1-9]\d{8}$/.test(s)) return `+33${s.slice(1)}`;
    if (/^[1-9]\d{8}$/.test(s)) return `+33${s}`;
    if (/^33[1-9]\d{8}$/.test(s)) return `+${s}`;
    return null;
  }
  if (cc === "1") {
    if (/^\d{10}$/.test(s)) return `+1${s}`;
    if (/^1\d{10}$/.test(s)) return `+${s}`;
    return null;
  }
  const national = s.replace(/^0/, "");
  const out = `+${cc}${national}`;
  return /^\+[1-9]\d{6,14}$/.test(out) ? out : null;
}

// "+33612345678" → "06 12 34 56 78" for display; other countries stay in E.164
export function formatFrench(e164: string): string {
  const m = /^\+33(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(e164);
  return m ? `0${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}` : e164;
}
