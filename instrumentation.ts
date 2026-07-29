/**
 * Next.js instrumentation hook.
 * Runs once when the server starts (only in production or when explicitly enabled).
 * This is where we initialize the scheduled job scheduler.
 *
 * Note: In development with `next dev`, this runs for both client and server.
 * We use the PHASE to detect and only run once.
 */

export async function register() {
  // Only initialize jobs on the server side
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startJobScheduler } = await import("@/lib/jobs");

    try {
      startJobScheduler();
    } catch (err) {
      console.error("[Instrumentation] Failed to start job scheduler:", err);
    }
  }
}
