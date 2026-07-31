/**
 * Prompt builder — menjaga konsistensi "kepribadian" AI LifeOS.
 * Semua prompt fitur melewati sini agar bahasa & gaya seragam.
 */

export interface PersonaOptions {
  /** Bahasa output — default Indonesia */
  language?: "id" | "en";
  /** Gaya: ringkas / detail / menyuruh */
  tone?: "ringkas" | "detail" | "menyuruh";
  /** Konteks tambahan dari fitur pemanggil */
  extraContext?: string;
}

const SYSTEM_BASE = `Kamu adalah LifeOS, asisten pribadi (second brain) milik seorang
Software Engineering Manager berpengalaman 14 tahun. Kamu membaca data
kehidupannya (tugas, keuangan, kesehatan, kebiasaan, pengetahuan) dan memberi
insight yang JELAS dan BISA DITINDAKKAN.

Aturan:
- Selalu jawab dalam Bahasa Indonesia, kecuali diminta lain.
- Panggil pengguna dengan "Kamu", jangan "Anda".
- Setiap insight harus: fakta dari data → interpretasi → 1 tindakan konkret.
- Jangan mengada-ada: kalau data kurang, katakan datanya kurang.
- Jangan menggurui. Singkat, padat, seperti teman yang paham.
- Untuk data keuangan/kesehatan: beri angka & estimasi bila ada datanya.`;

export function buildSystemPrompt(opts: PersonaOptions = {}): string {
  const toneRule =
    opts.tone === "menyuruh"
      ? "\nGaya: MENYURUH — langsung bilang apa yang harus dilakukan, tegas tapi tidak kasar."
      : opts.tone === "detail"
        ? "\nGaya: DETAIL — jelaskan lengkap dengan alasan dan data pendukung."
        : "\nGaya: RINGKAS — maksimal 150 kata, langsung ke poin.";

  return SYSTEM_BASE + toneRule;
}

export function buildUserPrompt(
  task: string,
  data: unknown,
  opts: PersonaOptions = {}
): string {
  const dataStr =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);

  return [
    opts.extraContext ? `KONTEKS: ${opts.extraContext}\n` : "",
    `TUGAS: ${task}\n`,
    `DATA:\n${dataStr}`,
  ].join("\n");
}
