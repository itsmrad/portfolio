/**
 * The Web Audio engine behind lib/sound.ts, loaded on demand. Every voice is
 * synthesised from oscillators and filtered noise, trimmed to its measured
 * level (LEVEL), and mixed into one bus: a 0.5 s procedural room reverb send
 * and a soft clipper that is exactly linear for any single voice and only
 * bends overlapping peaks, so nothing clips and short clicks are never ducked.
 * `createVoices` takes any BaseAudioContext so tests can render each voice
 * offline; `unlock` and `play` drive the live, lazily created AudioContext.
 */
import type { SoundName, SoundOptions } from "@/lib/sound";

type Shape = {
  /** Start frequency (oscillator) or filter frequency (noise), Hz. */
  f: number;
  /** Exponential glide target over the sound. */
  to?: number;
  /** Seconds after attack until silent. */
  d: number;
  /** Peak gain. */
  g: number;
  /** Attack in seconds. */
  a?: number;
  /** Offset from the voice's start, seconds. */
  at?: number;
  /** Reverb send. */
  wet?: number;
};
type Tone = Shape & { type?: OscillatorType };
type Noise = Shape & { q?: number; type?: BiquadFilterType };

/** D major pentatonic over an octave and a half, for the name melody. */
export const NOTES = [587.33, 659.25, 739.99, 880, 987.77, 1174.66, 1318.51, 1479.98, 1760];

const rnd = (min: number, max: number) => min + Math.random() * (max - min);
/** A finite number within [min, max]; the fallback for anything else (NaN, Infinity, not a number). */
const clamp = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

/**
 * Output trim per voice, set from offline measurement (tests/voices.ts): short
 * clicks peak near -12 dBFS, heavier voices near -9, none below about -15.
 */
const LEVEL: Record<SoundName, number> = {
  tick: 9.4, tap: 4.0, toggle: 6.6, open: 6.0, close: 7.2, pop: 9.2, key: 17.6, copy: 12.0, release: 6.4, toggleOff: 7.3,
  detent: 20.0, success: 6.5, error: 3.9, thump: 2.2, note: 4.5, scratch: 7.3, bounce: 8.0, break: 4.2, gameOver: 8.1,
};

export function createVoices(ctx: BaseAudioContext) {
  // Linear up to 0.6 (-4.4 dBFS), then a tanh knee that never passes 0.97.
  const bus = ctx.createGain();
  const clipper = ctx.createWaveShaper();
  clipper.curve = Float32Array.from({ length: 1025 }, (_, i) => {
    const x = i / 512 - 1;
    const size = Math.abs(x);
    return Math.sign(x) * (size <= 0.6 ? size : 0.6 + 0.37 * Math.tanh((size - 0.6) / 0.37));
  });
  clipper.oversample = "2x";
  bus.connect(clipper).connect(ctx.destination);

  const { sampleRate } = ctx;
  const buffer = (channels: number, seconds: number, sample: (i: number, length: number) => number) => {
    const length = Math.floor(seconds * sampleRate);
    const result = ctx.createBuffer(channels, length, sampleRate);
    for (let c = 0; c < channels; c++) {
      const data = result.getChannelData(c);
      for (let i = 0; i < length; i++) data[i] = sample(i, length);
    }
    return result;
  };
  const white = () => Math.random() * 2 - 1;

  const reverb = ctx.createGain();
  reverb.gain.value = 0.5;
  const room = ctx.createConvolver();
  room.buffer = buffer(2, 0.5, (i, length) => white() * (1 - i / length) ** 3.2);
  reverb.connect(room).connect(bus);

  const noiseBuffer = buffer(1, 1, white);
  let lowpassed = 0;
  // Pen on paper: white noise over a heavy one-pole lowpass, so it has grain and body.
  let paper: AudioBuffer | undefined;

  const voice = (name: SoundName, pan: number, options: SoundOptions, t: number) => {
    // Slight pitch variation so repeats do not fatigue; the melody stays in tune.
    const r = name === "note" ? 1 : rnd(0.97, 1.03);
    const level = LEVEL[name] ?? 1;
    const out = ctx.createStereoPanner();
    out.pan.value = clamp(pan, -1, 1, 0);
    out.connect(bus);
    const trim = ctx.createGain();
    trim.gain.value = level;
    trim.connect(out);
    // Each shape sends only itself to the room, at its own amount.
    const route = (node: AudioNode, wet = 0) => {
      node.connect(trim);
      if (wet) {
        const send = ctx.createGain();
        send.gain.value = wet * level;
        node.connect(send).connect(reverb);
      }
    };
    const envelope = ({ a = 0.004, d, g, at = 0 }: Shape) => {
      const gain = ctx.createGain();
      const start = t + at;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, g), start + a);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + a + d);
      return [gain, start, start + a + d + 0.05] as const;
    };
    const tone = (shape: Tone) => {
      const [gain, start, stop] = envelope({ a: 0.004, ...shape });
      const osc = ctx.createOscillator();
      osc.type = shape.type ?? "sine";
      osc.frequency.setValueAtTime(shape.f * r, start);
      if (shape.to) osc.frequency.exponentialRampToValueAtTime(shape.to * r, stop - 0.05);
      osc.connect(gain);
      route(gain, shape.wet);
      osc.start(start);
      osc.stop(stop);
    };
    const noise = (shape: Noise) => {
      const [gain, start, stop] = envelope({ a: 0.002, ...shape });
      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.playbackRate.value = rnd(0.85, 1.15);
      const filter = ctx.createBiquadFilter();
      filter.type = shape.type ?? "bandpass";
      filter.Q.value = shape.q ?? 1;
      filter.frequency.setValueAtTime(shape.f * r, start);
      if (shape.to) filter.frequency.exponentialRampToValueAtTime(shape.to * r, stop - 0.05);
      source.connect(filter).connect(gain);
      route(gain, shape.wet);
      source.start(start, rnd(0, 0.7));
      source.stop(stop);
    };

    switch (name) {
      case "tick":
        noise({ f: rnd(3800, 4600), q: 1.4, d: 0.012, g: 0.07 });
        tone({ f: rnd(2300, 2600), d: 0.012, g: 0.018 });
        break;
      case "tap":
        tone({ f: rnd(680, 740), to: 470, d: 0.06, g: 0.11 });
        noise({ f: 1800, d: 0.012, g: 0.04 });
        break;
      case "release":
        tone({ f: 470, to: rnd(620, 660), d: 0.04, g: 0.055 });
        noise({ f: 2600, d: 0.008, g: 0.025 });
        break;
      case "toggle":
        tone({ f: 660, to: 990, d: 0.06, g: 0.06 });
        noise({ f: 4200, q: 1.4, d: 0.01, g: 0.05 });
        break;
      case "toggleOff":
        // The same switch falling back: toggle's glide reversed, its click a step lower.
        tone({ f: 990, to: 660, d: 0.06, g: 0.055 });
        noise({ f: 3600, q: 1.4, d: 0.01, g: 0.045 });
        break;
      case "open":
        tone({ f: 520, to: 880, d: 0.09, g: 0.06, wet: 0.2 });
        noise({ f: 3000, to: 6500, q: 0.6, a: 0.01, d: 0.08, g: 0.014 });
        break;
      case "close":
        tone({ f: 780, to: 430, d: 0.09, g: 0.05, wet: 0.2 });
        noise({ f: 5000, to: 2200, q: 0.6, a: 0.01, d: 0.08, g: 0.012 });
        break;
      case "pop":
        tone({ f: 900, to: 1350, d: 0.045, g: 0.04 });
        break;
      case "key":
        noise({ f: rnd(2800, 3700), q: 1.6, d: 0.008, g: 0.045 });
        tone({ f: rnd(1500, 1800), d: 0.006, g: 0.01 });
        break;
      case "detent":
        noise({ f: rnd(5000, 6000), q: 2.2, d: 0.007, g: 0.04 });
        break;
      case "copy":
        tone({ f: 2349.32, d: 0.035, g: 0.03, wet: 0.2 });
        tone({ f: 3135.96, d: 0.05, g: 0.022, wet: 0.2, at: 0.045 });
        break;
      case "success":
        tone({ f: 523.25, d: 0.1, g: 0.07, a: 0.002, wet: 0.15 });
        tone({ f: 783.99, d: 0.15, g: 0.07, a: 0.002, wet: 0.15, at: 0.08 });
        break;
      case "error":
        tone({ f: 280, to: 180, d: 0.15, g: 0.12, a: 0.002 });
        noise({ f: 600, type: "lowpass", d: 0.1, g: 0.07 });
        break;
      case "thump":
        tone({ f: 430, to: 150, d: 0.19, g: 0.2 });
        tone({ f: 860, to: 320, d: 0.07, g: 0.04, type: "triangle" });
        noise({ f: 700, type: "lowpass", d: 0.05, g: 0.12 });
        break;
      case "note": {
        const f = NOTES[Math.round(clamp(options.index, 0, NOTES.length - 1, 0))]!;
        tone({ f, d: 0.33, g: 0.07, a: 0.02, wet: 0.3 });
        // A soft octave on a triangle gives the sine a breathy, flute-like edge.
        tone({ f: f * 2, d: 0.33, g: 0.014, a: 0.02, wet: 0.3, type: "triangle" });
        break;
      }
      case "bounce":
        noise({ f: rnd(2300, 2900), q: 2.5, d: 0.025, g: 0.12 });
        tone({ f: rnd(850, 1000), d: 0.03, g: 0.016 });
        break;
      case "break":
        tone({ f: rnd(430, 520), to: 360, d: 0.05, g: 0.1 });
        noise({ f: rnd(1200, 1600), q: 3, d: 0.03, g: 0.1 });
        noise({ f: 6000, to: 2500, q: 0.7, d: 0.06, g: 0.03, at: 0.012 });
        break;
      case "gameOver":
        [880, 739.99, 587.33].forEach((f, i) =>
          tone({ f, to: i === 2 ? 440 : undefined, d: i === 2 ? 0.42 : 0.1, g: 0.05, wet: 0.3, at: i * 0.13, type: "triangle" }),
        );
        break;
      case "scratch": {
        paper ??= buffer(1, 2, () => {
          const w = white();
          lowpassed = 0.97 * lowpassed + 0.03 * w;
          return 0.6 * w + 2.2 * lowpassed;
        });
        const length = clamp(options.duration, 0.05, 3, 0.6);
        const chain = (highpass: number, type: BiquadFilterType, f: number, q: number) => {
          const source = ctx.createBufferSource();
          source.buffer = paper!;
          source.loop = true;
          source.playbackRate.value = rnd(0.8, 1.2);
          const hp = ctx.createBiquadFilter();
          hp.type = "highpass";
          hp.frequency.value = highpass;
          const filter = ctx.createBiquadFilter();
          filter.type = type;
          filter.frequency.value = f;
          filter.Q.value = q;
          const gain = ctx.createGain();
          gain.gain.value = 0;
          source.connect(hp).connect(filter).connect(gain);
          route(gain);
          source.start(t, rnd(0, 1));
          source.stop(t + length + 0.4);
          return [gain.gain, filter.frequency] as const;
        };
        const [scratch, band] = chain(900, "bandpass", 2800, 0.9);
        const [rumble] = chain(120, "lowpass", 650, 0.5);
        // A stroke: the pen's speed wanders, with the odd lift between marks.
        let speed = 0.6;
        for (let s = 0; s < length - 0.03; s += 0.045) {
          speed = Math.min(1, Math.max(0.15, speed + rnd(-0.35, 0.35)));
          const lift = s > 0.1 && s < length - 0.15 && Math.random() < 0.1;
          scratch.setTargetAtTime(lift ? 0 : 0.05 * speed * rnd(0.55, 1), t + s, 0.025);
          band.setTargetAtTime(rnd(2200, 3800), t + s, 0.02);
          rumble.setTargetAtTime(lift ? 0 : 0.035 * (0.5 + 0.5 * speed), t + s, 0.06);
        }
        scratch.setTargetAtTime(0, t + length, 0.025);
        rumble.setTargetAtTime(0, t + length, 0.06);
        break;
      }
    }
  };
  /** Cuts this bus off: anything still scheduled on it plays into nothing. */
  const dispose = () => bus.disconnect();
  return Object.assign(voice, { dispose });
}

type Voice = ReturnType<typeof createVoices>;
let ctx: AudioContext | undefined;
let voice: Voice | undefined;
let idle: ReturnType<typeof setTimeout> | undefined;
let awakeUntil = 0;
/** Sounds asked for while the context was not running: only the latest moment's, briefly. */
let waiting: { at: number; sounds: (() => void)[] } | undefined;

/** How long a sound may wait for the engine chunk or for `resume()` before it is dropped, ms. */
const STALE = 100;

function context() {
  if (!ctx || ctx.state === "closed") {
    const created = new AudioContext({ latencyHint: "interactive" });
    ctx = created;
    voice = createVoices(created);
    // Mix with other audio and obey the iPhone's silent switch.
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = "ambient";
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden || ctx !== created) return;
      // Hidden: drop what is still scheduled (it would play on the next resume), then sleep.
      voice?.dispose();
      voice = createVoices(created);
      waiting = undefined;
      created.suspend().catch(() => {});
    });
  }
  return ctx;
}

/** Suspend 2.5 s after the last sound ends, so an idle tab never keeps the audio device awake. */
function keepAwake(seconds: number) {
  const now = performance.now();
  const until = now + 2500 + 1000 * seconds;
  if (until <= awakeUntil) return;
  awakeUntil = until;
  clearTimeout(idle);
  const sleeping = ctx;
  idle = setTimeout(() => sleeping?.suspend().catch(() => {}), until - now);
}

function flush() {
  const due = waiting;
  waiting = undefined;
  if (due && performance.now() - due.at < STALE) due.sounds.forEach((sound) => sound());
}

/**
 * Call from inside a user gesture (pointerdown, pointerup, keydown, touchend):
 * creates or resumes the context there, which Safari requires for it to start.
 */
export function unlock() {
  try {
    const live = context();
    if (live.state !== "running") {
      live.resume().then(flush, () => {});
      keepAwake(0);
    }
  } catch {
    // Audio unavailable: stay silent.
  }
}

/**
 * Plays a voice now (or after `options.delay`). Never throws or rejects, whatever
 * the options. `requested` is when the facade was asked: a sound that waited more
 * than STALE ms (for the engine chunk, or for a context that would not start) is
 * dropped, so a later gesture can never release a burst of queued sounds.
 */
export function play(name: SoundName, pan: number, options: SoundOptions, requested = performance.now()) {
  try {
    const now = performance.now();
    if (now - requested > STALE) return;
    const live = context();
    const delay = clamp(options.delay, 0, 10, 0);
    const fire = () => {
      try {
        voice!(name, pan, options, live.currentTime + 0.005 + delay);
      } catch {
        // A voice that cannot be built stays silent.
      }
    };
    if (live.state === "running") fire();
    else {
      // Keep one moment's sounds (a melody asks for all its notes at once); a newer moment replaces it.
      if (!waiting || now - waiting.at > 30) waiting = { at: now, sounds: [] };
      if (waiting.sounds.length < 16) waiting.sounds.push(fire);
      live.resume().then(flush, () => {});
    }
    keepAwake(delay + clamp(options.duration, 0, 3, 0.5));
  } catch {
    // Audio unavailable or blocked: stay silent.
  }
}
