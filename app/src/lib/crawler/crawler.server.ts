import { withTimeout } from "@/lib/server/errors.server";

export const MAX_PAGES = 40;
const PAGE_TIMEOUT_MS = 8000;
const MAX_CONTENT_PER_PAGE = 16000;
const PRIORITY_HINTS = [
  "service",
  "about",
  "contact",
  "pricing",
  "price",
  "faq",
  "book",
  "appointment",
  "schedule",
  "hours",
  "location",
  "team",
  "staff",
  "menu",
  "treatment",
  "product",
  "shop",
  "collection",
  "plan",
  "package",
  "rate",
  "cost",
  "quote",
  "offer",
  "solution",
  "what-we-do",
  "our-work",
  "area",
  "policy",
  "warranty",
  "insurance",
  "financing",
];

export interface CrawledPage {
  url: string;
  title: string;
  text: string;
}

export interface CrawlState {
  origin: string;
  queue: string[];
  visited: string[];
  pages: CrawledPage[];
  disallow: string[];
  robotsLoaded: boolean;
}

export function normalizeUrl(raw: string): string {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  const url = new URL(u);
  url.hash = "";
  url.search = "";
  if (url.pathname.length > 1 && url.pathname.endsWith("/"))
    url.pathname = url.pathname.slice(0, -1);
  return url.toString();
}

export function initCrawl(startUrl: string): CrawlState {
  const normalized = normalizeUrl(startUrl);
  const origin = new URL(normalized).origin;
  return { origin, queue: [normalized], visited: [], pages: [], disallow: [], robotsLoaded: false };
}

async function loadSitemap(state: CrawlState, sitemapUrls: string[]) {
  const candidates = sitemapUrls.length
    ? sitemapUrls
    : [`${state.origin}/sitemap.xml`, `${state.origin}/sitemap_index.xml`];
  const found: string[] = [];
  for (const sm of candidates.slice(0, 3)) {
    try {
      const res = await withTimeout(fetch(sm, { redirect: "follow" }), 5000, "sitemap");
      if (!res.ok) continue;
      const xml = (await res.text()).slice(0, 400000);
      const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]!);
      // Nested sitemap index: follow up to 3 child sitemaps
      const children = locs.filter((l) => /\.xml(\?|$)/i.test(l)).slice(0, 3);
      for (const child of children) {
        try {
          const r = await withTimeout(fetch(child, { redirect: "follow" }), 5000, "sitemap");
          if (r.ok)
            found.push(
              ...[
                ...(await r.text()).slice(0, 400000).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi),
              ].map((m) => m[1]!),
            );
        } catch {
          /* skip */
        }
      }
      found.push(...locs.filter((l) => !/\.xml(\?|$)/i.test(l)));
      if (found.length) break;
    } catch {
      /* skip */
    }
  }
  for (const raw of found) {
    try {
      const abs = normalizeUrl(raw);
      if (new URL(abs).origin !== state.origin) continue;
      if (state.queue.includes(abs) || scoreUrl(abs) < -20) continue;
      if (state.queue.length < 150 && canQueue(state, abs)) state.queue.push(abs);
    } catch {
      /* skip */
    }
  }
}

async function loadRobots(state: CrawlState) {
  state.robotsLoaded = true;
  const sitemaps: string[] = [];
  try {
    const res = await withTimeout(
      fetch(`${state.origin}/robots.txt`, { redirect: "follow" }),
      4000,
      "robots",
    );
    if (!res.ok) return;
    const text = await res.text();
    let applies = false;
    for (const line of text.split("\n")) {
      const l = line.trim();
      if (/^sitemap:/i.test(l)) sitemaps.push(l.slice(8).trim());
      if (/^user-agent:/i.test(l)) applies = /\*\s*$/.test(l);
      else if (applies && /^disallow:/i.test(l)) {
        const p = l.split(":")[1]?.trim();
        if (p) state.disallow.push(p);
      }
    }
  } catch {
    /* ignore robots failures */
  }
  await loadSitemap(state, sitemaps);
}

function allowed(state: CrawlState, url: string) {
  const path = new URL(url).pathname;
  return !state.disallow.some((d) => d !== "/" && path.startsWith(d));
}

function decodeEntities(s: string) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export function htmlToText(html: string): { title: string; text: string; links: string[] } {
  const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const links: string[] = [];
  const linkRe = /<a\s[^>]*href=["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html))) if (m[1]) links.push(m[1]);

  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // strip navigation noise & cookie banners
    .replace(/<(nav|aside)[\s\S]*?<\/\1>/gi, " ")
    .replace(
      /<[^>]+(cookie|consent|gdpr|banner|popup|modal)[^>]*>[\s\S]*?<\/(div|section)>/gi,
      " ",
    );

  const jsonLd = [
    ...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ]
    .map((x) => (x[1] ?? "").trim())
    .filter(Boolean)
    .join("\n");

  body = body
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article)[^>]*>/gi, "\n")
    .replace(/<(h[1-6])[^>]*>/gi, "\n## ")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<[^>]+>/g, " ");

  const text = decodeEntities(body)
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();

  const metaDesc = decodeEntities(
    html.match(
      /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*content=["']([^"']*)["']/i,
    )?.[1] ?? "",
  ).trim();
  const combined =
    (metaDesc ? `SUMMARY: ${metaDesc}\n` : "") +
    (jsonLd ? `STRUCTURED DATA:\n${jsonLd.slice(0, 3000)}\n\n` : "") +
    text;
  return { title, text: combined.slice(0, MAX_CONTENT_PER_PAGE), links };
}

function scoreUrl(url: string) {
  const l = url.toLowerCase();
  let s = 0;
  for (const h of PRIORITY_HINTS) if (l.includes(h)) s += 5;
  s -= (url.split("/").length - 3) * 1;
  if (/\.(pdf|jpg|jpeg|png|gif|svg|webp|zip|mp4|css|js)$/i.test(l)) s -= 100;
  if (/(wp-json|wp-admin|login|cart|checkout|privacy|terms|tag\/|category\/|\?)/.test(l)) s -= 50;
  return s;
}

/** Crawl up to `batch` pages, mutating state. Returns true when finished. */
export async function crawlStep(state: CrawlState, batch = 6): Promise<boolean> {
  if (!state.robotsLoaded) await loadRobots(state);
  const picked: string[] = [];
  const home = state.queue[0];
  state.queue.sort((a, b) => (a === home ? -1 : b === home ? 1 : scoreUrl(b) - scoreUrl(a)));
  // Diversity: don't read the same kind of page (e.g. 30 location "contact" pages) over and over.
  const kindCount = new Map<string, number>();
  for (const v of state.visited) kindCount.set(pageKind(v), (kindCount.get(pageKind(v)) ?? 0) + 1);
  const deferred: string[] = [];
  while (
    state.queue.length &&
    picked.length < batch &&
    state.pages.length + picked.length < MAX_PAGES
  ) {
    const url = state.queue.shift()!;
    if (state.visited.includes(url)) continue;
    const kind = pageKind(url);
    if ((kindCount.get(kind) ?? 0) >= 2) {
      deferred.push(url);
      continue;
    }
    kindCount.set(kind, (kindCount.get(kind) ?? 0) + 1);
    state.visited.push(url);
    if (allowed(state, url)) picked.push(url);
  }
  // Repeated page kinds are skipped for good once a few examples were read.
  deferred.length = 0;
  state.queue.push(...deferred);
  await Promise.all(picked.map((url) => fetchPage(state, url)));
  return state.queue.length === 0 || state.pages.length >= MAX_PAGES;
}

function canQueue(state: CrawlState, url: string) {
  const kind = pageKind(url);
  let n = 0;
  for (const q of state.queue) if (pageKind(q) === kind && ++n >= 2) return false;
  for (const v of state.visited) if (pageKind(v) === kind && ++n >= 2) return false;
  return true;
}

function pageKind(url: string) {
  const segs = new URL(url).pathname.split("/").filter(Boolean);
  return segs.length <= 1 ? `/${segs[0] ?? ""}` : segs.slice(-2).join("/");
}

async function fetchPage(state: CrawlState, url: string) {
  {
    try {
      const res = await withTimeout(
        fetch(url, {
          redirect: "follow",
          headers: {
            "User-Agent": "AIPhoneDeskBot/1.0 (+https://aiphonedesk.com/bot)",
            Accept: "text/html",
          },
        }),
        PAGE_TIMEOUT_MS,
        `fetch ${url}`,
      );
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) return;
      const html = (await res.text()).slice(0, 600000);
      const { title, text, links } = htmlToText(html);
      if (text.length > 80) state.pages.push({ url, title, text });
      for (const href of links) {
        try {
          const abs = normalizeUrl(new URL(href, url).toString());
          if (new URL(abs).origin !== state.origin) continue;
          if (state.visited.includes(abs) || state.queue.includes(abs)) continue;
          if (scoreUrl(abs) < -20) continue;
          if (state.queue.length < 150 && canQueue(state, abs)) state.queue.push(abs);
        } catch {
          /* skip bad link */
        }
      }
    } catch {
      /* skip failed page */
    }
  }
}
