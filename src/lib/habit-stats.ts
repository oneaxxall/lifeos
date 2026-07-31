/**
 * Statistik kebiasaan — CLIENT-SAFE (tanpa import server/db).
 * Dipakai komponen client & server wrapper.
 */

export interface HabitLogSummary {
  date: string; // YYYY-MM-DD
  status: "bersih" | "kambuh";
  jumlahKambuh: number;
}

export interface HabitStats {
  streak: number; // hari bersih berturut-turut (sampai hari ini / kemarin)
  longestStreak: number;
  totalBersih: number;
  totalKambuh: number;
  /** 7 hari terakhir: array status untuk kalender mini */
  last7: ("" | "bersih" | "kambuh")[];
  /** Hari kambuh bulan ini (untuk tren) */
  kambuhMingguIni: number;
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Hitung streak & ringkasan dari log (urutkan menaik berdasarkan tanggal). */
export function computeHabitStats(logs: HabitLogSummary[]): HabitStats {
  const byDate = new Map<string, HabitLogSummary>();
  for (const l of logs) byDate.set(l.date, l);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = dateStr(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Streak: hitung mundur dari hari ini (jika hari ini bersih),
  // atau dari kemarin (jika hari ini kambuh / belum check-in).
  let streak = 0;
  const todayLog = byDate.get(todayStr);
  const start = todayLog?.status === "bersih" ? today : yesterday;
  const cursor = new Date(start);
  for (let i = 0; i < 365; i++) {
    const d = dateStr(cursor);
    const log = byDate.get(d);
    if (log && log.status === "bersih") streak++;
    else break;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Longest streak
  let longest = 0;
  let run = 0;
  const sorted = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  for (const l of sorted) {
    if (l.status === "bersih") {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  const totalBersih = sorted.filter((l) => l.status === "bersih").length;
  const totalKambuh = sorted.filter((l) => l.status === "kambuh").length;

  // 7 hari terakhir (hari ini ke belakang)
  const last7: ("" | "bersih" | "kambuh")[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = dateStr(d);
    last7.push(byDate.get(ds)?.status ?? "");
  }

  // Kambuh minggu ini (Senin–hari ini)
  const day = today.getDay(); // 0=Minggu
  const mondayOffset = day === 0 ? 6 : day - 1;
  const monday = new Date(today);
  monday.setDate(monday.getDate() - mondayOffset);
  let kambuhMingguIni = 0;
  for (const l of sorted) {
    if (l.status === "kambuh" && l.date >= dateStr(monday) && l.date <= todayStr) {
      kambuhMingguIni += l.jumlahKambuh;
    }
  }

  return { streak, longestStreak: longest, totalBersih, totalKambuh, last7, kambuhMingguIni };
}
