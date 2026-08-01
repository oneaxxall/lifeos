/** Utility suara Pomodoro — Web Audio API (tanpa file eksternal). */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function beep(freq: number, dur: number, type: OscillatorType, delay = 0, gain = 0.25) {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = c.currentTime + delay;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** Mulai timer — nada naik ceria (2 beep). */
export function playStart() {
  beep(523.25, 0.12, "sine"); // C5
  beep(783.99, 0.16, "sine", 0.14); // G5
}

/** Jeda/pause — nada tunggal menurun. */
export function playPause() {
  beep(392, 0.18, "sine", 0, 0.18); // G4
}

/** Selesai (end) — alarm 3 beep. */
export function playEnd() {
  beep(880, 0.16, "triangle");
  beep(880, 0.16, "triangle", 0.22);
  beep(1174.66, 0.28, "triangle", 0.44); // D6
}

/** Istirahat dimulai — nada lembut 2 beep. */
export function playBreakStart() {
  beep(659.25, 0.14, "sine"); // E5
  beep(659.25, 0.14, "sine", 0.16);
}
