import cron from "node-cron";
import { prisma } from "@/lib/db";

// Registry of scheduled jobs with their cron expressions and handlers.
// Configured via environment variables:
// - SYNC_PRICES_SCHEDULE (default: "0 0,6,12,18 * * *" = every 6 hours)
// - CHECK_LINKS_SCHEDULE (default: "0 0 * * *" = daily at midnight)
// - JOBS_ENABLED (default: "true")
const JOBS = [
  {
    name: "sync-prices",
    schedule: process.env.SYNC_PRICES_SCHEDULE || "0 0,6,12,18 * * *",
    handler: syncPrices
  },
  {
    name: "check-links",
    schedule: process.env.CHECK_LINKS_SCHEDULE || "0 0 * * *",
    handler: checkLinks
  }
];

let scheduledTasks = [];

/**
 * Start the job scheduler.
 * Should be called once from instrumentation.ts on server startup.
 */
export function startJobScheduler() {
  const enabled = process.env.JOBS_ENABLED !== "false";

  if (!enabled) {
    console.log("[Jobs] Scheduler disabled via JOBS_ENABLED=false");
    return;
  }

  console.log("[Jobs] Starting scheduled job scheduler...");

  for (const job of JOBS) {
    try {
      const task = cron.schedule(job.schedule, async () => {
        console.log(`[Jobs] Running: ${job.name}`);
        await runJobWithLogging(job.name, job.handler);
      });

      scheduledTasks.push({ name: job.name, task });
      console.log(`[Jobs] Scheduled: ${job.name} (${job.schedule})`);
    } catch (err) {
      console.error(`[Jobs] Failed to schedule ${job.name}:`, err.message);
    }
  }

  console.log(`[Jobs] Scheduler ready. ${scheduledTasks.length} job(s) scheduled.`);
}

/**
 * Stop all scheduled tasks (useful for cleanup/testing).
 */
export function stopJobScheduler() {
  for (const { task } of scheduledTasks) {
    task.stop();
  }
  scheduledTasks = [];
  console.log("[Jobs] Scheduler stopped.");
}

/**
 * Run a job and log its execution to the JobLog table.
 */
async function runJobWithLogging(jobName, handler) {
  const startedAt = new Date();
  let jobLog = null;

  try {
    jobLog = await prisma.jobLog.create({
      data: {
        job: jobName,
        startedAt,
        success: false
      }
    });

    const result = await handler();

    await prisma.jobLog.update({
      where: { id: jobLog.id },
      data: {
        endedAt: new Date(),
        success: true,
        result
      }
    });

    console.log(`[Jobs] ${jobName} completed successfully. Result:`, result);
  } catch (error) {
    const errorMessage = error.message || String(error);

    if (jobLog) {
      await prisma.jobLog.update({
        where: { id: jobLog.id },
        data: {
          endedAt: new Date(),
          success: false,
          error: errorMessage
        }
      });
    } else {
      await prisma.jobLog.create({
        data: {
          job: jobName,
          startedAt,
          endedAt: new Date(),
          success: false,
          error: errorMessage
        }
      });
    }

    console.error(`[Jobs] ${jobName} failed:`, errorMessage);
  }
}

/**
 * Job handler: sync prices from all active offers.
 * Calls the sync-prices endpoint with CRON_SECRET.
 */
async function syncPrices() {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    throw new Error("CRON_SECRET not set for sync-prices job");
  }

  const url = `${baseUrl}/api/offers/sync-prices?secret=${encodeURIComponent(secret)}`;

  const res = await fetch(url, { method: "GET" });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`sync-prices failed with status ${res.status}: ${text}`);
  }

  const data = await res.json();
  return {
    success: data.success,
    processed: data.processed,
    updated: data.updated,
    errors: data.errors
  };
}

/**
 * Job handler: check links from all active offers.
 * Calls the check-links endpoint with CRON_SECRET.
 */
async function checkLinks() {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    throw new Error("CRON_SECRET not set for check-links job");
  }

  const url = `${baseUrl}/api/offers/check-links?secret=${encodeURIComponent(secret)}`;

  const res = await fetch(url, { method: "GET" });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`check-links failed with status ${res.status}: ${text}`);
  }

  const data = await res.json();
  return {
    total: data.total,
    brokenCount: data.brokenCount
  };
}

/**
 * Manual trigger for a job (useful for admin panel).
 * Returns the job result.
 */
export async function triggerJob(jobName) {
  const job = JOBS.find(j => j.name === jobName);
  if (!job) {
    throw new Error(`Job not found: ${jobName}`);
  }

  return runJobWithLogging(job.name, job.handler);
}
