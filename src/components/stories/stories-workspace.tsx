"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  BookHeart,
  CalendarDays,
  ChevronDown,
  Heart,
  Loader2,
  PencilLine,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface StoryItem {
  id: number;
  age: number;
  title: string;
  category: string;
  actors: string;
  story: string;
  createdAt: string;
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

const CATEGORIES = [
  { id: "percintaan", label: "💕 Percintaan", color: "text-rose-500 bg-rose-500/10" },
  { id: "konflik", label: "⚡ Konflik", color: "text-red-500 bg-red-500/10" },
  { id: "keluarga", label: "👨‍👩‍👧 Keluarga", color: "text-amber-500 bg-amber-500/10" },
  { id: "karier", label: "💼 Karier", color: "text-blue-500 bg-blue-500/10" },
  { id: "pendidikan", label: "🎓 Pendidikan", color: "text-indigo-500 bg-indigo-500/10" },
  { id: "pertemanan", label: "🤝 Pertemanan", color: "text-emerald-500 bg-emerald-500/10" },
  { id: "kesehatan", label: "🩺 Kesehatan", color: "text-cyan-500 bg-cyan-500/10" },
  { id: "lainnya", label: "📌 Lainnya", color: "text-muted-foreground bg-muted/40" },
];

function catMeta(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

/** Label fase hidup per usia. */
function faseOf(age: number): string {
  if (age <= 5) return "Balita";
  if (age <= 12) return "Anak-anak";
  if (age <= 17) return "Remaja";
  if (age <= 23) return "Dewasa awal";
  return "Dewasa";
}

/** Bulan + tahun untuk stage usia N: bulan lahir + tahun lahir+N. Contoh: "Agustus 1997". */
function stageDate(birthDate: string, age: number): string {
  if (!birthDate) return "";
  const b = new Date(birthDate + "T00:00:00");
  if (Number.isNaN(b.getTime())) return "";
  const d = new Date(b.getFullYear() + age, b.getMonth(), 1);
  return format(d, "MMMM yyyy", { locale: idLocale });
}

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

/** Story of My Life — profil biodata + timeline pohon per stage umur + AI curhat. */
export function StoriesWorkspace() {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [savingProfile, setSavingProfile] = React.useState(false);

  const [stories, setStories] = React.useState<StoryItem[]>([]);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [deleteTarget, setDeleteTarget] = React.useState<StoryItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [editing, setEditing] = React.useState<StoryItem | null>(null);

  // Stage terpilih di timeline
  const [selectedAge, setSelectedAge] = React.useState<number | null>(null);

  // Form cerita
  const [formOpen, setFormOpen] = React.useState(false);
  const [formAge, setFormAge] = React.useState(20);
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState("lainnya");
  const [actors, setActors] = React.useState("");
  const [story, setStory] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // ── Load profil + cerita ──
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pRes, sRes] = await Promise.all([fetch("/api/life-profile"), fetch("/api/stories")]);
        const [pJson, sJson] = await Promise.all([pRes.json(), sRes.json()]);
        if (cancelled) return;
        setProfile(pJson.data ?? null);
        const data = (sJson.data ?? []) as StoryItem[];
        setStories(data);
        setProfileLoaded(true);
        // Default stage: usia sekarang (paling baru) jika ada cerita, else usia pertama
        if (pJson.data?.birthDate) {
          const cur = ageFromBirth(pJson.data.birthDate);
          const hasStories = data.some((s) => s.age === cur);
          setSelectedAge(hasStories || data.length === 0 ? cur : data[data.length - 1].age);
        } else if (data.length > 0) {
          setSelectedAge(data[data.length - 1].age);
        }
      } catch {
        setProfileLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // ── State profil (form) ──
  const [pBirth, setPBirth] = React.useState("");
  const [pValues, setPValues] = React.useState("");
  const [pWounds, setPWounds] = React.useState("");
  const [pParenting, setPParenting] = React.useState("");
  const [pFamily, setPFamily] = React.useState("");
  const [pNotes, setPNotes] = React.useState("");

  const openProfileEdit = () => {
    setPBirth(profile?.birthDate ?? "");
    setPValues(profile?.values ?? "");
    setPWounds(profile?.childhoodWounds ?? "");
    setPParenting(profile?.parenting ?? "");
    setPFamily(profile?.family ?? "");
    setPNotes(profile?.lifeNotes ?? "");
    setProfileOpen(true);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/life-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthDate: pBirth,
          values: pValues,
          childhoodWounds: pWounds,
          parenting: pParenting,
          family: pFamily,
          lifeNotes: pNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      toast.success("Biodata tersimpan 🌱");
      setProfileOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Stage timeline ──
  const currentAge = profile?.birthDate ? ageFromBirth(profile.birthDate) : 0;
  const stages = currentAge > 0 ? Array.from({ length: currentAge }, (_, i) => i + 1) : [];
  const stageStories = (age: number) => stories.filter((s) => s.age === age);

  const openAddFor = (age: number) => {
    setEditing(null);
    setFormAge(age);
    setTitle("");
    setCategory("lainnya");
    setActors("");
    setStory("");
    setFormOpen(true);
  };

  const openEdit = (s: StoryItem) => {
    setEditing(s);
    setFormAge(s.age);
    setTitle(s.title);
    setCategory(s.category);
    setActors(s.actors);
    setStory(s.story);
    setFormOpen(true);
  };

  const save = async () => {
    const t = title.trim();
    if (!t) {
      toast.error("Judul cerita wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const body = {
        id: editing?.id,
        age: formAge,
        title: t,
        category,
        actors,
        story,
      };
      const res = await fetch("/api/stories", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      toast.success(editing ? "Cerita diperbarui ✏️" : "Cerita tersimpan 📖");
      setFormOpen(false);
      setSelectedAge(formAge);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: StoryItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/stories/${s.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Cerita dihapus");
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  // ── Form biodata (dialog) ──
  const profileForm = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => profileOpen && setProfileOpen(false)}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Settings2 className="size-4 text-primary" /> Biodata hidup
          </p>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setProfileOpen(false)} aria-label="Tutup">
            <Plus className="size-4 rotate-45" />
          </Button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <CalendarDays className="size-3" /> Tanggal lahir
            </span>
            <Input type="date" value={pBirth} onChange={(e) => setPBirth(e.target.value)} className="h-9 text-sm" />
            <span className="mt-1 block text-[10px] text-muted-foreground">
              {pBirth ? `→ usia sekarang ${ageFromBirth(pBirth)} tahun (timeline akan dibuat otomatis)` : "Isi untuk membuat timeline stage umur"}
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Nilai yang kamu pedulikan</span>
            <Input value={pValues} onChange={(e) => setPValues(e.target.value)} placeholder="mis. kejujuran, keluarga, ilmu" className="h-9 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Luka masa kecil</span>
            <Textarea value={pWounds} onChange={(e) => setPWounds(e.target.value)} rows={2} placeholder="mis. sering merasa tidak didengar" className="text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Bagaimana kamu dididik orang tua</span>
            <Textarea value={pParenting} onChange={(e) => setPParenting(e.target.value)} rows={2} placeholder="mis. dididik keras tapi penuh kasih" className="text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Keluarga inti</span>
            <Input value={pFamily} onChange={(e) => setPFamily(e.target.value)} placeholder="mis. anak kedua dari 3 bersaudara" className="h-9 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Catatan hidup lain</span>
            <Textarea value={pNotes} onChange={(e) => setPNotes(e.target.value)} rows={2} placeholder="opsional" className="text-sm" />
          </label>
          <Button onClick={() => void saveProfile()} disabled={savingProfile} className="w-full gap-2">
            {savingProfile ? <Loader2 className="size-4 animate-spin" /> : <Heart className="size-4" />}
            Simpan biodata
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <BookHeart className="size-6 text-primary" /> Story of My Life
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pohon kehidupanmu — dari lahir sampai hari ini, cerita per stage usia.
        </p>
      </header>

      {!profileLoaded ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Memuat…
        </div>
      ) : !profile?.birthDate ? (
        /* ── BELUM ADA BIODATA → wajib isi dulu ── */
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <BookHeart className="mx-auto size-10 text-primary/50" />
          <h2 className="mt-3 text-base font-semibold">Mulai dari biodata hidupmu 🌱</h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            Isi tanggal lahir, nilai yang kamu pedulikan, luka masa kecil, dan bagaimana kamu
            dididik — dari situ LifeOS membuat pohon timeline otomatis per stage usia, dari 1
            tahun sampai usiamu sekarang.
          </p>
          <Button className="mt-4 gap-2" onClick={openProfileEdit}>
            <Settings2 className="size-4" /> Isi biodata sekarang
          </Button>
        </div>
      ) : (
        <>
          {/* ── Ringkasan profil ── */}
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">👤 Umur {currentAge} tahun</p>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {stages.length} stage
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                {profile?.values && <span>💎 {profile.values}</span>}
                {profile?.childhoodWounds && <span>🩹 {profile.childhoodWounds.slice(0, 80)}</span>}
                {profile?.parenting && <span>🏡 {profile.parenting.slice(0, 80)}</span>}
                {!profile?.values && !profile?.childhoodWounds && !profile?.parenting && (
                  <span>Lengkapi biodata untuk konteks AI yang lebih dalam.</span>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={openProfileEdit}>
              <Settings2 className="size-3.5" /> Edit biodata
            </Button>
          </div>

          {/* ── Timeline pohon ── */}
          <div className="overflow-hidden rounded-xl border border-border bg-gradient-to-b from-card to-card/60 shadow-sm">
            <div className="border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-transparent px-4 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookHeart className="size-4" />
                </span>
                Pohon kehidupanmu
              </h2>
              <p className="mt-0.5 pl-9 text-[11px] text-muted-foreground">
                Setiap usia adalah cabang — klik untuk melihat cerita, atau curhat ke AI.
              </p>
            </div>
            <div className="px-4 py-4">
              <div className="relative">
                {/* Garis vertikal di TENGAH */}
                <div className="absolute bottom-10 left-1/2 top-2 w-px -translate-x-1/2 bg-gradient-to-b from-primary/50 via-primary/20 to-emerald-500/40" />
                {stages.map((age, idx) => {
                  const list = stageStories(age);
                  const isActive = selectedAge === age;
                  const hasStories = list.length > 0;
                  const isLeft = idx % 2 === 0;
                  return (
                    <div key={age} className="relative pb-2.5">
                      {/* Titik node di tengah */}
                      <span
                        className={cn(
                          "absolute left-1/2 top-4 z-10 flex size-[13px] -translate-x-1/2 items-center justify-center rounded-full border-2 transition-all",
                          hasStories
                            ? "border-primary bg-primary shadow-[0_0_0_4px_rgba(13,148,136,0.15)]"
                            : isActive
                              ? "border-primary bg-primary/30"
                              : "border-border bg-card"
                        )}
                      />
                      {/* Baris stage — bergantian kiri/kanan */}
                      <div className={cn("flex items-center", isLeft ? "pr-[calc(50%+18px)]" : "pl-[calc(50%+18px)]")}>
                        <button
                          onClick={() => setSelectedAge(age)}
                          className={cn(
                            "group/stage flex w-full min-w-0 items-center gap-2.5 rounded-xl py-2 pl-3 pr-2 text-left transition-all duration-200",
                            "hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:ring-1 hover:ring-primary/30",
                            isLeft && "flex-row-reverse text-right",
                            isActive
                              ? "bg-gradient-to-r from-primary/10 to-primary/5 ring-1 ring-primary/20"
                              : "hover:bg-primary/5"
                          )}
                        >
                          {/* Info stage: usia + fase, lalu bulan-tahun di baris sendiri */}
                          <div className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "text-sm font-bold tabular-nums transition-colors",
                                  hasStories || isActive ? "text-primary" : "text-foreground group-hover/stage:text-primary"
                                )}
                              >
                                {age}
                              </span>
                              <span className="text-[9px] uppercase tracking-wide text-muted-foreground">thn</span>
                              <span
                                className={cn(
                                  "hidden rounded-full px-2 py-0.5 text-[9px] font-medium transition-colors sm:inline",
                                  isActive ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground group-hover/stage:bg-primary/10 group-hover/stage:text-primary"
                                )}
                              >
                                {faseOf(age)}
                              </span>
                            </span>
                            {/* Bulan + tahun stage (baris sendiri — tidak terpotong) */}
                            <span className="block text-[10px] font-medium text-muted-foreground/80 transition-colors group-hover/stage:text-primary/80">
                              {stageDate(profile?.birthDate ?? "", age)}
                            </span>
                          </div>
                          <div className={cn("flex shrink-0 items-center gap-1.5", isLeft ? "mr-auto" : "ml-auto")}>
                            {hasStories ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                <BookHeart className="size-3" /> {list.length}
                              </span>
                            ) : (
                              <span className="hidden rounded-full bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground sm:inline">
                                kosong
                              </span>
                            )}
                            <Link
                              href={`/stories/curhat?age=${age}`}
                              title={`AI Teman Curhat — usia ${age}`}
                              className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/15"
                            >
                              <Sparkles className="size-3" /> Curhat
                            </Link>
                            <ChevronDown
                              className={cn(
                                "size-3.5 text-muted-foreground transition-transform duration-200",
                                isActive && "rotate-180 text-primary"
                              )}
                            />
                          </div>
                        </button>
                      </div>

                      {/* Konten stage aktif — full width di bawah node */}
                      {isActive && (
                        <div className="relative z-[5] mt-1 space-y-2 rounded-xl bg-card/95 px-3 py-3 shadow-sm ring-1 ring-border/60 sm:px-5">
                          {list.length === 0 && (
                            <p className="text-[11px] italic text-muted-foreground">
                              Belum ada cerita di usia ini — tulis kenanganmu. ✍️
                            </p>
                          )}
                          {list.map((s) => {
                            const meta = catMeta(s.category);
                            const actorList = s.actors.split(",").map((a) => a.trim()).filter(Boolean);
                            return (
                              <div key={s.id} className="rounded-lg border border-border/70 bg-card p-3 shadow-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-xs font-semibold">{s.title}</p>
                                  <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium", meta.color)}>
                                    {meta.label}
                                  </span>
                                  <div className="ml-auto flex gap-0.5">
                                    <Button variant="ghost" size="icon" className="size-6" onClick={() => openEdit(s)} aria-label={`Edit ${s.title}`}>
                                      <PencilLine className="size-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-6 text-muted-foreground hover:text-destructive"
                                      onClick={() => setDeleteTarget(s)}
                                      aria-label={`Hapus ${s.title}`}
                                    >
                                      <Trash2 className="size-3" />
                                    </Button>
                                  </div>
                                </div>
                                {actorList.length > 0 && (
                                  <p className="mt-1 flex flex-wrap items-center gap-1 text-[9px] text-muted-foreground">
                                    <Users className="size-2.5" />
                                    {actorList.map((a, i) => (
                                      <span key={i} className="rounded-full bg-muted px-1.5 py-0.5">{a}</span>
                                    ))}
                                  </p>
                                )}
                                <p className="mt-1.5 whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
                                  {s.story || <span className="italic">(belum ada isi)</span>}
                                </p>
                              </div>
                            );
                          })}
                          <button
                            onClick={() => openAddFor(age)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary/30 px-3 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
                          >
                            <Plus className="size-3" /> Tulis cerita usia {age}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Akar — di tengah */}
                <div className="relative flex items-center justify-center gap-2.5 pb-1 pt-1">
                  <span className="absolute left-1/2 top-1/2 flex size-[15px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-md">
                    <Heart className="size-2.5 fill-white" />
                  </span>
                  <p className="pl-6 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    Hari ini — umur {currentAge} tahun 🌱
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {profileOpen && profileForm}

      {/* ── Dialog form cerita (besar) ── */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setFormOpen(false)}>
          <div
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-semibold">
                {editing ? "Edit cerita" : `Tulis cerita — usia ${formAge} tahun`}
              </p>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setFormOpen(false)} aria-label="Tutup">
                <Plus className="size-4 rotate-45" />
              </Button>
            </div>
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Usia saat itu</span>
                  <Input type="number" min={1} max={120} value={formAge || ""} onChange={(e) => setFormAge(Number(e.target.value))} className="h-9 text-sm" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Kategori</span>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-9 text-sm" aria-label="Kategori">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Judul cerita</span>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Pertama kali patah hati" className="h-9 text-sm" />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <Users className="size-3" /> Aktor yang terlibat (pisahkan dengan koma)
                </span>
                <Input value={actors} onChange={(e) => setActors(e.target.value)} placeholder="mis. Ayah, Siti, sahabat kuliah" className="h-9 text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Ceritanya</span>
                <Textarea
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  placeholder="Tuliskan apa yang terjadi, siapa pelakunya, bagaimana perasaanmu saat itu…"
                  rows={14}
                  className="min-h-[280px] text-sm leading-relaxed"
                />
                <span className="mt-1 block text-right text-[10px] text-muted-foreground">
                  {story.length.toLocaleString("id-ID")} karakter — tulis sepanjang yang kamu ingat
                </span>
              </label>
              <Button onClick={() => void save()} disabled={saving} className="w-full gap-2 py-2.5">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Heart className="size-4" />}
                {saving ? "Menyimpan…" : editing ? "Simpan perubahan" : "Simpan cerita"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus cerita"
        description={`Hapus cerita "${deleteTarget?.title}" (usia ${deleteTarget?.age})?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
