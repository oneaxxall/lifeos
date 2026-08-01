"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  ArrowLeft,
  BookHeart,
  CalendarDays,
  ChevronDown,
  Home,
  Loader2,
  Send,
  Sparkles,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { QuillContent } from "@/components/ui/rich-text-editor";
import { sanitizeHtml } from "@/lib/sanitize";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ChatMsg {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

export interface Profile {
  id: number;
  birthDate: string;
  values: string;
  childhoodWounds: string;
  parenting: string;
  family: string;
  lifeNotes: string;
}

export interface StoryItem {
  id: number;
  age: number;
  title: string;
  category: string;
  actors: string;
  story: string;
}

const CATEGORIES: Record<string, { label: string; color: string }> = {
  percintaan: { label: "💕 Percintaan", color: "text-rose-500 bg-rose-500/10" },
  konflik: { label: "⚡ Konflik", color: "text-red-500 bg-red-500/10" },
  keluarga: { label: "👨‍👩‍👧 Keluarga", color: "text-amber-500 bg-amber-500/10" },
  karier: { label: "💼 Karier", color: "text-blue-500 bg-blue-500/10" },
  pendidikan: { label: "🎓 Pendidikan", color: "text-indigo-500 bg-indigo-500/10" },
  pertemanan: { label: "🤝 Pertemanan", color: "text-emerald-500 bg-emerald-500/10" },
  kesehatan: { label: "🩺 Kesehatan", color: "text-cyan-500 bg-cyan-500/10" },
  lainnya: { label: "📌 Lainnya", color: "text-muted-foreground bg-muted/40" },
};

/** Hitung usia sekarang dari tanggal lahir. */
function ageFromBirth(birthDate: string): number {
  if (!birthDate) return 0;
  const b = new Date(birthDate + "T00:00:00");
  if (Number.isNaN(b.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return Math.max(0, age);
}

/** Halaman AI Teman Curhat — 1 halaman: profil hidup + cerita stage + riwayat chat. */
export function StoryChat({ age: initialAge }: { age: number }) {
  const router = useRouter();
  const [age, setAge] = React.useState(initialAge);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [stories, setStories] = React.useState<StoryItem[]>([]);
  const [msgs, setMsgs] = React.useState<ChatMsg[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [input, setInput] = React.useState("");
  const [chatting, setChatting] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ChatMsg | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [storyOpen, setStoryOpen] = React.useState(true);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  /** Keyboard-aware: deteksi tinggi keyboard mobile via visualViewport → input selalu terlihat. */
  const [kbInset, setKbInset] = React.useState(0);
  React.useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.height);
      setKbInset(kb);
    };
    vv.addEventListener("resize", update);
    update();
    return () => vv.removeEventListener("resize", update);
  }, []);

  // Muat SEMUA info dari DB: profil + cerita stage + riwayat chat
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setMsgs([]);
      try {
        const [pRes, sRes, chatRes] = await Promise.all([
          fetch("/api/life-profile"),
          fetch(`/api/stories?age=${age}`),
          fetch(`/api/stories/chat?age=${age}`),
        ]);
        const [pJson, sJson, chatJson] = await Promise.all([pRes.json(), sRes.json(), chatRes.json()]);
        if (cancelled) return;
        setProfile(pJson.data ?? null);
        setStories(sJson.data ?? []);
        setMsgs(chatJson.data ?? []);
      } catch {
        // biarkan kosong
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [age]);

  // Auto-scroll
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || chatting) return;
    setInput("");
    setChatting(true);
    const tempUser = -Date.now();
    const tempAi = -Date.now() - 1;
    setMsgs((m) => [
      ...m,
      { id: tempUser, role: "user", content: msg },
      { id: tempAi, role: "assistant", content: "" },
    ]);
    try {
      const res = await fetch("/api/stories/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ age, message: msg }),
      });
      if (!res.ok || !res.body) {
        throw new Error("Gagal");
      }
      // Streaming: baca chunk per chunk → token muncul real-time
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMsgs((m) => m.map((x) => (x.id === tempAi ? { ...x, content: acc } : x)));
      }
      // Sinkronkan id asli dari DB (untuk fitur hapus pesan)
      const cRes = await fetch(`/api/stories/chat?age=${age}`);
      const cJson = await cRes.json();
      setMsgs(cJson.data ?? []);
    } catch (err) {
      setMsgs((m) => [
        ...m.filter((x) => x.id !== tempAi && x.id !== tempUser),
        { id: tempAi, role: "assistant", content: "Maaf, aku gagal merespons. Coba lagi ya 💛" },
      ]);
      toast.error(err instanceof Error ? err.message : "Gagal mengirim");
    } finally {
      setChatting(false);
    }
  };

  const remove = async (m: ChatMsg) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/stories/chat/${m.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Pesan dihapus");
      setDeleteTarget(null);
      setMsgs((list) => list.filter((x) => x.id !== m.id));
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  const currentAge = profile?.birthDate ? ageFromBirth(profile.birthDate) : 0;
  const stages = currentAge > 0 ? Array.from({ length: currentAge }, (_, i) => i + 1) : [];
  const chatCount = msgs.filter((m) => m.role === "user").length;
  const meta = (id: string) => CATEGORIES[id] ?? CATEGORIES["lainnya"];

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <header className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => router.push("/stories")} aria-label="Kembali">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Sparkles className="size-5 text-primary" /> AI Teman Curhat
          </h1>
          <p className="text-xs text-muted-foreground">
            Usia {age} tahun · {chatCount} percakapan tersimpan · {stories.length} cerita sebagai konteks
          </p>
        </div>
        <Link href="/stories">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <BookHeart className="size-3.5" /> Ke cerita
          </Button>
        </Link>
      </header>

      {/* ── Pilih stage usia (chips) ── */}
      {stages.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {stages.map((a) => (
            <button
              key={a}
              onClick={() => setAge(a)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                age === a
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40"
              )}
            >
              {a}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* ── Sidebar konteks: SEMUA info dari DB ── */}
        <aside className="min-w-0 space-y-3 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto lg:pr-1">
          {/* Profil hidup — nilai tampil langsung, sisanya collapsible (privasi) */}
          {profile?.birthDate && (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                aria-expanded={profileOpen}
              >
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Home className="size-3 text-primary" /> Profil hidupku
                </p>
                <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", profileOpen && "rotate-180")} />
              </button>

              {/* Nilai — SELALU tampil (ringkas, tidak sensitif) */}
              {profile.values && (
                <div className="px-4 pb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {profile.values
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean)
                      .map((v, i) => (
                        <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {v}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Detail sensitif — collapsible default tertutup */}
              {profileOpen && (
                <div className="space-y-2 border-t border-border/60 p-4 pt-3 text-[11px] leading-relaxed">
                  <p className="flex items-start gap-1.5">
                    <CalendarDays className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                    <span>
                      Lahir <b>{profile.birthDate}</b> — sekarang {currentAge} tahun
                    </span>
                  </p>
                  {profile.childhoodWounds && (
                    <p className="flex items-start gap-1.5">
                      <span className="mt-0.5 shrink-0">🩹</span>
                      <span>
                        <b>Luka masa kecil:</b> {profile.childhoodWounds}
                      </span>
                    </p>
                  )}
                  {profile.parenting && (
                    <p className="flex items-start gap-1.5">
                      <span className="mt-0.5 shrink-0">🏡</span>
                      <span>
                        <b>Pola asuh:</b> {profile.parenting}
                      </span>
                    </p>
                  )}
                  {profile.family && (
                    <p className="flex items-start gap-1.5">
                      <span className="mt-0.5 shrink-0">👨‍👩‍👧</span>
                      <span>
                        <b>Keluarga:</b> {profile.family}
                      </span>
                    </p>
                  )}
                  {profile.lifeNotes && (
                    <p className="flex items-start gap-1.5">
                      <span className="mt-0.5 shrink-0">📝</span>
                      <span>{profile.lifeNotes}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Cerita stage usia ini */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <button
              onClick={() => setStoryOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              aria-expanded={storyOpen}
            >
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <BookHeart className="size-3 text-primary" /> Cerita usia {age} ({stories.length})
              </p>
              <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", storyOpen && "rotate-180")} />
            </button>
            {storyOpen && (
              <div className="space-y-2 border-t border-border/60 p-3">
                {stories.length === 0 ? (
                  <p className="text-[11px] italic text-muted-foreground">
                    Belum ada cerita di usia {age} — konteks AI hanya dari profil hidupmu.
                  </p>
                ) : (
                  stories.map((s) => {
                    const m = meta(s.category);
                    const actorList = s.actors.split(",").map((a) => a.trim()).filter(Boolean);
                    return (
                      <div key={s.id} className="rounded-lg border border-border/70 bg-muted/20 p-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-[11px] font-semibold">{s.title}</p>
                          <span className={cn("rounded-full px-1.5 py-0.5 text-[8px] font-medium", m.color)}>
                            {m.label}
                          </span>
                        </div>
                        {actorList.length > 0 && (
                          <p className="mt-1 flex flex-wrap items-center gap-1 text-[9px] text-muted-foreground">
                            <Users className="size-2.5" />
                            {actorList.map((a, i) => (
                              <span key={i} className="rounded-full bg-muted px-1.5 py-0.5">{a}</span>
                            ))}
                          </p>
                        )}
                        <div className="mt-1.5">
                          {s.story ? (
                            <QuillContent html={sanitizeHtml(s.story)} className="!p-0 text-[10px] leading-relaxed text-muted-foreground" />
                          ) : (
                            <span className="text-[10px] italic text-muted-foreground">(belum ada isi)</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ── Chat window — tinggi FIXED agar inner scroll bekerja; keyboard-aware di mobile ── */}
        <div
          className="flex h-[60dvh] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:h-[calc(100vh-220px)]"
          style={kbInset > 0 ? { height: `calc(${window.innerHeight - kbInset - 170}px)` } : undefined}
        >
          <div ref={scrollRef} className="min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Memuat riwayat…
              </div>
            ) : msgs.length === 0 ? (
              <div className="mx-auto max-w-sm py-10 text-center">
                <Sparkles className="mx-auto size-8 text-primary/50" />
                <p className="mt-2 text-sm font-medium">Mulai curhat tentang usiamu yang ke-{age}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Aku sudah membaca {stories.length} ceritamu dan memahami latar hidupmu — ceritakan
                  apa pun yang kamu rasakan. 💛
                </p>
              </div>
            ) : (
              msgs.map((m) => {
                const isUser = m.role === "user";
                const ts = m.createdAt ? new Date(m.createdAt.replace(" ", "T") + "Z") : null;
                const validTs = ts && !Number.isNaN(ts.getTime()) ? ts : new Date();
                return (
                  <div key={m.id} className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>
                    {/* Avatar */}
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full",
                        isUser
                          ? "bg-primary/15 text-primary"
                          : "bg-gradient-to-br from-primary to-teal-600 text-white shadow-sm"
                      )}
                    >
                      {isUser ? <User className="size-4" /> : <Sparkles className="size-4" />}
                    </div>
                    <div className={cn("group flex max-w-[75%] flex-col", isUser ? "items-end" : "items-start")}>
                      {/* Nama + waktu */}
                      <div className={cn("mb-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground", isUser && "flex-row-reverse")}>
                        <span className="font-medium">{isUser ? "Kamu" : "AI Teman Curhat"}</span>
                        <span>·</span>
                        <span className="tabular-nums">
                          {format(validTs, "d MMM yyyy, HH:mm", { locale: idLocale })}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "min-w-0 max-w-[75%] break-words whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere]",
                          isUser
                            ? "rounded-br-sm bg-primary/15 text-primary"
                            : "rounded-bl-sm bg-muted/40"
                        )}
                      >
                        {m.content || (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <span className="size-1.5 animate-pulse rounded-full bg-current" />
                            <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
                            <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
                          </span>
                        )}
                      </div>
                      {m.content && (
                        <button
                          onClick={() => setDeleteTarget(m)}
                          className={cn(
                            "mt-0.5 flex items-center gap-1 text-[9px] text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100",
                            isUser ? "flex-row-reverse" : ""
                          )}
                        >
                          <Trash2 className="size-2.5" /> hapus pesan
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Input ── */}
          <div className="flex items-center gap-2 border-t border-border/60 p-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Curhat tentang usiamu yang ke-${age}…`}
              className="h-10 flex-1 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) void send();
              }}
            />
            <Button size="icon" className="size-10 shrink-0" onClick={() => void send()} disabled={chatting || !input.trim()} aria-label="Kirim">
              {chatting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus pesan"
        description="Hapus pesan ini dari riwayat percakapan?"
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
