/** Konfigurasi breakdown tugas besar — client-safe (tanpa import server).
 *  Dipakai oleh UI (task-card) & logika AI (todo-breakdown). */

/** Ambang tugas "besar" — layak di-breakdown (menit) */
export const BIG_TASK_THRESHOLD_MIN = 120;

export function isBigTask(estimateMinutes: number | null): boolean {
  return (estimateMinutes ?? 0) >= BIG_TASK_THRESHOLD_MIN;
}
