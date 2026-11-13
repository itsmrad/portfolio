/**
 * The Web Audio engine behind lib/sound.ts, loaded on demand. Every voice is
 * synthesised from oscillators and filtered noise through one bus: a 0.5 s
 * procedural room reverb send, a gentle compressor and a 0.9 limiter gain.
 * `createVoices` takes any BaseAudioContext so tests can render each voice
 * offline; `play` drives the live, lazily created AudioContext.
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

export function createVoices(ctx: BaseAudioContext) {
  const limiter = ctx.createGain();
  limiter.gain.value = 0.9;
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.knee.value = 12;
  compressor.ratio.value = 5;
  compressor.attack.value = 0.002;
  compressor.release.value = 0.18;
  limiter.connect(compressor).connect(ctx.destination);

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
  reverb.connect(room).connect(limiter);

  const noiseBuffer = buffer(1, 1, white);
  let lowpassed = 0;
  // Pen on paper: white noise over a heavy one-pole lowpass, so it has grain and body.
  let paper: AudioBuffer | undefined;

  return function voice(name: SoundName, pan: number, options: SoundOptions, t: number) {
    // Slight pitch variation so repeats do not fatigue; the melody stays in tune.
    const r = name === "note" ? 1 : rnd(0.97, 1.03);
    const out = ctx.createStereoPanner();
    out.pan.value = pan;
    out.connect(limiter);
    const sends: Record<number, GainNode> = {};
    const route = (node: AudioNode, wet = 0) => {
      node.connect(out);
      if (wet) {
        if (!sends[wet]) {
          sends[wet] = ctx.createGain();
          sends[wet].gain.value = wet;
          out.connect(sends[wet]).connect(reverb);
        }
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
        const f = NOTES[Math.min(NOTES.length - 1, Math.max(0, options.index ?? 0))]!;
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
        const length = Math.min(3, options.duration ?? 0.6);
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
}

type Voice = ReturnType<typeof createVoices>;
let ctx: AudioContext | undefined;
let voice: Voice | undefined;
let idle: ReturnType<typeof setTimeout> | undefined;
let awakeUntil = 0;
const lastPlayed: Partial<Record<SoundName, number>> = {};

/** Plays a voice now (or after `options.delay`). Never throws, even when audio is blocked. */
export function play(name: SoundName, pan: number, options: SoundOptions) {
  try {
    const now = performance.now();
    const delay = options.delay ?? 0;
    // Machine-gun guard: the same voice at most every 25 ms (key repeat: 50 ms).
    if (!delay) {
      if (now - (lastPlayed[name] ?? -Infinity) < (name === "key" ? 50 : 25)) return;
      lastPlayed[name] = now;
    }
    if (!ctx) {
      const context = new AudioContext({ latencyHint: "interactive" });
      ctx = context;
      voice = createVoices(context);
      // Mix with other audio and obey the iPhone's silent switch.
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
      if (session) session.type = "ambient";
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) context.suspend().catch(() => {});
      });
    }
    const context = ctx;
    const fire = () => voice!(name, pan, options, context.currentTime + 0.005 + delay);
    if (context.state === "running") fire();
    else context.resume().then(fire, () => {});

    // Suspend 2.5 s after the last sound ends, so an idle tab never keeps the audio device awake.
    const until = now + 2500 + 1000 * (delay + (options.duration ?? 0.5));
    if (until > awakeUntil) {
      awakeUntil = until;
      clearTimeout(idle);
      idle = setTimeout(() => context.suspend().catch(() => {}), until - now);
    }
  } catch {
    // Audio unavailable or blocked: stay silent.
  }
}
