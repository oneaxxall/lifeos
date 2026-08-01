"use client";

import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { toast } from "sonner";
import { PomodoroCard, type PomodoroCardProps } from "@/components/pomodoro/pomodoro-card";
import { playBreakStart, playEnd, playPause, playStart } from "@/lib/sound";

interface Props {
  /** Siklus berikutnya (untuk label) */
  nextCycle: number;
  onSessionDone: () => void;
}

const WORK_DEFAULT = 25;
const BREAK_DEFAULT = 5;
const STORAGE_KEY = "lifeos-pomodoro-v1";

type Phase = "work" | "break";

interface PersistedState {
  phase: Phase;
  workMin: number;
  breakMin: number;
  task: string;
  running: boolean;
  /** Timestamp (ms) saat timer akan habis — akurat walau tab ditutup lama */
  endsAt: number | null;
  secondsLeft: number;
}

function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PersistedState;
    if (typeof p.phase !== "string" || typeof p.workMin !== "number") return null;
    return p;
  } catch {
    return null;
  }
}

function savePersisted(s: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // abaikan (storage penuh / private mode)
  }
}

/** Timer Pomodoro PERSISTENT — state di localStorage, PiP render komponen yang sama. */
export function PomodoroTimer({ nextCycle, onSessionDone }: Props) {
  const initial = React.useMemo(() => loadPersisted(), []);

  const [phase, setPhase] = React.useState<Phase>(initial?.phase ?? "work");
  const [workMin, setWorkMin] = React.useState(initial?.workMin ?? WORK_DEFAULT);
  const [breakMin, setBreakMin] = React.useState(initial?.breakMin ?? BREAK_DEFAULT);
  const [secondsLeft, setSecondsLeft] = React.useState(() => {
    if (!initial) return WORK_DEFAULT * 60;
    // Restore: hitung ulang dari endsAt agar akurat
    if (initial.running && initial.endsAt) {
      return Math.max(0, Math.ceil((initial.endsAt - Date.now()) / 1000));
    }
    return initial.secondsLeft;
  });
  const [running, setRunning] = React.useState(initial?.running ?? false);
  const [task, setTask] = React.useState(initial?.task ?? "");
  const [saving, setSaving] = React.useState(false);
  const [endsAt, setEndsAt] = React.useState<number | null>(initial?.endsAt ?? null);
  const [pipActive, setPipActive] = React.useState(false);

  const totalSec = (phase === "work" ? workMin : breakMin) * 60;

  // Ref nilai terkini — di-update via effect (lolos react-hooks/refs)
  const phaseRef = React.useRef(phase);
  const workMinRef = React.useRef(workMin);
  const breakMinRef = React.useRef(breakMin);
  const taskRef = React.useRef(task);
  const cycleRef = React.useRef(nextCycle);
  const doneRef = React.useRef(onSessionDone);
  const endsAtRef = React.useRef(endsAt);
  const phaseEndRef = React.useRef<() => Promise<void>>(async () => {});
  const pipRootRef = React.useRef<Root | null>(null);
  const pipWinRef = React.useRef<Window | null>(null);
  const themeObserverRef = React.useRef<MutationObserver | null>(null);

  // Transisi fase (work → break → work)
  const handlePhaseEnd = async () => {
    if (phaseRef.current === "work") {
      // Sesi fokus selesai → simpan
      setSaving(true);
      try {
        const res = await fetch("/api/pomodoro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            durationMinutes: workMinRef.current,
            task: taskRef.current,
            cycle: cycleRef.current,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success(`🍅 Sesi fokus ${workMinRef.current} menit selesai! Ambil istirahat ${breakMinRef.current} menit.`);
        doneRef.current();
        try {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Pomodoro selesai! 🍅", {
              body: `Sesi ${workMinRef.current} menit berhasil. Saatnya istirahat ${breakMinRef.current} menit.`,
            });
          }
        } catch {
          // abaikan
        }
      } catch {
        toast.error("Gagal menyimpan sesi");
      } finally {
        setSaving(false);
      }
      playEnd();
      window.setTimeout(playBreakStart, 600);
      // Istirahat AUTO-START setelah fokus selesai
      setPhase("break");
      setSecondsLeft(breakMinRef.current * 60);
      setEndsAt(Date.now() + breakMinRef.current * 60 * 1000);
      setRunning(true);
    } else {
      toast.success("Istirahat selesai — kembali fokus! 💪");
      playEnd();
      setPhase("work");
      setEndsAt(null);
      setSecondsLeft(workMinRef.current * 60);
      // Work TIDAK auto-start — user siapkan tugas baru dulu, lalu klik Mulai
    }
  };

  // Sinkronkan ref dengan state terkini (tiap render)
  React.useEffect(() => {
    phaseRef.current = phase;
    workMinRef.current = workMin;
    breakMinRef.current = breakMin;
    taskRef.current = task;
    cycleRef.current = nextCycle;
    doneRef.current = onSessionDone;
    endsAtRef.current = endsAt;
    phaseEndRef.current = handlePhaseEnd;
  });

  // Tick countdown — hitung dari endsAt (akurat walau tab dibuka kembali)
  React.useEffect(() => {
    if (!running || !endsAt) return;
    const iv = setInterval(() => {
      const remain = Math.max(0, Math.ceil((endsAtRef.current! - Date.now()) / 1000));
      setSecondsLeft(remain);
      if (remain <= 0) {
        clearInterval(iv);
        setRunning(false);
        setEndsAt(null);
        void phaseEndRef.current();
      }
    }, 500);
    return () => clearInterval(iv);
  }, [running, endsAt]);

  // Restore: jika timer sedang berjalan & sudah habis saat tab ditutup → proses transisi sekali
  React.useEffect(() => {
    if (initial?.running && initial.endsAt && initial.endsAt <= Date.now()) {
      const t = setTimeout(() => {
        setRunning(false);
        setEndsAt(null);
        void phaseEndRef.current();
      }, 100);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist ke localStorage setiap state berubah
  React.useEffect(() => {
    savePersisted({ phase, workMin, breakMin, task, running, endsAt, secondsLeft });
  }, [phase, workMin, breakMin, task, running, endsAt, secondsLeft]);

  // ── Aksi (dipakai kartu utama & PiP) ──
  const start = () => {
    if (phase === "work" && !("Notification" in window ? Notification.permission === "granted" : true)) {
      try {
        if ("Notification" in window) void Notification.requestPermission();
      } catch {
        // abaikan
      }
    }
    playStart();
    setEndsAt(Date.now() + secondsLeft * 1000);
    setRunning(true);
  };

  const pause = () => {
    playPause();
    setRunning(false);
    setEndsAt(null);
  };

  const reset = () => {
    setRunning(false);
    setEndsAt(null);
    setSecondsLeft(totalSec);
  };

  const skip = () => {
    setRunning(false);
    setEndsAt(null);
    void handlePhaseEnd();
  };

  const setWork = (v: number) => {
    const val = Math.min(90, Math.max(1, v || workMin));
    setWorkMin(val);
    if (phase === "work" && !running) setSecondsLeft(val * 60);
  };

  const setBreak = (v: number) => {
    const val = Math.min(30, Math.max(1, v || breakMin));
    setBreakMin(val);
    if (phase === "break" && !running) setSecondsLeft(val * 60);
  };

  const togglePip = () => {
    if (pipActive) exitPip();
    else void enterPip();
  };

  // ── Picture-in-Picture: render komponen yang SAMA (visual & fungsi identik) ──
  const buildCardProps = (): PomodoroCardProps => ({
    phase,
    secondsLeft,
    totalSec,
    running,
    saving,
    task,
    workMin,
    breakMin,
    nextCycle,
    pipActive,
    onStart: start,
    onPause: pause,
    onReset: reset,
    onSkip: () => void skip(),
    onTaskChange: setTask,
    onWorkMinChange: setWork,
    onBreakMinChange: setBreak,
    onTogglePip: togglePip,
  });

  const enterPip = async () => {
    try {
      const dpi = (window as unknown as { documentPictureInPicture?: { requestWindow: (opts: { width: number; height: number }) => Promise<Window> } })
        .documentPictureInPicture;
      if (!dpi) {
        toast.error("Picture-in-Picture tidak didukung browser ini (butuh Chrome/Edge)");
        return;
      }
      const win = await dpi.requestWindow({ width: 340, height: 260 });
      // Salin stylesheet induk agar class Tailwind berfungsi di PiP
      for (const el of Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))) {
        try {
          win.document.head.appendChild(el.cloneNode(true));
        } catch {
          // abaikan yang gagal di-clone
        }
      }

      // Salin CSS custom properties (--font-*, warna tema dll) dari induk —
      // next/font mendefinisikan --font-sans/--font-mono di body, bukan :root,
      // jadi window PiP harus diwariskan agar font & warna IDENTIK dengan utama.
      win.document.documentElement.lang = "id";
      win.document.body.style.cssText =
        "margin:0;padding:8px;background:hsl(var(--background));color:hsl(var(--foreground));font-family:var(--font-sans),ui-sans-serif,system-ui,sans-serif;";

      // WARISKAN THEME: salin class html/body induk (termasuk .dark) + CSS vars —
      // tanpa ini, PiP selalu tampil terang walau theme utama gelap.
      const syncTheme = () => {
        win.document.documentElement.className = document.documentElement.className;
        win.document.body.className = document.body.className;
        const copyVars = (srcEl: HTMLElement, dst: HTMLElement) => {
          const cs = getComputedStyle(srcEl);
          for (let i = 0; i < cs.length; i++) {
            const prop = (cs as unknown as string[])[i];
            if (prop.startsWith("--")) {
              const val = cs.getPropertyValue(prop).trim();
              if (val) dst.style.setProperty(prop, val);
            }
          }
        };
        copyVars(document.documentElement, win.document.documentElement);
        copyVars(document.body, win.document.body);
        // Re-render kartu agar komponen memakai warna theme terbaru
        pipRootRef.current?.render(<PomodoroCard {...buildCardProps()} />);
      };
      syncTheme();

      // Pantau toggle theme (class berubah di <html> induk) → sinkron ke PiP
      themeObserverRef.current = new MutationObserver(() => syncTheme());
      themeObserverRef.current.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

      // Render komponen PomodoroCard yang SAMA di window PiP
      pipWinRef.current = win;
      pipRootRef.current = createRoot(win.document.body);
      pipRootRef.current.render(
        <PomodoroCard {...buildCardProps()} />
      );

      setPipActive(true);
      win.addEventListener("pagehide", () => {
        pipWinRef.current = null;
        pipRootRef.current = null;
        setPipActive(false);
      });
    } catch {
      toast.error("Gagal membuka Picture-in-Picture");
    }
  };

  const exitPip = () => {
    try {
      pipRootRef.current?.unmount();
      pipWinRef.current?.close();
    } catch {
      // abaikan
    }
    pipRootRef.current = null;
    pipWinRef.current = null;
    setPipActive(false);
  };

  // Re-render PiP setiap state berubah — kartu di PiP ikut update otomatis
  React.useEffect(() => {
    if (pipRootRef.current) {
      pipRootRef.current.render(<PomodoroCard {...buildCardProps()} />);
    }
  });

  // Bersihkan PiP saat komponen unmount
  React.useEffect(() => {
    return () => {
      try {
        themeObserverRef.current?.disconnect();
        pipRootRef.current?.unmount();
        pipWinRef.current?.close();
      } catch {
        // abaikan
      }
    };
  }, []);

  return <PomodoroCard {...buildCardProps()} />;
}
