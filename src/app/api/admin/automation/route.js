import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { listJobs, triggerJob } from "@/lib/jobs";
import { SETTINGS, getSetting, setSetting, isJobPaused, setJobPaused } from "@/lib/settings";

const RUNNING_STALE_MS = 30 * 60 * 1000; // un log sin cierre de más de 30 min se considera caído

async function requireAdmin() {
  const session = await auth();
  return session ? null : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const jobs = await Promise.all(
      listJobs().map(async (j) => {
        const [last, paused] = await Promise.all([
          prisma.jobLog.findFirst({ where: { job: j.name }, orderBy: { startedAt: "desc" } }),
          isJobPaused(j.name),
        ]);
        const running = !!last && !last.endedAt && Date.now() - new Date(last.startedAt).getTime() < RUNNING_STALE_MS;
        return {
          ...j,
          paused,
          running,
          lastRun: last
            ? { startedAt: last.startedAt, endedAt: last.endedAt, success: last.success, error: last.error, result: last.result }
            : null,
        };
      })
    );

    const history = await prisma.jobLog.findMany({ orderBy: { startedAt: "desc" }, take: 25 });

    const [total, active, inactive] = await Promise.all([
      prisma.offer.count(),
      prisma.offer.count({ where: { isActive: true } }),
      prisma.offer.count({ where: { isActive: false } }),
    ]);

    const settings = await Promise.all(
      Object.entries(SETTINGS).map(async ([key, def]) => {
        const { value, source } = await getSetting(key);
        return { key, label: def.label, type: def.type, min: def.min, max: def.max, value, source };
      })
    );

    return NextResponse.json({ jobs, history, offers: { total, active, inactive }, settings });
  } catch (error) {
    console.error("automation GET:", error);
    return NextResponse.json({ error: "No se pudo leer el estado de la automatización" }, { status: 500 });
  }
}

export async function POST(req) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await req.json();

    if (body.action === "run") {
      const job = listJobs().find((j) => j.name === body.job);
      if (!job) return NextResponse.json({ error: "Job desconocido" }, { status: 400 });

      const last = await prisma.jobLog.findFirst({ where: { job: job.name }, orderBy: { startedAt: "desc" } });
      if (last && !last.endedAt && Date.now() - new Date(last.startedAt).getTime() < RUNNING_STALE_MS) {
        return NextResponse.json({ error: "Ese job ya se está ejecutando" }, { status: 409 });
      }
      // Sin await: algunos jobs tardan minutos; el panel consulta el avance.
      triggerJob(job.name).catch((err) => console.error(`[Admin] ${job.name} falló:`, err.message));
      return NextResponse.json({ started: true });
    }

    if (body.action === "pause") {
      if (!listJobs().some((j) => j.name === body.job)) {
        return NextResponse.json({ error: "Job desconocido" }, { status: 400 });
      }
      await setJobPaused(body.job, !!body.paused);
      return NextResponse.json({ success: true });
    }

    if (body.action === "setting") {
      await setSetting(body.key, body.value);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Error" }, { status: 400 });
  }
}
