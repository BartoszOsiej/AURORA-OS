/**
 * SoundSystem — procedural WebAudio sound effects.
 *
 * AURORA OS ships no audio assets: every sound is synthesized at runtime
 * with oscillators and gain envelopes. The AudioContext is created lazily
 * on the first user gesture (browser autoplay policy) and the master gain
 * follows the Settings app (🔊 Sound toggle).
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

/** Lazily create (or resume) the AudioContext. Returns null if disabled. */
function ensure(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Play a single tone with an attack/release envelope. */
function tone(
  freq: number,
  dur: number,
  type: OscillatorType = 'sine',
  vol = 1,
  when = 0,
  slideTo?: number,
): void {
  const c = ensure();
  if (!c || !master) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sound = {
  /** Enable/disable all sound (used by the Settings app). */
  setEnabled(v: boolean): void {
    enabled = v;
    if (!v && ctx) {
      void ctx.close();
      ctx = null;
      master = null;
    }
  },

  isEnabled(): boolean {
    return enabled;
  },

  /** Prime the AudioContext from a user gesture. */
  unlock(): void {
    ensure();
  },

  /** Rising major chord played at login. */
  boot(): void {
    tone(392, 0.18, 'sine', 0.5);
    tone(523.25, 0.18, 'sine', 0.5, 0.12);
    tone(659.25, 0.32, 'sine', 0.5, 0.24);
  },

  /** Short UI tick. */
  click(): void {
    tone(880, 0.05, 'triangle', 0.22);
  },

  /** Window opened — two rising notes. */
  open(): void {
    tone(440, 0.08, 'sine', 0.28);
    tone(660, 0.12, 'sine', 0.22, 0.05);
  },

  /** Window closed — falling note. */
  close(): void {
    tone(520, 0.1, 'sine', 0.24, 0, 300);
  },

  /** Error buzz. */
  error(): void {
    tone(180, 0.18, 'sawtooth', 0.28);
    tone(150, 0.22, 'sawtooth', 0.28, 0.1);
  },

  /** Two-note notification. */
  notify(): void {
    tone(1046.5, 0.09, 'sine', 0.28);
    tone(1318.5, 0.14, 'sine', 0.28, 0.08);
  },
};
