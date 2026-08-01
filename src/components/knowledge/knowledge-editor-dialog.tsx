"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Library, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { cn } from "@/lib/utils";
import type { KnowledgeItem } from "@/components/knowledge/knowledge-card";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ada isinya = mode edit; kosong = mode buat */
  item?: KnowledgeItem | null;
  defaultCategory?: string;
  onSaved?: () => void;
}

/** Dialog tambah/edit knowledge — RichTextEditor (Quill) + kategori/tags relasi. */
export function KnowledgeEditorDialog({
  open,
  onOpenChange,
  item,
  defaultCategory,
  onSaved,
}: Props) {
  const isEdit = Boolean(item);
  const [title, setTitle] = React.useState(item?.title ?? "");
  const [content, setContent] = React.useState(item?.content ?? "");
  const [categoryNames, setCategoryNames] = React.useState<string[]>(
    item?.categories.map((c) => c.name) ?? (defaultCategory ? [defaultCategory] : [])
  );
  const [tagText, setTagText] = React.useState(
    item?.tags.map((t) => t.name).join(", ") ?? ""
  );
  const [availableCategories, setAvailableCategories] = React.useState<string[]>([]);
  const [catPopoverOpen, setCatPopoverOpen] = React.useState(false);
  const [newCategory, setNewCategory] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Ambil daftar kategori yang sudah ada (autocomplete)
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/knowledge/labels")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          setAvailableCategories(
            json.data.categories.map((c: { name: string }) => c.name)
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  const toggleCategory = (name: string) => {
    setCategoryNames((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const addNewCategory = () => {
    const n = newCategory.trim().toLowerCase();
    if (!n) return;
    setCategoryNames((prev) => (prev.includes(n) ? prev : [...prev, n]));
    setNewCategory("");
  };

  const save = async () => {
    const t = title.trim();
    if (!t) {
      toast.error("Judul wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const tags = tagText
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean);

      const res = await fetch(
        isEdit ? `/api/knowledge/${item!.id}` : "/api/knowledge",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: t, content, categories: categoryNames, tags }),
        }
      );
      if (!res.ok) throw new Error("Gagal");
      toast.success(isEdit ? "Perubahan disimpan ✨" : "Tersimpan ke Knowledge ✨");
      onOpenChange(false);
      onSaved?.();
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {isEdit ? (
              <>
                <Pencil className="size-4 text-primary" /> Edit catatan
              </>
            ) : (
              <>
                <Library className="size-4 text-primary" /> Tangkap ide
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Judul…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className="text-base"
          />
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Tulis isi catatan…"
            minHeight={300}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Kategori — multi-select dengan saran */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Kategori
              </p>
              <div className="flex flex-wrap gap-1.5">
                {categoryNames.map((c) => (
                  <Badge key={c} variant="secondary" className="gap-1 capitalize">
                    {c}
                    <button
                      type="button"
                      onClick={() => toggleCategory(c)}
                      aria-label={`Hapus kategori ${c}`}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Popover open={catPopoverOpen} onOpenChange={setCatPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={catPopoverOpen}
                    className="w-full justify-between"
                  >
                    Pilih / tambah kategori…
                    <ChevronsUpDown className="size-3 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Cari atau ketik kategori baru…"
                      value={newCategory}
                      onValueChange={setNewCategory}
                    />
                    <CommandList>
                      <CommandEmpty className="py-2 text-center text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={addNewCategory}
                          className="text-primary"
                        >
                          <Plus className="size-3" /> Buat &quot;{newCategory}&quot;
                        </Button>
                      </CommandEmpty>
                      <CommandGroup>
                        {availableCategories.map((name) => (
                          <CommandItem
                            key={name}
                            value={name}
                            onSelect={() => toggleCategory(name)}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-3",
                                categoryNames.includes(name)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <span className="capitalize">{name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Tags — input bebas comma-separated */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Tags (pisahkan dengan koma)
              </p>
              <Input
                placeholder="produktivitas, belajar, ide…"
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Tag otomatis disimpan sebagai relasi &amp; dinormalisasi
                (huruf kecil).
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Menyimpan…" : isEdit ? "Simpan perubahan" : "Simpan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
