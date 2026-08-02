"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquarePlus,
  MessageSquareText,
  PanelLeft,
  Pencil,
  Search,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CHAT_FEATURES, type ChatFeatureKey } from "@/lib/chat-features";

interface SessionRow {
  id: number;
  title: string;
  context: string;
  updatedAt: string;
}
interface MessageRow {
  id: number;
  role: "user" | "assistant";
  message: string;
  createdAt: string;
}

const FONT_OPTIONS = [
  { key: "kecil", label: "Kecil", size: 11, desc: "Padat, banyak info" },
  { key: "sedang", label: "Sedang", size: 13, desc: "Nyaman dibaca" },
  { key: "besar", label: "Besar", size: 15, desc: "Ramah mata" },
] as const;

/** Parse tanggal SQLite ("2026-08-02 19:44:00", UTC) → Date valid. */
const parseDbDate = (s: string) => {
  if (!s) return new Date(NaN);
  const normalized = s.includes("T") ? s : s.replace(" ", "T") + "Z";
  return new Date(normalized);
};

const fmtClock = (iso: string) => {
  if (!iso) return "";
  try {
    const d = parseDbDate(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

const dateLabel = (iso: string) => {
  if (!iso) return "";
  try {
    const d = parseDbDate(iso);
    if (Number.isNaN(d.getTime())) return "";
    const today = new Date();
    const yest = new Date();
    yest.setDate(today.getDate() - 1);
    const same = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (same(d, today)) return "Hari ini";
    if (same(d, yest)) return "Kemarin";
    return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
};

const fmtTime = (iso: string) => {
  if (!iso) return "";
  try {
    const d = parseDbDate(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const mdComponents = {
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold text-foreground">{children}</strong>,
  p: ({ children }: { children?: React.ReactNode }) => <p className="my-0.5">{children}</p>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="my-1 list-disc space-y-0.5 pl-4">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="my-1 list-decimal space-y-0.5 pl-4">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  h1: ({ children }: { children?: React.ReactNode }) => <p className="my-1 text-xs font-bold">{children}</p>,
  h2: ({ children }: { children?: React.ReactNode }) => <p className="my-1 text-xs font-bold">{children}</p>,
  h3: ({ children }: { children?: React.ReactNode }) => <p className="my-1 text-[11px] font-bold">{children}</p>,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">
      {children}
    </a>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="rounded bg-muted-foreground/10 px-1 py-0.5 font-mono text-[10px]">{children}</code>
  ),
};

export function LifeOSChatWorkspace() {
  const [sessions, setSessions] = React.useState<SessionRow[]>([]);
  const [feature, setFeature] = React.useState<ChatFeatureKey>("umum");
  const [activeId, setActiveId] = React.useState<number | null>(null);
  const [messages, setMessages] = React.useState<MessageRow[]>([]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [loadingMsgs, setLoadingMsgs] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);
  const [panelOpen, setPanelOpen] = React.useState(true); // mobile sidebar
  const [deleteTarget, setDeleteTarget] = React.useState<SessionRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [renamingId, setRenamingId] = React.useState<number | null>(null);
  const [renameDraft, setRenameDraft] = React.useState("");
  const [fontSize, setFontSize] = React.useState<number>(13);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [visibleDate, setVisibleDate] = React.useState("");
  const [contextOpen, setContextOpen] = React.useState(true);
  const [ctxQuery, setCtxQuery] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const streamRef = React.useRef<AbortController | null>(null);

  // Muat preferensi font dari localStorage (hanya di browser)
  React.useEffect(() => {
    const load = async () => {
      try {
        const saved = Number(localStorage.getItem("lifeos-chat-font"));
        if (saved >= 11 && saved <= 15) setFontSize(saved);
      } catch {
        // abaikan
      }
    };
    void load();
  }, []);

  // Gesture swipe — 1 jari geser ke kanan di mana saja membuka panel kiri
  // (BUKAN dari tepi — hindari konflik gesture back Android/iOS)
  React.useEffect(() => {
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let tracking = false;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const el = e.target as HTMLElement | null;
      if (el && el.closest("input, textarea, select, [role='dialog']")) return;
      startX = t.clientX;
      startY = t.clientY;
      startTime = Date.now();
      tracking = true;
    };
    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = Date.now() - startTime;
      tracking = false;
      if (dt < 600 && dx > 70 && Math.abs(dy) < 50) {
        setPanelOpen(true);
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  // Muat daftar percakapan
  React.useEffect(() => {
    fetch("/api/chat/sessions")
      .then((r) => r.json())
      .then((j) => {
        const list: SessionRow[] = j.data ?? [];
        setSessions(list);
        if (list.length > 0) {
          setActiveId(list[0].id);
          setFeature(list[0].context as ChatFeatureKey);
        }
      })
      .catch(() => toast.error("Gagal memuat percakapan"));
  }, []);

  // Lazy load pesan saat session dipilih
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (activeId === null) {
        setMessages([]);
        setHasMore(false);
        return;
      }
      setLoadingMsgs(true);
      try {
        const j = await fetch(`/api/chat/sessions/${activeId}/messages`).then((r) => r.json());
        if (cancelled) return;
        setMessages(j.data ?? []);
        setHasMore(j.hasMore ?? false);
        requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
      } catch {
        // abaikan
      } finally {
        if (!cancelled) setLoadingMsgs(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  /** "Percakapan baru" — hanya menyiapkan mode baru, BELUM buat session DB. */
  const startNew = () => {
    setActiveId(null);
    setMessages([]);
    setHasMore(false);
    setPanelOpen(false);
  };

  /** Buat session DB — hanya dipanggil saat pesan pertama dikirim. */
  const createSession = async (): Promise<number | null> => {
    try {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Gagal");
      setSessions((p) => [j.data, ...p]);
      setActiveId(j.data.id);
      return j.data.id as number;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat percakapan");
      return null;
    }
  };

  const loadMore = async () => {
    if (activeId === null || !hasMore || loadingMsgs) return;
    const minId = messages[0]?.id;
    if (!minId) return;
    setLoadingMsgs(true);
    try {
      const j = await fetch(`/api/chat/sessions/${activeId}/messages?before=${minId}`).then((r) => r.json());
      setMessages((p) => [...(j.data ?? []), ...p]);
      setHasMore(j.hasMore ?? false);
    } catch {
      toast.error("Gagal memuat pesan lama");
    } finally {
      setLoadingMsgs(false);
    }
  };

  const send = async () => {
    const m = input.trim();
    if (!m || streaming) return;
    let sid = activeId;
    if (sid === null) {
      sid = await createSession();
      if (sid === null) return;
    }
    setInput("");
    const now = new Date().toISOString();
    const optimistic: MessageRow[] = [...messages, { id: Date.now(), role: "user", message: m, createdAt: now }];
    setMessages(optimistic);
    setStreaming(true);
    setHasMore(false);
    const controller = new AbortController();
    streamRef.current = controller;
    const streamMsgId = Date.now() + 1;
    setMessages((p) => [...p, { id: streamMsgId, role: "assistant", message: "", createdAt: now }]);

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, message: m }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal streaming");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((p) => p.map((msg) => (msg.id === streamMsgId ? { ...msg, message: acc } : msg)));
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      }
      // refresh judul session (auto-title server: sekali, dari pesan pertama)
      const j2 = await fetch("/api/chat/sessions").then((r) => r.json()).catch(() => null);
      if (j2?.data) setSessions(j2.data);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error(e instanceof Error ? e.message : "Gagal streaming");
      }
    } finally {
      setStreaming(false);
      streamRef.current = null;
      // muat ulang pesan (asli dari DB, termasuk yang tersimpan)
      fetch(`/api/chat/sessions/${sid}/messages`).then((r) => r.json()).then((j) => {
        if (j.data?.length) {
          setMessages(j.data);
          setHasMore(j.hasMore ?? false);
        }
      }).catch(() => {});
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  };

  const startRename = (s: SessionRow) => {
    setRenamingId(s.id);
    setRenameDraft(s.title);
  };

  const saveRename = async (s: SessionRow) => {
    const t = renameDraft.trim();
    if (!t || t === s.title) {
      setRenamingId(null);
      return;
    }
    try {
      const res = await fetch(`/api/chat/sessions/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      if (!res.ok) throw new Error();
      setSessions((p) => p.map((x) => (x.id === s.id ? { ...x, title: t } : x)));
      toast.success("Judul percakapan diperbarui");
    } catch {
      toast.error("Gagal mengubah judul");
    }
    setRenamingId(null);
  };

  const removeSession = async (s: SessionRow) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/chat/sessions/${s.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setSessions((p) => p.filter((x) => x.id !== s.id));
      if (activeId === s.id) {
        setActiveId(null);
        setMessages([]);
      }
      toast.success("Percakapan dihapus");
      setDeleteTarget(null);
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  const selectSession = (s: SessionRow) => {
    setActiveId(s.id);
    setFeature(s.context as ChatFeatureKey);
    setPanelOpen(false);
  };

  const setFontPref = (size: number) => {
    setFontSize(size);
    try {
      localStorage.setItem("lifeos-chat-font", String(size));
    } catch {
      // abaikan
    }
  };

  // Scroll: auto lazy-load saat mendekati atas + update floating date
  const onChatScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop < 80 && hasMore && !loadingMsgs && activeId !== null) {
      void loadMore();
    }
    // Tanggal aktif = tanggal pesan terakhir yang melewati posisi atas viewport
    const msgs = el.querySelectorAll<HTMLElement>("[data-date]");
    let current = "";
    for (const m of msgs) {
      if (m.offsetTop <= el.scrollTop + 60) current = m.dataset.date ?? "";
      else break;
    }
    if (current !== visibleDate) setVisibleDate(current);
  };

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;
  const featureMeta = CHAT_FEATURES.find((f) => f.key === feature) ?? CHAT_FEATURES[0];

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      {/* Header atas */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-card/60 px-3 backdrop-blur">
        <Link
          href="/"
          aria-label="Kembali ke LifeOS"
          title="Kembali ke LifeOS"
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/60 hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <span className="mx-1 h-4 w-px bg-border" />
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <MessageSquareText className="size-4 text-primary" /> LifeOS Chat
        </span>
        <span className="hidden text-[10px] text-muted-foreground sm:block">Asisten pribadi dengan konteks data fiturmu</span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setSettingsOpen(true)} aria-label="Pengaturan tampilan chat" title="Pengaturan tampilan">
            <Settings2 className="size-4" />
          </Button>
          <span className="hidden rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary sm:block">{featureMeta.label}</span>
          <Button
            size="icon"
            onClick={() => startNew()}
            title="Percakapan baru"
            aria-label="Percakapan baru"
            className="size-8 shrink-0 rounded-full border border-border/60 bg-card text-muted-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/60 hover:text-foreground"
          >
            <MessageSquarePlus className="size-4" />
          </Button>
        </div>
      </header>

      {/* Body: sidebar + chat */}
      <div className="relative flex min-h-0 flex-1">
        {/* Backdrop mobile — klik di luar sidebar menutup */}
        <button
          aria-label="Tutup panel"
          onClick={() => setPanelOpen(false)}
          className={cn(
            "absolute inset-0 z-30 bg-black/25 transition-opacity duration-300 lg:hidden",
            panelOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        />
        {/* Sidebar kiri (konteks + percakapan) */}
        <aside
          className={cn(
            "h-full w-64 shrink-0 flex-col border-r border-border/60 bg-card",
            "hidden lg:flex",
            "max-lg:absolute max-lg:bottom-0 max-lg:left-0 max-lg:top-0 max-lg:z-40 max-lg:flex max-lg:w-72 max-lg:shadow-xl",
            "max-lg:transition-transform max-lg:duration-300 max-lg:ease-out",
            panelOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Konteks & Percakapan</p>
            <Button variant="ghost" size="icon" className="size-6 lg:hidden" onClick={() => setPanelOpen(false)} aria-label="Tutup panel">
              <PanelLeft className="size-3.5" />
            </Button>
          </div>

          {/* Konteks fitur */}
          <div className="border-b border-border/40 px-2 pb-2">
            <button
              onClick={() => setContextOpen((o) => !o)}
              className="flex w-full items-center gap-1.5 rounded-md px-1 py-1.5 text-left"
            >
              <ChevronDown className={cn("size-3 text-muted-foreground transition-transform", contextOpen && "rotate-180")} />
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Konteks AI</span>
              <span className="ml-auto truncate text-[9px] font-medium text-primary">{featureMeta.label}</span>
            </button>
            {contextOpen && (
              <>
                <div className="relative mt-1">
                  <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={ctxQuery}
                    onChange={(e) => setCtxQuery(e.target.value)}
                    placeholder="Cari konteks…"
                    className="h-7 rounded-lg pl-6 text-[10px]"
                  />
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-1">
                  {CHAT_FEATURES.filter(
                    (f) =>
                      !ctxQuery.trim() ||
                      f.label.toLowerCase().includes(ctxQuery.trim().toLowerCase()) ||
                      f.desc.toLowerCase().includes(ctxQuery.trim().toLowerCase())
                  ).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => {
                        setFeature(f.key);
                        setPanelOpen(false);
                      }}
                      title={f.desc}
                      className={cn(
                        "flex min-w-0 items-center gap-1.5 rounded-lg border px-1.5 py-1.5 text-left text-[10px] transition-colors",
                        feature === f.key
                          ? "border-primary/40 bg-primary/10 font-medium text-primary"
                          : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <f.icon className="size-3.5 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{f.label}</span>
                    </button>
                  ))}
                  {ctxQuery.trim() && !CHAT_FEATURES.some((f) => f.label.toLowerCase().includes(ctxQuery.trim().toLowerCase())) && (
                    <p className="col-span-2 py-1 text-center text-[9px] text-muted-foreground">Tidak ada konteks cocok</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Percakapan */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between px-3 py-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Percakapan ({sessions.length})</p>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
              {sessions.length === 0 && (
                <p className="px-2 py-4 text-center text-[10px] text-muted-foreground">
                  Belum ada percakapan — klik &quot;Percakapan baru&quot;
                </p>
              )}
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => selectSession(s)}
                  className={cn(
                    "group flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-2 transition-colors",
                    activeId === s.id ? "border-primary/30 bg-primary/10" : "border-transparent hover:bg-muted/60"
                  )}
                >
                  {renamingId === s.id ? (
                    <div className="flex min-w-0 flex-1 items-center gap-1">
                      <input
                        autoFocus
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void saveRename(s);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        className="h-7 min-w-0 flex-1 rounded-md border border-primary/40 bg-background px-2 text-[11px] outline-none focus:border-primary"
                      />
                      <button onClick={(e) => { e.stopPropagation(); void saveRename(s); }} className="text-primary hover:text-primary/70" aria-label="Simpan judul">
                        <Check className="size-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setRenamingId(null); }} className="text-muted-foreground hover:text-foreground" aria-label="Batal rename">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium">{s.title}</p>
                        <p className="text-[9px] text-muted-foreground">
                          {CHAT_FEATURES.find((f) => f.key === s.context)?.label ?? s.context} · {fmtTime(s.updatedAt)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(s);
                        }}
                        className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-primary lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100"
                        aria-label="Ganti judul percakapan"
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(s);
                        }}
                        className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-destructive lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100"
                        aria-label="Hapus percakapan"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Chat utama */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* Header chat */}
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border/40 px-3">
            <Button variant="ghost" size="icon" className="size-6 lg:hidden" onClick={() => setPanelOpen(true)} aria-label="Buka panel">
              <PanelLeft className="size-3.5" />
            </Button>
            {activeSession ? (
              <>
                <p className="truncate text-xs font-semibold">{activeSession.title}</p>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">
                  {CHAT_FEATURES.find((f) => f.key === activeSession.context)?.label ?? activeSession.context}
                </span>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Pilih percakapan atau buat baru</p>
            )}
            <p className="ml-auto hidden text-[9px] text-muted-foreground sm:block">
              {featureMeta.desc}
            </p>
          </div>

          {/* Pesan */}
          <div ref={scrollRef} onScroll={onChatScroll} className="min-h-0 flex-1 overflow-y-auto">
            {activeId === null ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="size-6 text-primary" />
                </span>
                <p className="text-sm font-semibold">Mulai percakapan dengan AI LifeOS</p>
                <p className="max-w-sm text-[11px] text-muted-foreground">
                  Pilih konteks fitur di panel kiri (mis. <b>Knowledge</b> untuk bertanya isi catatanmu), lalu klik &quot;Percakapan baru&quot;.
                </p>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-2 p-3">
                {/* Floating date header — mengikuti scroll */}
                {visibleDate && (
                  <div className="sticky top-1 z-10 flex justify-center">
                    <span className="rounded-full border border-border/60 bg-card/95 px-3 py-1 text-[10px] font-semibold text-muted-foreground shadow-sm backdrop-blur">
                      {dateLabel(visibleDate)}
                    </span>
                  </div>
                )}
                {loadingMsgs && messages.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 text-[11px] text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> Memuat percakapan…
                  </div>
                ) : (
                  <>
                    {hasMore && (
                      <div className="flex justify-center">
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-[10px]" onClick={() => void loadMore()} disabled={loadingMsgs}>
                          {loadingMsgs ? <Loader2 className="size-3 animate-spin" /> : <ChevronUp className="size-3" />}
                          Muat pesan lama
                        </Button>
                      </div>
                    )}
                    {messages.map((msg, idx) => {
                      const prev = messages[idx - 1];
                      const showDateDivider = !prev || (prev.createdAt || "").slice(0, 10) !== (msg.createdAt || "").slice(0, 10);
                      return (
                        <React.Fragment key={msg.id}>
                          {showDateDivider && msg.createdAt && (
                            <div className="flex justify-center pt-1">
                              <span className="rounded-full bg-muted/50 px-2.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                                {dateLabel(msg.createdAt)}
                              </span>
                            </div>
                          )}
                          <div data-date={(msg.createdAt || "").slice(0, 10)} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                            <div
                              className={cn(
                                "max-w-[85%] rounded-2xl px-3 py-2 leading-relaxed break-words [overflow-wrap:anywhere] sm:max-w-[75%]",
                                msg.role === "user" ? "rounded-br-sm bg-primary/15 text-foreground" : "rounded-bl-sm bg-muted/40 text-foreground/90"
                              )}
                              style={{ fontSize: msg.role === "user" ? fontSize - 1 : fontSize }}
                            >
                              {msg.role === "assistant" ? (
                                msg.message ? (
                                  <div className="markdown-chat">
                                    <ReactMarkdown components={mdComponents}>{msg.message}</ReactMarkdown>
                                  </div>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <Loader2 className="size-3 animate-spin" /> AI sedang menulis…
                                  </span>
                                )
                              ) : (
                                msg.message
                              )}
                              {msg.createdAt && (
                                <p className={cn("mt-1 text-right text-[8px] tabular-nums", msg.role === "user" ? "text-foreground/40" : "text-muted-foreground/50")}>
                                  {fmtClock(msg.createdAt)}
                                </p>
                              )}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-border/40 bg-card/30 p-2.5">
            <div className="mx-auto flex max-w-3xl items-end gap-2">
              <div className="flex min-h-[46px] flex-1 items-end rounded-2xl border border-border/70 bg-card px-3 py-2 shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder={`Tanya tentang ${featureMeta.label}… (Enter kirim, Shift+Enter baris baru)`}
                  rows={1}
                  className="max-h-32 min-h-[22px] flex-1 resize-none overflow-x-hidden border-0 bg-transparent p-0 text-sm shadow-none outline-none field-sizing-normal [overflow-wrap:anywhere] placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <Button
                size="icon"
                className="size-[46px] shrink-0 rounded-2xl bg-gradient-to-br from-primary to-teal-700 text-primary-foreground shadow-md transition-transform hover:scale-[1.04] hover:shadow-lg active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
                onClick={() => void send()}
                disabled={streaming || !input.trim()}
                aria-label="Kirim"
              >
                {streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
            <p className="mx-auto mt-1.5 flex max-w-3xl items-center gap-1 text-[9px] text-muted-foreground">
              <Sparkles className="size-2.5 shrink-0 text-primary" />
              Konteks aktif: <b>{featureMeta.label}</b> — AI bisa membaca data LifeOS-mu dari fitur ini.
            </p>
          </div>
        </main>
      </div>

      {/* Dialog pengaturan tampilan */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="size-4 text-primary" /> Pengaturan tampilan chat
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ukuran font pesan</label>
              <div className="grid grid-cols-3 gap-2">
                {FONT_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => setFontPref(o.size)}
                    className={cn(
                      "rounded-xl border p-2.5 text-center transition-colors",
                      fontSize === o.size ? "border-primary/50 bg-primary/10" : "border-border hover:bg-muted/40"
                    )}
                  >
                    <span className={cn("block font-semibold", fontSize === o.size ? "text-primary" : "text-foreground")} style={{ fontSize: o.size }}>
                      Aa
                    </span>
                    <span className="mt-1 block text-[10px] font-medium">{o.label}</span>
                    <span className="block text-[8px] leading-tight text-muted-foreground">{o.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                Pesan menampilkan <b>tanggal & jam</b> — ada pemisah tanggal antar hari dan label tanggal mengambang saat scroll.
                Chat lama dimuat bertahap (lazy load) saat digulir ke atas.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus percakapan"
        description={`Hapus "${deleteTarget?.title}" beserta seluruh pesannya?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void removeSession(deleteTarget)}
      />
    </div>
  );
}
