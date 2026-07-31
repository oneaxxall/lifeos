/**
 * Client-safe: statistik spiritual (streak, komplesi) — tanpa import server/db.
 * Komponen client tidak boleh mengimpor server-only modules.
 */

export interface SpiritualStats {
  streak: number;
  longestStreak: number;
  totalDays: number;
  /** Hari dengan minimal 1 ritual dicentang (hari "aktif") */
  activeDays: number;
  lastActiveDate: string | null;
  weekCompletion: number;
}

export interface SpiritualEntryLike {
  date: string;
  rituals: string;
}

/** Hitung streak & statistik dari riwayat entri (dalam format item UI) */
export function computeSpiritualStats(entries: SpiritualEntryLike[]): SpiritualStats {
  // Hari aktif: entri dengan minimal 1 ritual true
  const active = entries.filter((e) => {
    try {
      const rituals = JSON.parse(e.rituals) as Record<string, boolean>;
      return Object.values(rituals).some(Boolean);
    } catch {
      return false;
    }
  });

  const activeDates = new Set(active.map((e) => e.date));

  // Streak saat ini: hitung mundur dari hari ini (atau kemarin jika hari ini belum dicatat)
  let streak = 0;
  const cursor = new Date();
  if (!activeDates.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1); // mulai dari kemarin — masih "on streak"
  }
  while (activeDates.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Streak terpanjang
  const sortedDates = [...activeDates].sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of sortedDates) {
    const cur = new Date(d + "T00:00:00");
    if (prev && (cur.getTime() - prev.getTime()) / 86400000 === 1) {
      run++;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = cur;
  }

  // Komplesi minggu ini (7 hari terakhir)
  const weekStart = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const weekActive = [...activeDates].filter((d) => d >= weekStart).length;
  const weekCompletion = Math.min(100, Math.round((weekActive / 7) * 100));

  return {
    streak,
    longestStreak: longest,
    totalDays: entries.length,
    activeDays: activeDates.size,
    lastActiveDate: active.length ? active[active.length - 1].date : null,
    weekCompletion,
  };
}
