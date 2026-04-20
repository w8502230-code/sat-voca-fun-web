/** Lightweight UI blips for PRD 4.7 — fails silently if audio blocked. */
export function playQuizFeedbackSound(kind: "correct" | "wrong") {
  if (typeof window === "undefined") return;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = kind === "correct" ? "triangle" : "square";
    const startFreq = kind === "correct" ? 760 : 220;
    const endFreq = kind === "correct" ? 980 : 120;
    const maxGain = kind === "correct" ? 0.065 : 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(maxGain, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.2);
    osc.start(t);
    osc.stop(t + 0.24);
    osc.onended = () => ctx.close();
  } catch {
    /* ignore */
  }
}
