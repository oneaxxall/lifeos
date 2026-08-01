/**
 * Carousel Slide Renderer — murni canvas API (client-side).
 * - Background: procedural (mesh/wave/geometric/glow/minimal) ATAU gambar Picsum
 * - Header: avatar inisial + nama brand + badge topik
 * - Footer: handle IG + tagline
 * - 3 ukuran: square 1080², portrait 1080×1350, story 1080×1920
 */

export interface SlideData {
  heading: string;
  points: string[];
  emoji?: string;
}

export interface BgSpec {
  style: "mesh" | "wave" | "geometric" | "glow" | "minimal";
  palet: string[];
  arahGradient?: string;
  bentuk?: string;
}

export interface Branding {
  brandName: string;
  handle: string;
  tagline: string;
  initials: string;
  showBranding: boolean;
}

export type CarouselSize = "square" | "portrait" | "story";

export const CAROUSEL_RATIOS: Record<CarouselSize, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: "Persegi 1080×1080" },
  portrait: { w: 1080, h: 1350, label: "Portrait 1080×1350 (4:5)" },
  story: { w: 1080, h: 1920, label: "Story 1080×1920 (9:16)" },
};

const FONT_SERIF = '"Playfair Display", "Literata", Georgia, "Times New Roman", serif';
const FONT_SANS = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';

/** Seeder acak sederhana (deterministik per seed). */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Wrap teks per kata. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Gambar background procedural sesuai spesifikasi AI. */
export function renderBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  spec: BgSpec,
  seed = 7
): void {
  const rand = mulberry32(seed);
  const [c0, c1, c2] = spec.palet;
  const angle = spec.arahGradient === "0deg" ? 0 : Math.PI / 4;

  // Base linear gradient
  const grad = ctx.createLinearGradient(0, 0, Math.cos(angle) * w, Math.sin(angle) * h);
  grad.addColorStop(0, c0);
  grad.addColorStop(1, c1);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  switch (spec.style) {
    case "mesh": {
      // Radial blur multi-warna (efek premium)
      for (let i = 0; i < 3; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const r = (0.35 + rand() * 0.3) * Math.max(w, h);
        const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
        const col = [c0, c1, c2][i % 3];
        rg.addColorStop(0, hexToRgba(col, 0.5));
        rg.addColorStop(1, hexToRgba(col, 0));
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, w, h);
      }
      break;
    }
    case "wave": {
      // Gelombang organik dari bawah
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, h);
        const amp = h * (0.08 + rand() * 0.06);
        const base = h - h * (0.12 + i * 0.1);
        for (let x = 0; x <= w; x += 20) {
          ctx.lineTo(x, base + Math.sin((x / w) * Math.PI * (2 + i) + i * 1.7) * amp);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = hexToRgba(c2, 0.14 - i * 0.03);
        ctx.fill();
      }
      break;
    }
    case "geometric": {
      // Bentuk transparan besar
      for (let i = 0; i < 4; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const r = (0.15 + rand() * 0.25) * Math.max(w, h);
        ctx.beginPath();
        if (i % 2 === 0) {
          ctx.arc(x, y, r, 0, Math.PI * 2);
        } else {
          ctx.rect(x - r / 2, y - r / 2, r, r);
        }
        ctx.fillStyle = hexToRgba(c2, 0.08);
        ctx.fill();
        ctx.strokeStyle = hexToRgba(c2, 0.25);
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      break;
    }
    case "glow": {
      // Cahaya radial dari sudut kanan atas
      const x = w * 0.85;
      const y = h * 0.15;
      const r = Math.max(w, h) * 0.9;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, hexToRgba(c2, 0.45));
      rg.addColorStop(1, hexToRgba(c2, 0));
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
      // Glow kecil kiri bawah
      const rg2 = ctx.createRadialGradient(w * 0.1, h * 0.9, 0, w * 0.1, h * 0.9, r * 0.6);
      rg2.addColorStop(0, hexToRgba(c1, 0.35));
      rg2.addColorStop(1, hexToRgba(c1, 0));
      ctx.fillStyle = rg2;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "minimal":
    default: {
      // Polos + lingkaran kecil dekoratif + aksen
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(rand() * w, rand() * h, 4 + rand() * 10, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(c2, 0.2);
        ctx.fill();
      }
      break;
    }
  }
}

/** Muat gambar Picsum (gratis, tanpa key) — seed dari topik. */
export async function loadPicsum(seed: string, w: number, h: number): Promise<HTMLImageElement | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `https://picsum.photos/seed/${seed}/${w}/${h}`;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("gagal"));
    });
    return img;
  } catch {
    return null;
  }
}

export interface RenderSlideOpts {
  slide: SlideData;
  index: number;
  total: number;
  topic: string;
  spec: BgSpec;
  bgSource: "gambar" | "ai" | "gradient";
  branding: Branding;
  size: CarouselSize;
  /** seed acak untuk variasi background (default: stabil per carousel) */
  seed?: number;
}

/** Render satu slide lengkap → HTMLCanvasElement. */
export async function renderSlide(opts: RenderSlideOpts): Promise<HTMLCanvasElement> {
  const { w, h } = CAROUSEL_RATIOS[opts.size];
  // Pastikan font display ter-load (hindari fallback Georgia di render pertama)
  try {
    await document.fonts.load(`800 60px "Playfair Display"`);
    await document.fonts.load(`500 30px Inter`);
  } catch {
    // font mungkin belum siap — fallback tetap jalan
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const pad = Math.round(w * 0.09);

  // 1. Background
  if (opts.bgSource === "gambar") {
    const img = await loadPicsum((opts.topic || "lifeos").replace(/[^a-z0-9]/gi, "").toLowerCase() || "lifeos", w, h);
    if (img) {
      const scale = Math.max(w / img.width, h / img.height);
      const sw = w / scale;
      const sh = h / scale;
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      // Overlay gelap (dim) — lebih kuat agar teks selalu kontras
      const ov = ctx.createLinearGradient(0, 0, 0, h);
      ov.addColorStop(0, "rgba(8, 12, 14, 0.58)");
      ov.addColorStop(0.55, "rgba(8, 12, 14, 0.7)");
      ov.addColorStop(1, "rgba(8, 12, 14, 0.9)");
      ctx.fillStyle = ov;
      ctx.fillRect(0, 0, w, h);
      // Lapisan kedua — vignette tengah agar area teks selalu gelap
      const vg = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.1, w / 2, h * 0.5, Math.max(w, h) * 0.75);
      vg.addColorStop(0, "rgba(8, 12, 14, 0.18)");
      vg.addColorStop(1, "rgba(8, 12, 14, 0)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    } else {
      renderBackground(ctx, w, h, opts.spec, opts.seed ?? 7);
    }
  } else {
    renderBackground(ctx, w, h, opts.spec, opts.seed ?? 7);
  }

  // 2. Watermark nomor slide (editorial — transparan di pojok kanan atas)
  ctx.font = `800 ${Math.round(h * 0.14)}px ${FONT_SERIF}`;
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(String(opts.index + 1).padStart(2, "0"), w - pad + h * 0.015, h * 0.02);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // 3. Header branding
  let headerBottom = 0;
  if (opts.branding.showBranding) {
    const headY = Math.round(h * 0.055);
    const avatarR = Math.round(h * 0.026);
    const hasLogo = (opts.branding.brandName || "").trim().length > 0;
    if (hasLogo) {
      // Avatar inisial
      ctx.beginPath();
      ctx.arc(pad + avatarR, headY + avatarR, avatarR, 0, Math.PI * 2);
      const ag = ctx.createLinearGradient(0, headY, 0, headY + avatarR * 2);
      ag.addColorStop(0, opts.spec.palet[2] || "#5EEAD4");
      ag.addColorStop(1, opts.spec.palet[0] || "#0D9488");
      ctx.fillStyle = ag;
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${avatarR * 1.1}px ${FONT_SANS}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText((opts.branding.initials || "L").slice(0, 2).toUpperCase(), pad + avatarR, headY + avatarR + 1);
      // Nama brand
      ctx.textAlign = "left";
      ctx.font = `600 ${Math.round(h * 0.028)}px ${FONT_SANS}`;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillText(opts.branding.brandName, pad + avatarR * 2 + h * 0.02, headY + avatarR * 0.55);
    }
    // Badge topik kanan (selalu tampil)
    const badgeText = `${opts.index + 1}/${opts.total}  ${opts.topic.slice(0, 18)}`.toUpperCase();
    ctx.font = `600 ${Math.round(h * 0.02)}px ${FONT_SANS}`;
    const bw = ctx.measureText(badgeText).width + h * 0.04;
    const bx = w - pad - bw;
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.beginPath();
    ctx.roundRect(bx, headY, bw, h * 0.045, h * 0.022);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.textBaseline = "middle";
    ctx.fillText(badgeText, bx + h * 0.02, headY + h * 0.0225);
    ctx.textBaseline = "top";
    headerBottom = hasLogo ? headY + avatarR * 2 + h * 0.045 : headY + h * 0.07;
  }

  // Emoji slide — kanan atas, SEBELUM badge (sejajar header, tidak menimpa title/watermark)
  if (opts.slide.emoji) {
    const headY = Math.round(h * 0.055);
    const badgeText = `${opts.index + 1}/${opts.total}  ${opts.topic.slice(0, 18)}`.toUpperCase();
    ctx.font = `600 ${Math.round(h * 0.02)}px ${FONT_SANS}`;
    const bw = ctx.measureText(badgeText).width + h * 0.04;
    const bx = w - pad - bw;
    ctx.font = `${Math.round(h * 0.036)}px ${FONT_SANS}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(opts.slide.emoji, bx - h * 0.02, headY + h * 0.024);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  // Konten utama — jarak lega dari header, naik proporsional
  const contentTop = headerBottom + h * 0.05;
  const maxW = w - pad * 2;

  // Heading — Playfair 800, tracking rapat, ukuran proporsional, gradasi teks
  let headingSize = Math.round(h * 0.056);
  ctx.font = `800 ${headingSize}px ${FONT_SERIF}`;
  ctx.letterSpacing = `${Math.round(-headingSize * 0.01)}px`;
  let headingLines = wrapText(ctx, opts.slide.heading, maxW);
  while (headingLines.length > 3 && headingSize > h * 0.032) {
    headingSize -= 3;
    ctx.font = `800 ${headingSize}px ${FONT_SERIF}`;
    ctx.letterSpacing = `${Math.round(-headingSize * 0.01)}px`;
    headingLines = wrapText(ctx, opts.slide.heading, maxW);
  }
  const headingY = contentTop;
  // Gradasi putih → putih 88% (kesan depth)
  const hg = ctx.createLinearGradient(0, headingY, 0, headingY + headingSize * 3.2);
  hg.addColorStop(0, "#FFFFFF");
  hg.addColorStop(1, "rgba(255,255,255,0.86)");
  ctx.fillStyle = hg;
  let y = headingY;
  const lh = headingSize * 1.12;
  for (const line of headingLines) {
    ctx.fillText(line, pad, y);
    y += lh;
  }
  ctx.letterSpacing = "0px";

  // Underline — garis tipis elegan (bukan bar tebal): 2.5px, 38% lebar title, lurus
  const headingW = Math.max(...headingLines.map((l) => ctx.measureText(l).width));
  ctx.fillStyle = opts.spec.palet[2] || "#5EEAD4";
  const ackW = Math.max(headingSize * 0.8, Math.min(headingW * 0.38, maxW * 0.5));
  const ackH = Math.max(2, h * 0.0025);
  const ackY = y + h * 0.018;
  ctx.fillRect(pad, ackY, ackW, ackH);
  y = ackY + ackH + h * 0.055;

  // Points — font adaptif (mengecil otomatis agar konten panjang muat)
  if (opts.slide.points.length > 0) {
    const yMax = h * 0.86;
    const padP = h * 0.05;
    const pointW = maxW - padP;
    // Pilih ukuran font terbesar yang muat untuk semua paragraf
    const fontSizes = [h * 0.032, h * 0.028, h * 0.0245, h * 0.0215, h * 0.019];
    let pointSize = fontSizes[0];
    for (const fs of fontSizes) {
      ctx.font = `500 ${fs}px ${FONT_SANS}`;
      let totalLines = 0;
      for (const pt of opts.slide.points) totalLines += wrapText(ctx, pt, pointW).length;
      const totalH = totalLines * fs * 1.5 + (opts.slide.points.length - 1) * h * 0.012;
      if (y + totalH <= yMax) {
        pointSize = fs;
        break;
      }
      pointSize = fs; // terakhir yang dicoba = terkecil
    }
    ctx.font = `500 ${pointSize}px ${FONT_SANS}`;
    const pointLH = pointSize * 1.5;
    const bulletR = Math.max(5, h * 0.005);
    // Sejajarkan bullet dengan center baris pertama (textBaseline "middle")
    ctx.textBaseline = "middle";
    for (const pt of opts.slide.points) {
      if (y > yMax - pointLH) break;
      const pLines = wrapText(ctx, pt, pointW);
      const firstLineCenter = y + pointSize * 0.5;
      // Bullet — sejajar persis dengan center baris pertama
      ctx.fillStyle = opts.spec.palet[2] || "#5EEAD4";
      ctx.beginPath();
      ctx.arc(pad + bulletR, firstLineCenter, bulletR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.93)";
      let lineCenter = firstLineCenter;
      for (const pl of pLines) {
        if (y > yMax - pointLH) break;
        ctx.fillText(pl, pad + padP, lineCenter);
        lineCenter += pointLH;
        y += pointLH;
      }
      y += h * 0.012;
    }
    ctx.textBaseline = "top";
  }

  // 4. Footer branding
  if (opts.branding.showBranding) {
    const footY = h - h * 0.075;
    ctx.font = `600 ${Math.round(h * 0.026)}px ${FONT_SANS}`;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.textBaseline = "top";
    ctx.fillText(opts.branding.handle || "@lifeos", pad, footY);
    if (opts.branding.tagline) {
      ctx.font = `500 ${Math.round(h * 0.02)}px ${FONT_SANS}`;
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText(opts.branding.tagline, pad, footY + h * 0.034);
    }
    // CTA "Follow" HANYA di slide terakhir
    if (opts.index === opts.total - 1) {
      ctx.textAlign = "right";
      ctx.font = `600 ${Math.round(h * 0.024)}px ${FONT_SANS}`;
      ctx.fillStyle = opts.spec.palet[2] || "#5EEAD4";
      ctx.fillText("Follow 👉", w - pad, footY);
      ctx.textAlign = "left";
    }
    ctx.textBaseline = "alphabetic";
  }

  return canvas;
}

/** Download satu canvas sebagai PNG. */
export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  a.click();
}
