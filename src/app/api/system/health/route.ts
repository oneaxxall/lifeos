import { NextResponse } from "next/server";
import os from "os";
import fs from "fs";
import { execSync } from "child_process";

/** Hitung usage CPU (rata-rata idle/total sejak boot). */
function sampleCpu(): { idle: number; total: number } {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const c of cpus) {
    for (const t of Object.values(c.times)) total += t;
    idle += c.times.idle;
  }
  return { idle, total };
}

/** Disk usage via `df -k` (tersedia di Linux/macOS/busybox). */
function diskUsage(): { total: number; used: number; free: number } | null {
  try {
    const out = execSync("df -k /", { encoding: "utf8", timeout: 5000 });
    const line = out.split("\n")[1]?.trim();
    if (!line) return null;
    const parts = line.split(/\s+/);
    if (parts.length < 4) return null;
    const totalKb = Number(parts[1]);
    const usedKb = Number(parts[2]);
    const freeKb = Number(parts[3]);
    if (!Number.isFinite(totalKb) || !Number.isFinite(usedKb)) return null;
    return { total: totalKb * 1024, used: usedKb * 1024, free: freeKb * 1024 };
  } catch {
    return null;
  }
}

/** GET /api/system/health — CPU, RAM, disk, load, info server. */
export async function GET() {
  const before = sampleCpu();
  await new Promise((r) => setTimeout(r, 500));
  const after = sampleCpu();
  const dIdle = after.idle - before.idle;
  const dTotal = after.total - before.total;
  const cpuUsage = dTotal > 0 ? Math.round(((dTotal - dIdle) / dTotal) * 1000) / 10 : 0;

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPct = totalMem > 0 ? Math.round((usedMem / totalMem) * 1000) / 10 : 0;

  const disk = diskUsage();

  const load = os.loadavg();

  return NextResponse.json({
    cpu: { usage: cpuUsage, model: os.cpus()[0]?.model ?? "—", cores: os.cpus().length },
    memory: { total: totalMem, used: usedMem, free: freeMem, pct: memPct },
    disk,
    load,
    server: {
      hostname: os.hostname(),
      platform: `${os.type()} ${os.release()}`,
      arch: os.arch(),
      uptime: os.uptime(),
      nodeVersion: process.version,
      processUptime: process.uptime(),
      docker: isDocker(),
    },
    sampledAt: new Date().toISOString(),
  });
}

/** Deteksi berjalan di dalam container Docker (keberadaan /.dockerenv). */
function isDocker(): boolean {
  try {
    return fs.existsSync("/.dockerenv");
  } catch {
    return false;
  }
}
