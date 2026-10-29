import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { businessProfileSchema } from "@/lib/business/schema";

const urlSchema = z.object({ url: z.string().min(4).max(300) });
const jobIdSchema = z.object({ jobId: z.string().uuid() });

/** Start a website scan. Returns a job id the client polls with advanceScanFn. */
export const startScanFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => urlSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { requireOrg } = await import("@/lib/org/org.server");
    const { initCrawl } = await import("@/lib/crawler/crawler.server");
    const { AppError } = await import("@/lib/server/errors.server");
    const { org } = await requireOrg(context.supabase, context.userId);
    let state;
    try {
      state = initCrawl(data.url);
      const host = new URL(state.origin).hostname;
      if (host === "localhost" || /^(\d+\.){3}\d+$/.test(host) || host.endsWith(".local")) throw new Error("private host");
    } catch {
      throw new AppError("That doesn't look like a public website address. Try something like example.com.", { status: 400 });
    }
    const { data: job, error } = await context.supabase
      .from("scan_jobs")
      .insert({
        organization_id: org.id,
        url: state.queue[0] ?? data.url,
        status: "crawling",
        stage: "Scanning your website",
        progress: 5,
        result: { crawl: state } as never,
      })
      .select("id")
      .single();
    if (error || !job) throw new AppError("We couldn't start the scan. Please try again.", { cause: error });
    await context.supabase.from("organizations").update({ onboarding_step: "business" }).eq("id", org.id);
    return { jobId: job.id };
  });

const STAGES = [
  "Scanning your website",
  "Finding business information",
  "Reading services",
  "Checking opening hours",
  "Finding contact information",
  "Preparing your receptionist",
];

/**
 * Advance a scan by one step (crawl a batch of pages, or extract).
 * Step-based so it works on serverless without background workers.
 */
export const advanceScanFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => jobIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { crawlStep, MAX_PAGES } = await import("@/lib/crawler/crawler.server");
    const { extractBusinessProfile } = await import("@/lib/crawler/extract.server");
    const { AppError, log } = await import("@/lib/server/errors.server");
    const db = context.supabase;
    const { data: job, error } = await db.from("scan_jobs").select("*").eq("id", data.jobId).single();
    if (error || !job) throw new AppError("Scan not found.", { status: 404, cause: error });
    if (job.status === "completed" || job.status === "failed") return publicJob(job);

    const result = (job.result ?? {}) as { crawl?: import("@/lib/crawler/crawler.server").CrawlState; profile?: unknown };
    try {
      if (job.status === "crawling" && result.crawl) {
        const done = await crawlStep(result.crawl, 6);
        const pages = result.crawl.pages.length;
        const stageIdx = Math.min(STAGES.length - 2, 1 + Math.floor((pages / MAX_PAGES) * 4));
        const progress = Math.min(70, 10 + Math.round((pages / MAX_PAGES) * 60));
        if (done || pages >= MAX_PAGES) {
          await db
            .from("scan_jobs")
            .update({ status: "extracting", stage: STAGES[5], progress: 75, pages_crawled: pages, pages_found: result.crawl.visited.length, result: result as never })
            .eq("id", job.id);
        } else {
          await db
            .from("scan_jobs")
            .update({ stage: STAGES[stageIdx], progress, pages_crawled: pages, pages_found: result.crawl.visited.length + result.crawl.queue.length, result: result as never })
            .eq("id", job.id);
        }
      } else if (job.status === "extracting" && result.crawl) {
        if (result.crawl.pages.length === 0) {
          throw new AppError("We couldn't read any pages on that website. You can enter your details manually instead.", { status: 422 });
        }
        const profile = await extractBusinessProfile(result.crawl.pages, job.url);
        log("scan.completed", { job_id: job.id, org_id: job.organization_id, pages: result.crawl.pages.length });
        // Store crawled pages as knowledge documents for later use
        const { data: source } = await db
          .from("knowledge_sources")
          .insert({ organization_id: job.organization_id, type: "website", url: job.url, title: profile.business_name, status: "synced", last_synced_at: new Date().toISOString() })
          .select("id")
          .single();
        if (source) {
          await db.from("knowledge_documents").insert(
            result.crawl.pages.slice(0, MAX_PAGES).map((p) => ({
              organization_id: job.organization_id,
              source_id: source.id,
              title: p.title || p.url,
              url: p.url,
              content: p.text,
            })),
          );
        }
        await db
          .from("scan_jobs")
          .update({ status: "completed", stage: "Done", progress: 100, result: { profile, pages_crawled: result.crawl.pages.length } as never })
          .eq("id", job.id);
      }
    } catch (e) {
      const err = e instanceof AppError ? e : new AppError("We had trouble scanning that website. You can retry or enter your details manually.", { cause: e });
      await db.from("scan_jobs").update({ status: "failed", stage: "Scan failed", error: err.userMessage, error_id: err.errorId }).eq("id", job.id);
    }
    const { data: fresh } = await db.from("scan_jobs").select("*").eq("id", job.id).single();
    return publicJob(fresh!);
  });

function publicJob(job: {
  id: string;
  url: string;
  status: string;
  stage: string;
  progress: number;
  pages_crawled: number;
  pages_found: number;
  error: string | null;
  error_id: string | null;
  result: unknown;
}) {
  const r = (job.result ?? {}) as { profile?: unknown; pages_crawled?: number };
  return {
    id: job.id,
    url: job.url,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    pagesCrawled: job.pages_crawled,
    pagesFound: job.pages_found,
    error: job.error,
    errorId: job.error_id,
    profile: job.status === "completed" ? (r.profile as import("@/lib/business/schema").BusinessProfile) : null,
  };
}

export const getBusinessFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireOrg, loadBusinessProfile } = await import("@/lib/org/org.server");
    const { org } = await requireOrg(context.supabase, context.userId);
    const profile = await loadBusinessProfile(context.supabase, org.id);
    return { profile, organization: org };
  });

export const saveBusinessFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => businessProfileSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { requireOrg, saveBusinessProfile, audit } = await import("@/lib/org/org.server");
    const { org } = await requireOrg(context.supabase, context.userId);
    await saveBusinessProfile(context.supabase, org.id, data);
    await context.supabase.from("organizations").update({ onboarding_step: "receptionist" }).eq("id", org.id);
    await audit(context.supabase, org.id, context.userId, "business.saved");
    return { ok: true };
  });
