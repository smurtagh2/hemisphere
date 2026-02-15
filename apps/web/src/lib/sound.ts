/**
 * Hemisphere Sound Design System
 *
 * Synthesises all audio from scratch using the Web Audio API.
 * No audio files are loaded — all sounds are procedurally generated.
 * Sound is gated by a user preference stored in localStorage.
 *
 * AudioContext is created lazily on first playback to respect browser
 * autoplay restrictions (context must be created inside a user gesture).
 */

export type SoundEvent =
  | 'encounter-enter'   // Stage transition INTO encounter (warm, expansive chord)
  | 'analysis-enter'    // Stage transition INTO analysis (crisp, focused click-tone)
  | 'return-enter'      // Stage transition INTO return (deep, reflective tone)
  | 'correct'           // Correct answer feedback (positive chime)
  | 'incorrect'         // Wrong answer (soft low tone — not jarring)
  | 'session-complete'  // Session finished (satisfying resolution chord)
  | 'item-select'       // Selecting an item (subtle tick)
  | 'card-flip';        // Item card reveal (soft swoosh)

const STORAGE_KEY = 'hemisphere-sound-enabled';

// ---------------------------------------------------------------------------
// Preference helpers
// ---------------------------------------------------------------------------

/** Returns true if sound is currently enabled (defaults to true). */
export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  // Default to enabled when no preference has been stored yet.
  return stored === null ? true : stored === 'true';
}

/** Persists the sound enabled preference. */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, String(enabled));
}

// ---------------------------------------------------------------------------
// AudioContext — lazy singleton
// ---------------------------------------------------------------------------

let _ctx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!window.AudioContext) return null;
  if (!_ctx) {
    _ctx = new AudioContext();
  }
  // Resume a suspended context (e.g. after browser autoplay policy kicks in).
  if (_ctx.state === 'suspended') {
    _ctx.resume().catch(() => {
      // Silently ignore — playback will simply not occur.
    });
  }
  return _ctx;
}

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

/**
 * Creates an oscillator + gain envelope and connects it to the destination.
 * @param ctx       AudioContext
 * @param type      OscillatorType
 * @param frequency Hz
 * @param startTime AudioContext time to begin
 * @param duration  Seconds until gain reaches zero
 * @param peakGain  Peak gain value (0–1)
 * @param attackTime Seconds for the attack ramp (default 0.005)
 */
function playTone(
  ctx: AudioContext,
  type: OscillatorType,
  frequency: number,
  startTime: number,
  duration: number,
  peakGain: number = 0.4,
  attackTime: number = 0.005,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + attackTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

/**
 * Plays a short burst of white noise via a ScriptProcessorNode shim, or
 * via a BufferSourceNode filled with random samples (preferred).
 */
function playWhiteNoise(
  ctx: AudioContext,
  startTime: number,
  duration: number,
  peakGain: number = 0.15,
): void {
  const bufferSize = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peakGain, startTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  source.connect(gain);
  gain.connect(ctx.destination);

  source.start(startTime);
}

// ---------------------------------------------------------------------------
// Sound synthesisers — one function per SoundEvent
// ---------------------------------------------------------------------------

function playEncounterEnter(ctx: AudioContext): void {
  // Two overlapping sine waves (220 Hz + 330 Hz), 0.8 s fade — warm, expansive.
  const t = ctx.currentTime;
  playTone(ctx, 'sine', 220, t, 0.8, 0.35, 0.02);
  playTone(ctx, 'sine', 330, t + 0.05, 0.8, 0.25, 0.02);
}

function playAnalysisEnter(ctx: AudioContext): void {
  // Short square wave pulse at 440 Hz, 0.15 s — crisp, focused.
  const t = ctx.currentTime;
  playTone(ctx, 'square', 440, t, 0.15, 0.2, 0.003);
}

function playReturnEnter(ctx: AudioContext): void {
  // Low sine (110 Hz) + mid sine (220 Hz), 1.2 s fade — contemplative.
  const t = ctx.currentTime;
  playTone(ctx, 'sine', 110, t, 1.2, 0.3, 0.04);
  playTone(ctx, 'sine', 220, t + 0.1, 1.2, 0.2, 0.04);
}

function playCorrect(ctx: AudioContext): void {
  // Ascending two-note chime: C5 (523 Hz) -> E5 (659 Hz), triangle, 0.4 s.
  const t = ctx.currentTime;
  playTone(ctx, 'triangle', 523, t, 0.3, 0.4, 0.005);
  playTone(ctx, 'triangle', 659, t + 0.15, 0.35, 0.4, 0.005);
}

function playIncorrect(ctx: AudioContext): void {
  // Low sine (220 Hz), 0.3 s — gentle, not jarring.
  const t = ctx.currentTime;
  playTone(ctx, 'sine', 220, t, 0.3, 0.25, 0.01);
}

function playSessionComplete(ctx: AudioContext): void {
  // Three-note chord: C5 + E5 + G5 (523 + 659 + 784 Hz), sine, 1.5 s.
  const t = ctx.currentTime;
  playTone(ctx, 'sine', 523, t, 1.5, 0.3, 0.02);
  playTone(ctx, 'sine', 659, t + 0.05, 1.5, 0.25, 0.02);
  playTone(ctx, 'sine', 784, t + 0.1, 1.5, 0.2, 0.02);
}

function playItemSelect(ctx: AudioContext): void {
  // Very short sine tick: 880 Hz, 0.05 s.
  const t = ctx.currentTime;
  playTone(ctx, 'sine', 880, t, 0.05, 0.2, 0.003);
}

function playCardFlip(ctx: AudioContext): void {
  // White noise burst with 0.1 s fade — soft swoosh.
  const t = ctx.currentTime;
  playWhiteNoise(ctx, t, 0.1, 0.12);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Plays the requested sound event.
 * No-ops gracefully when:
 *  - Sound is disabled by the user preference
 *  - The Web Audio API is unavailable
 *  - The AudioContext cannot be created or resumed
 */
export function playSound(event: SoundEvent): void {
  if (!isSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    switch (event) {
      case 'encounter-enter':
        playEncounterEnter(ctx);
        break;
      case 'analysis-enter':
        playAnalysisEnter(ctx);
        break;
      case 'return-enter':
        playReturnEnter(ctx);
        break;
      case 'correct':
        playCorrect(ctx);
        break;
      case 'incorrect':
        playIncorrect(ctx);
        break;
      case 'session-complete':
        playSessionComplete(ctx);
        break;
      case 'item-select':
        playItemSelect(ctx);
        break;
      case 'card-flip':
        playCardFlip(ctx);
        break;
      default:
        // Exhaustiveness guard — should never reach here at runtime.
        break;
    }
  } catch {
    // Swallow any unexpected Web Audio errors so they never surface as
    // user-visible failures.
  }
}
