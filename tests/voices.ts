import { readFileSync } from "node:fs";

import ts from "typescript";

import type { SoundName } from "../src/lib/sound";

/** Every voice in the vocabulary, with the options a caller would pass. */
export const VOICES: [SoundName, object][] = [
  ["tick", {}], ["tap", {}], ["toggle", {}], ["open", {}], ["close", {}], ["pop", {}], ["key", {}], ["copy", {}],
  ["release", {}], ["toggleOff", {}], ["detent", {}], ["success", {}], ["error", {}], ["thump", {}],
  ["note", { index: 4 }], ["scratch", { duration: 0.6 }], ["bounce", {}], ["break", {}], ["gameOver", {}],
];

export type VoiceReport = {
  name: string;
  seed: number;
  /** Sample peak, linear. */
  peak: number;
  /** RMS of the loudest 50 ms window, linear: a short-term loudness stand-in. */
  loud: number;
  /** Audible length (last sample above -60 dBFS), seconds. */
  seconds: number;
  /** Peak when the voice is played twice at the same instant. */
  overlapPeak: number;
  /** Coarse spectrogram in dB, for `distance`. */
  features: number[];
};

/** The engine source as a plain ES module, so a page can import it from a blob URL. */
export function engineModule() {
  const source = readFileSync("src/lib/sound-engine.ts", "utf8");
  return ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
}

/**
 * Runs in the page: renders each voice offline through the real bus, once per seed, and
 * measures it. Deterministic: Math.random is replaced by a seeded generator per render.
 */
export async function renderVoices({ code, voices, seeds }: { code: string; voices: [string, object][]; seeds: number[] }) {
  const seeded = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const engine = await import(/* @vite-ignore */ URL.createObjectURL(new Blob([code], { type: "text/javascript" })));
  const rate = 48000;
  const fft = (re: Float64Array, im: Float64Array) => {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [re[i], re[j]] = [re[j]!, re[i]!];
        [im[i], im[j]] = [im[j]!, im[i]!];
      }
    }
    for (let size = 2; size <= n; size <<= 1) {
      const step = (-2 * Math.PI) / size;
      for (let start = 0; start < n; start += size)
        for (let k = 0; k < size / 2; k++) {
          const c = Math.cos(step * k), s = Math.sin(step * k);
          const a = start + k, b = a + size / 2;
          const tr = re[b]! * c - im[b]! * s, ti = re[b]! * s + im[b]! * c;
          re[b] = re[a]! - tr;
          im[b] = im[a]! - ti;
          re[a]! += tr;
          im[a]! += ti;
        }
    }
  };
  const render = async (name: string, options: object, seed: number, times: number) => {
    Math.random = seeded(seed);
    const ctx = new OfflineAudioContext(2, rate * 4, rate);
    const voice = engine.createVoices(ctx);
    for (let i = 0; i < times; i++) voice(name, 0, options, 0.005);
    const audio = await ctx.startRendering();
    const left = audio.getChannelData(0), right = audio.getChannelData(1);
    const mono = new Float32Array(left.length);
    let peak = 0, last = 0;
    for (let i = 0; i < left.length; i++) {
      const a = Math.max(Math.abs(left[i]!), Math.abs(right[i]!));
      if (a > peak) peak = a;
      if (a > 0.001) last = i;
      mono[i] = (left[i]! + right[i]!) / 2;
    }
    return { mono, peak, seconds: last / rate };
  };

  const reports = [];
  for (const seed of seeds)
    for (const [name, options] of voices) {
      const { mono, peak, seconds } = await render(name, options, seed, 1);
      const overlap = await render(name, options, seed, 2);
      let loud = 0;
      const span = rate * 0.05;
      for (let start = 0; start + span < mono.length && start < rate * 3; start += span / 5) {
        let sum = 0;
        for (let i = start; i < start + span; i++) sum += mono[i]! ** 2;
        loud = Math.max(loud, Math.sqrt(sum / span));
      }
      // Coarse spectrogram: triangular octave bands (125 Hz to 16 kHz) in 21 ms windows every 10 ms, over 0.8 s.
      const features: number[] = [];
      const W = 1024;
      const octaves = Array.from({ length: 8 }, (_, i) => 125 * 2 ** i);
      for (let start = 0; start + W < 0.8 * rate; start += 480) {
        const re = new Float64Array(W), im = new Float64Array(W);
        for (let i = 0; i < W; i++) re[i] = mono[start + i]! * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / W));
        fft(re, im);
        for (let b = 0; b < octaves.length; b++) {
          let energy = 1e-12;
          for (let k = 1; k < W / 2; k++) {
            const position = Math.log2((k * rate) / W / octaves[b]!);
            const weight = 1 - Math.abs(position);
            if (weight > 0) energy += weight * (re[k]! ** 2 + im[k]! ** 2);
          }
          features.push(10 * Math.log10(energy));
        }
      }
      reports.push({ name, seed, peak, loud, seconds, overlapPeak: overlap.peak, features });
    }
  return reports;
}

export const db = (linear: number) => 20 * Math.log10(linear);

/**
 * How different two sounds are: the mean absolute dB difference of their coarse
 * spectrograms, each relative to its own maximum and floored at -30 dB, over the
 * cells where either is above the floor. Level does not count; shape does.
 */
export function distance(a: number[], b: number[]) {
  const norm = (x: number[]) => {
    const max = Math.max(...x);
    return x.map((value) => Math.max(value - max, -30));
  };
  const na = norm(a), nb = norm(b);
  let sum = 0, count = 0;
  for (let i = 0; i < na.length; i++) {
    if (na[i]! <= -30 && nb[i]! <= -30) continue;
    sum += Math.abs(na[i]! - nb[i]!);
    count++;
  }
  return sum / count;
}
