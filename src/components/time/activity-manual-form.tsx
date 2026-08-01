"use client";

import * as React from "react";
import { CalendarDays, Clock, Loader2, NotebookPen, Plus, Tags, X } from "lucide-react";
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
import { toast } from "sonner";

export interface ActivityCategoryOption {
  id: number;
  name: string;
  value: "produktif" | "netral" | "buang";
  color: string;
}

interface Props {
  categories: ActivityCategoryOption[];
  onSaved: () => void;
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Form pencatatan aktivitas MANUAL — aktivitas yang sudah terjadi (TIM-02). */
export function ActivityManualForm({ categories, onSaved }: Props) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [date, setDate] = React.useState(todayStr());
  const [startTime, setStartTime] = React.useState(nowHHMM());
  const [endTime, setEndTime] = React.useState(nowHHMM());
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const addTag = () => {
    const t = tagInput.trim().replace(/,/g, "");
    if (!t) return;
    if (tags.includes(t)) {
      setTagInput("");
      return;
    }
    setTags((prev) => [...prev, t].slice(0, 10));
    setTagInput("");
  };

  const save = async () => {
    const n = name.trim();
    if (!n) {
      toast.error("Tulis dulu aktivitasnya apa");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/time/activities/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          description: description.trim(),
          categoryId: categoryId ? Number(categoryId) : null,
          date,
          startTime,
          endTime,
          tags,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      toast.success(`"${n}" dicatat ⏱`);
      setName("");
      setDescription("");
      setCategoryId("");
      setTags([]);
      setTagInput("");
      setStartTime(nowHHMM());
      setEndTime(nowHHMM());
      setDate(todayStr());
      onSaved();
    } catch {
      toast.error("Gagal menyimpan aktivitas");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <NotebookPen className="size-4 text-indigo-500" />
        Catat aktivitas manual
        <span className="text-[10px] font-normal text-muted-foreground">(yang sudah terjadi)</span>
      </p>

      <div className="space-y-3">
        <Input
          placeholder="Aktivitas — mis. Bangun tidur, Makan siang, Meeting Q3…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void save()}
          className="h-9 text-sm"
        />

        {/* Tanggal (full-width) */}
        <div>
          <p className="mb-1 flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <CalendarDays className="size-3" /> Tanggal
          </p>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 text-sm"
          />
        </div>

        {/* Jam mulai & selesai — 2 kolom */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <Clock className="size-3" /> Mulai
            </p>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <p className="mb-1 flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <Clock className="size-3" /> Selesai
            </p>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Kategori */}
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground">Kategori</p>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-9 w-full text-sm">
              <SelectValue placeholder="Pilih kategori (opsional)" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)} className="capitalize">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: c.color }} />
                    {c.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Deskripsi */}
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground">Deskripsi (opsional)</p>
          <Textarea
            placeholder="mis. Bangun kesiangan, tidur jam 2 pagi tadi malam…"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="resize-none text-sm"
          />
        </div>

        {/* Tags */}
        <div className="space-y-1">
          <p className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <Tags className="size-3" /> Tags (opsional)
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="mis. rutinitas, deep-work…"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag();
                }
              }}
              className="h-9 flex-1 text-sm"
            />
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={addTag} aria-label="Tambah tag">
              <Plus className="size-4" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                >
                  #{t}
                  <button
                    onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                    aria-label={`Hapus tag ${t}`}
                    className="text-primary/60 hover:text-primary"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <Button onClick={() => void save()} disabled={saving} className="w-full gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {saving ? "Menyimpan…" : "Catat aktivitas"}
        </Button>
      </div>
    </div>
  );
}
