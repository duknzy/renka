/**
 * Web Audio API によるシンセサイザー効果音モジュール
 * 外部音声ファイルに一切依存せず、低レイテンシーで高品位なサウンドを生成します。
 */

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

// Load mute preference from localStorage
try {
  const saved = localStorage.getItem("srs_sound_enabled");
  if (saved !== null) {
    soundEnabled = saved === "true";
  }
} catch {
  // Ignore localStorage issues
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  try {
    localStorage.setItem("srs_sound_enabled", String(enabled));
  } catch {
    // Ignore
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * 軽い触覚フィードバック（スマホ振動対応端末向け）
 */
export function triggerHaptic(type: "light" | "medium" | "heavy" | "error" = "light") {
  if (typeof window === "undefined" || !navigator.vibrate) return;
  try {
    if (type === "light") navigator.vibrate(10);
    else if (type === "medium") navigator.vibrate(25);
    else if (type === "heavy") navigator.vibrate(40);
    else if (type === "error") navigator.vibrate([30, 40, 30]);
  } catch {
    // Ignore vibration failure
  }
}

/**
 * カードめくり音: Sine波 440Hz → 880Hz (0.08秒)
 */
export function playFlipSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.08);
  triggerHaptic("light");
}

/**
 * 正解チャイム: Sine波 D5 (587Hz) → A5 (880Hz)
 */
export function playCorrectChime() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 1st note: D5 (587.33 Hz)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(587.33, now);
  gain1.gain.setValueAtTime(0.22, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.22);

  // 2nd note: A5 (880 Hz) slightly delayed
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(880, now + 0.12);
  gain2.gain.setValueAtTime(0.25, now + 0.12);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.12);
  osc2.stop(now + 0.45);

  triggerHaptic("medium");
}

/**
 * 間違いブザー: Sawtooth波 160Hz
 */
export function playBuzzerSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(160, now);
  osc.frequency.linearRampToValueAtTime(140, now + 0.2);

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.22);
  triggerHaptic("error");
}

/**
 * 特訓完了ファンファーレ: C5 → E5 → G5 → C6 (和音/アルペジオ)
 */
export function playFanfare() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 523.25, time: 0.00, dur: 0.2 }, // C5
    { freq: 659.25, time: 0.14, dur: 0.2 }, // E5
    { freq: 783.99, time: 0.28, dur: 0.2 }, // G5
    { freq: 1046.50, time: 0.42, dur: 0.7 } // C6
  ];

  notes.forEach(({ freq, time, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + time);

    gain.gain.setValueAtTime(0.24, now + time);
    gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + dur);
  });

  triggerHaptic("heavy");
}
