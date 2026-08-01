"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  ChevronDown,
  Eye,
  Loader2,
  MousePointerClick,
  Search,
  ShoppingBag,
  Sparkles,
  ThumbsUp,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RupiahInput } from "@/components/ui/rupiah-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ProductItem {
  id: number;
  product: string;
  marketplace: string;
  link: string;
  price: number;
  commissionPct: number;
  analysis: string;
  ideaId: number | null;
  scriptId: number | null;
  status: "riset" | "dipromosikan" | "komisi";
  views: number;
  likes: number;
  clicks: number;
  commissionReceived: number;
  createdAt: string;
}

export interface ProductAnalysis {
  targetAudiens: string;
  angleKonten: string;
  estimasiKomisi: string;
  saran: string;
}

function parseAnalysis(raw: string): ProductAnalysis | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProductAnalysis;
  } catch {
    return null;
  }
}

const MARKETPLACES = ["tiktok-shop", "shopee", "tokopedia", "lainnya"];

const MARKET_LABEL: Record<string, string> = {
  "tiktok-shop": "TikTok Shop",
  shopee: "Shopee",
  tokopedia: "Tokopedia",
  lainnya: "Lainnya",
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  riset: { label: "🔍 Riset", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  dipromosikan: { label: "🎬 Dipromosikan", cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  komisi: { label: "💰 Komisi", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
};

/** Tab Affiliate Tracker — produk + analisa AI + performa & komisi. */
export function AffiliateProductsPanel() {
  const [items, setItems] = React.useState<ProductItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [product, setProduct] = React.useState("");
  const [marketplace, setMarketplace] = React.useState("tiktok-shop");
  const [link, setLink] = React.useState("");
  const [price, setPrice] = React.useState(0);
  const [withAI, setWithAI] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ProductItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("semua");
  const [marketFilter, setMarketFilter] = React.useState("semua");
  const [sort, setSort] = React.useState<"terbaru" | "terlama">("terbaru");

  const loadAll = React.useCallback(async () => {
    try {
      const res = await fetch("/api/content/products");
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      toast.error("Gagal memuat produk");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/content/products")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setItems(json.data ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat produk");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    const p = product.trim();
    if (!p) {
      toast.error("Tulis dulu nama produknya 🛍️");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/content/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: p, marketplace, link, price, withAI }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      toast.success(withAI ? "Produk disimpan + analisa AI 💰" : "Produk disimpan 🛍️");
      setProduct("");
      setLink("");
      setPrice(0);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const patch = async (id: number, body: Record<string, unknown>) => {
    const res = await fetch(`/api/content/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...body } : x)));
  };

  const remove = async (item: ProductItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/content/products/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Produk dihapus");
      setDeleteTarget(null);
      await loadAll();
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter(
      (it) =>
        (!q || it.product.toLowerCase().includes(q)) &&
        (statusFilter === "semua" || it.status === statusFilter) &&
        (marketFilter === "semua" || it.marketplace === marketFilter)
    );
    return sort === "terbaru" ? list : [...list].reverse();
  }, [items, query, statusFilter, marketFilter, sort]);

  return (
    <div className="space-y-4">
      {/* ── Form tambah (collapsible) ── */}
      <div className="overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card shadow-sm">
        <button
          onClick={() => setFormOpen((o) => !o)}
          className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShoppingBag className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Tambah produk affiliate</span>
            <span className="block text-[11px] text-muted-foreground">
              AI analisa target audiens, angle konten & estimasi komisi
            </span>
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", formOpen && "rotate-180")} />
        </button>

        {formOpen && (
          <div className="space-y-3 border-t border-border/40 p-4">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Nama produk
              </label>
              <Input
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="mis. Tumbler Viral 500ml, Serum Niacinamide…"
                className="h-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Marketplace
                </label>
                <select
                  value={marketplace}
                  onChange={(e) => setMarketplace(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  {MARKETPLACES.map((m) => (
                    <option key={m} value={m}>
                      {MARKET_LABEL[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Harga
                </label>
                <RupiahInput value={price} onChange={setPrice} prefix className="h-9" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Link affiliate
                </label>
                <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className="h-9 text-sm" />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input type="checkbox" checked={withAI} onChange={(e) => setWithAI(e.target.checked)} className="size-3.5 accent-primary" />
              Analisa dengan AI (target audiens, angle konten, estimasi komisi)
            </label>
            <div className="flex justify-end">
              <Button onClick={() => void save()} disabled={saving} className="h-9 gap-1.5">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <ShoppingBag className="size-4" />}
                {saving ? "Menyimpan…" : "Simpan produk"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Filter ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:max-w-xs sm:flex-1">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari produk…"
            className="h-9 w-full rounded-md border border-input bg-background pr-3 pl-8 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="semua">Semua status</option>
            <option value="riset">🔍 Riset</option>
            <option value="dipromosikan">🎬 Dipromosikan</option>
            <option value="komisi">💰 Komisi</option>
          </select>
          <select
            value={marketFilter}
            onChange={(e) => setMarketFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="semua">Semua marketplace</option>
            {MARKETPLACES.map((m) => (
              <option key={m} value={m}>
                {MARKET_LABEL[m]}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "terbaru" | "terlama")}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="terbaru">🕒 Terbaru</option>
            <option value="terlama">Terlama</option>
          </select>
          {(query || statusFilter !== "semua" || marketFilter !== "semua" || sort !== "terbaru") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setQuery("");
                setStatusFilter("semua");
                setMarketFilter("semua");
                setSort("terbaru");
              }}
            >
              Reset
            </Button>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground sm:ml-auto">
          Menampilkan {filtered.length} dari {items.length} produk
        </span>
      </div>

      {/* ── List 3 kolom ── */}
      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Memuat produk…
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {items.length === 0 ? "Belum ada produk — tambahkan yang pertama di atas! 🛍️" : "Tidak ada produk yang cocok dengan filter."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const analysis = parseAnalysis(item.analysis);
            const estKomisi = Math.round((item.price * item.commissionPct) / 100);
            return (
              <div key={item.id} className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-colors hover:border-primary/20 hover:shadow-md">
                {/* Header */}
                <div className="flex items-center gap-2.5 border-b border-border/40 bg-muted/20 px-3.5 py-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ShoppingBag className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold break-words [overflow-wrap:anywhere]">{item.product}</span>
                    <span className="block text-[9px] text-muted-foreground">
                      {format(new Date(item.createdAt.replace(" ", "T") + "Z"), "d MMM yyyy", { locale: id })} · {MARKET_LABEL[item.marketplace]}
                    </span>
                  </span>
                  <select
                    value={item.status}
                    onChange={(e) => void patch(item.id, { status: e.target.value })}
                    className={cn("h-6 rounded-full border-0 px-1.5 text-[9px] font-semibold", STATUS_META[item.status]?.cls)}
                  >
                    {Object.entries(STATUS_META).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Isi */}
                <div className="flex-1 px-3.5 py-3">
                  {/* Harga + komisi */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="rounded-lg bg-muted/40 px-2.5 py-1.5">
                      <p className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">Harga</p>
                      <p className="text-xs font-bold tabular-nums">Rp{item.price.toLocaleString("id-ID")}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-500/10 px-2.5 py-1.5">
                      <p className="text-[8px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Komisi {item.commissionPct}%</p>
                      <p className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">± Rp{estKomisi.toLocaleString("id-ID")}</p>
                    </div>
                  </div>

                  {/* Analisa AI */}
                  {analysis && (
                    <div className="mt-2 space-y-1.5 rounded-lg border border-border/50 bg-muted/20 p-2.5">
                      <p className="text-[9px] leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-foreground/80">🎯 Audiens:</span> {analysis.targetAudiens}
                      </p>
                      <p className="text-[9px] leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-foreground/80">🎬 Angle:</span> {analysis.angleKonten}
                      </p>
                      <p className="text-[9px] leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-foreground/80">💰 Estimasi:</span> {analysis.estimasiKomisi}
                      </p>
                    </div>
                  )}

                  {/* Performa */}
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    <label className="block">
                      <span className="flex items-center gap-1 text-[8px] font-semibold uppercase text-muted-foreground">
                        <Eye className="size-2.5" /> Views
                      </span>
                      <input
                        type="number"
                        value={item.views || ""}
                        placeholder="0"
                        onChange={(e) => void patch(item.id, { views: Number(e.target.value) || 0 })}
                        className="mt-0.5 h-6 w-full rounded border border-border/60 bg-background px-1.5 text-[10px] tabular-nums outline-none focus:border-primary/50"
                      />
                    </label>
                    <label className="block">
                      <span className="flex items-center gap-1 text-[8px] font-semibold uppercase text-muted-foreground">
                        <ThumbsUp className="size-2.5" /> Likes
                      </span>
                      <input
                        type="number"
                        value={item.likes || ""}
                        placeholder="0"
                        onChange={(e) => void patch(item.id, { likes: Number(e.target.value) || 0 })}
                        className="mt-0.5 h-6 w-full rounded border border-border/60 bg-background px-1.5 text-[10px] tabular-nums outline-none focus:border-primary/50"
                      />
                    </label>
                    <label className="block">
                      <span className="flex items-center gap-1 text-[8px] font-semibold uppercase text-muted-foreground">
                        <MousePointerClick className="size-2.5" /> Klik
                      </span>
                      <input
                        type="number"
                        value={item.clicks || ""}
                        placeholder="0"
                        onChange={(e) => void patch(item.id, { clicks: Number(e.target.value) || 0 })}
                        className="mt-0.5 h-6 w-full rounded border border-border/60 bg-background px-1.5 text-[10px] tabular-nums outline-none focus:border-primary/50"
                      />
                    </label>
                  </div>

                  {/* Komisi diterima */}
                  <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] px-2.5 py-1.5">
                    <p className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                      <Wallet className="size-2.5" /> Komisi diterima
                    </p>
                    <input
                      type="number"
                      value={item.commissionReceived || ""}
                      placeholder="0"
                      onChange={(e) => void patch(item.id, { commissionReceived: Number(e.target.value) || 0 })}
                      className="mt-0.5 h-6 w-full rounded border border-emerald-500/30 bg-background px-1.5 text-[10px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center border-t border-border/50 bg-muted/20 px-3 py-1.5">
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-medium text-primary hover:underline"
                    >
                      🔗 Link affiliate
                    </a>
                  )}
                  {!item.link && <span className="text-[10px] text-muted-foreground">Tanpa link</span>}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto size-6 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(item)}
                    aria-label="Hapus produk"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus produk"
        description={`Hapus produk "${deleteTarget?.product}"?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
