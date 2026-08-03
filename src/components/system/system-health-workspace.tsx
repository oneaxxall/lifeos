"use client";

import * as React from "react";
import { Activity, Boxes, Container, Cpu, Database, Gauge, HardDrive, Loader2, MemoryStick, RefreshCcw, Server, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Health {
  cpu: { usage: number; model: string; cores: number };
  memory: { total: number; used: number; free: number; pct: number };
  disk: { total: number; used: number; free: number } | null;
  load: number[];
  server: {
    hostname: string;
    platform: string;
    arch: string;
    uptime: number;
    nodeVersion: string;
    processUptime: number;
    docker: boolean;
  };
  sampledAt: string;
}

interface DockerInfo {
  available: boolean;
  containers: { id: string; name: string; image: string; state: string; status: string; ports: string }[];
  error?: string;
}

const fmtBytes = (b: number) => {
  if (!Number.isFinite(b) || b <= 0) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = b;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${u[i]}`;
};

const fmtUptime = (s: number) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}h ${h}j ${m}m`;
  if (h > 0) return `${h}j ${m}m`;
  return `${m}m`;
};

function Meter({ value, color }: { value: number; color: string }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${v}%` }} />
    </div>
  );
}

function StatBlock({
  icon: Icon,
  label,
  value,
  sub,
  pct,
  color,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  sub?: string;
  pct?: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className={cn("size-3", color)} /> {label}
      </p>
      <p className="mt-1.5 text-lg font-bold leading-none">{value}</p>
      {sub && <p className="mt-1 text-[10px] text-muted-foreground">{sub}</p>}
      {typeof pct === "number" && <Meter value={pct} color={color} />}
    </div>
  );
}

/** System Health — CPU, RAM, disk, server info & Docker containers. */
export function SystemHealthWorkspace() {
  const [health, setHealth] = React.useState<Health | null>(null);
  const [docker, setDocker] = React.useState<DockerInfo | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [h, d] = await Promise.all([
          fetch("/api/system/health").then((r) => r.json()),
          fetch("/api/system/docker").then((r) => r.json()),
        ]);
        if (cancelled) return;
        setHealth(h);
        setDocker(d);
      } catch {
        // biarkan kosong
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const t = window.setInterval(() => void load(), 10000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [tick]);

  const memColor = (health?.memory.pct ?? 0) > 85 ? "bg-rose-500" : (health?.memory.pct ?? 0) > 65 ? "bg-amber-500" : "bg-teal-500";
  const cpuColor = (health?.cpu.usage ?? 0) > 85 ? "bg-rose-500" : (health?.cpu.usage ?? 0) > 65 ? "bg-amber-500" : "bg-teal-500";
  const diskColor = (health?.disk ? (health.disk.used / health.disk.total) * 100 : 0) > 85 ? "bg-rose-500" : "bg-teal-500";

  if (loading) {
    return (
      <p className="flex items-center gap-2 py-10 text-xs text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Memuat health sistem…
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Activity className="size-5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">System Health</h1>
          <p className="truncate text-sm text-muted-foreground">
            {health?.server.hostname} · {health?.server.platform} {health?.server.arch}
            {health?.server.docker && " · 🐳 Docker"} — auto-refresh 10 detik
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => setTick((k) => k + 1)} title="Segarkan" aria-label="Segarkan">
          <RefreshCcw className="size-4" />
        </Button>
      </div>

      {/* Resource */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatBlock icon={Cpu} label="CPU Usage" value={`${health?.cpu.usage ?? 0}%`} sub={`${health?.cpu.cores} core · ${health?.cpu.model.split("@")[0].trim().slice(0, 24)}`} pct={health?.cpu.usage} color={cpuColor} />
        <StatBlock
          icon={MemoryStick}
          label="Memory (RAM)"
          value={`${fmtBytes(health?.memory.used ?? 0)} / ${fmtBytes(health?.memory.total ?? 0)}`}
          sub={`${health?.memory.pct ?? 0}% terpakai · bebas ${fmtBytes(health?.memory.free ?? 0)}`}
          pct={health?.memory.pct}
          color={memColor}
        />
        <StatBlock
          icon={HardDrive}
          label="Disk"
          value={health?.disk ? `${fmtBytes(health.disk.used)} / ${fmtBytes(health.disk.total)}` : "—"}
          sub={health?.disk ? `${((health.disk.used / health.disk.total) * 100).toFixed(1)}% terpakai · bebas ${fmtBytes(health.disk.free)}` : "tidak tersedia"}
          pct={health?.disk ? (health.disk.used / health.disk.total) * 100 : undefined}
          color={diskColor}
        />
        <StatBlock icon={Gauge} label="Load Average" value={health?.load.map((l) => l.toFixed(2)).join(" / ") ?? "—"} sub="1 / 5 / 15 menit" color="text-violet-500" />
      </div>

      {/* Server info */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
          <Server className="size-4 text-primary" /> Server
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] sm:grid-cols-4">
          <Info label="Hostname" value={health?.server.hostname ?? "—"} icon={Server} />
          <Info label="Platform" value={`${health?.server.platform} ${health?.server.arch}`} icon={Database} />
          <Info label="Uptime" value={fmtUptime(health?.server.uptime ?? 0)} icon={Timer} />
          <Info label="Node.js" value={health?.server.nodeVersion ?? "—"} icon={Activity} />
        </div>
      </div>

      {/* Docker */}
      <div className="rounded-xl border bg-card shadow-sm">
        <p className="flex items-center gap-1.5 border-b border-border/60 px-4 py-3 text-sm font-semibold">
          <Container className="size-4 text-primary" /> Docker Containers
          {docker?.available && (
            <span className="ml-auto rounded-full bg-teal-500/10 px-2 py-0.5 text-[9px] font-bold text-teal-600 dark:text-teal-400">
              {docker.containers.length} container
            </span>
          )}
        </p>
        {!docker?.available ? (
          <p className="flex items-start gap-2 px-4 py-4 text-[11px] leading-relaxed text-muted-foreground">
            <Boxes className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />
            <span>
              Docker CLI tidak tersedia di environment ini. Di VPS, pastikan container LifeOS punya akses Docker:
              <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono">-v /var/run/docker.sock:/var/run/docker.sock</code>
              {docker?.error ? ` (${docker.error})` : ""}
            </span>
          </p>
        ) : docker.containers.length === 0 ? (
          <p className="px-4 py-4 text-[11px] text-muted-foreground">Tidak ada container.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-border/60 text-[9px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Image</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Ports</th>
                </tr>
              </thead>
              <tbody>
                {docker.containers.map((c) => (
                  <tr key={c.id} className="border-b border-border/40 last:border-0">
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <span className={cn("size-1.5 rounded-full", c.state === "running" ? "bg-emerald-500" : "bg-rose-500")} />
                        {c.name}
                      </span>
                    </td>
                    <td className="max-w-[140px] truncate px-3 py-2 text-muted-foreground">{c.image}</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.status}</td>
                    <td className="max-w-[160px] truncate px-3 py-2 text-muted-foreground">{c.ports}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">Diperbarui {health ? new Date(health.sampledAt).toLocaleString("id-ID") : "—"} · CPU di-sample 500ms.</p>
    </div>
  );
}

function Info({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Server }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate font-medium">{value}</p>
      </div>
    </div>
  );
}
