/** Slide virtual: HOOK → isi → CTA (total = N + 2). Hook/CTA dibuat otomatis, tidak disimpan di DB. */
export interface CarouselVirtualSlide {
  heading: string;
  points: string[];
  emoji?: string;
  isHook?: boolean;
  isCta?: boolean;
}

export interface CarouselSlidesResult {
  slides: CarouselVirtualSlide[];
  isiCount: number;
  /** True jika index mengarah ke slide hook/CTA (bukan isi). */
  isAuto: (i: number) => boolean;
}

const CTA_POINTS = [
  "Simpan dulu — biar nggak lupa pas butuh",
  "Follow untuk konten edukasi lain tiap minggu",
  "Share ke teman yang lagi butuh info ini",
];

/** Susun slides lengkap untuk render: [HOOK, ...isi, CTA]. */
export function buildCarouselSlides(
  judul: string,
  topic: string,
  isi: { heading: string; points: string[]; emoji?: string }[]
): CarouselSlidesResult {
  const hook: CarouselVirtualSlide = {
    heading: judul || topic,
    points: [isi[0]?.points?.[0] ?? "Semua yang perlu kamu tahu ada di slide berikutnya."],
    // Emoji dinamis dari AI (slide isi pertama) — bukan hardcoded
    emoji: isi[0]?.emoji,
    isHook: true,
  };
  const cta: CarouselVirtualSlide = {
    heading: "Semoga bermanfaat!",
    points: CTA_POINTS,
    emoji: "💚",
    isCta: true,
  };
  const slides = [hook, ...isi.map((s) => ({ ...s })), cta];
  const isiCount = isi.length;
  return {
    slides,
    isiCount,
    isAuto: (i: number) => i === 0 || i === slides.length - 1,
  };
}