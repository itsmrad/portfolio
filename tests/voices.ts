import { readFileSync } from "node:fs";

import ts from "typescript";

import type { SoundName } from "../src/lib/sound";

/** Every voice in the vocabulary, with the options a caller would pass. */
export const VOICES: [SoundName, object][] = [
  ["tick", {}], ["tap", {}], ["toggle", {}], ["open", {}], ["close", {}], ["pop", {}], ["key", {}], ["copy", {}],
  ["release", {}], ["toggleOff", {}], ["detent", {}], ["success", {}], ["error", {}], ["thump", {}],
  ["note", { index: 4 }], ["scratch", { duration: 0.6 }], ["bounce", {}], ["break", {}], ["gameOver", {}],
];

export type VoiceReport = { name: string; peak: number; rms: number; seconds: number; clipped: number; features: number[] };

/** The engine source as a plain ES module, so a page can import it from a blob URL. */
export function engineModule() {
  const source = readFileSync("src/lib/sound-engine.ts", "utf8");
  return ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
}

/**
 * Runs in the page: renders each voice offline with a seeded random source and returns
 * its peak, RMS, audible length (above -60 dBFS), clipped samples and a coarse
 * spectrogram (32 log-spaced bands from 80 Hz to 16 kHz, 23 ms frames).
 */
export async function renderVoices({ code, voices }: { code: string; voices: [string, object][] }) {
  let seed = 0x5eed;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  const engine = await import(/* @vite-ignore */ url);
  const rate = 48000;
  const bands = Array.from({ length: 32 }, (_, i) => 80 * (16000 / 80) ** (i / 31));
  const reports = [];
  for (const [name, options] of voices) {
    const ctx = new OfflineAudioContext(2, rate * 4, rate);
    engine.createVoices(ctx)(name, 0, options, 0.005);
    const audio = await ctx.startRendering();
    const left = audio.getChannelData(0);
    const right = audio.getChannelData(1);
    let peak = 0, sum = 0, last = 0, clipped = 0;
    const mono = new Float32Array(left.length);
    for (let i = 0; i < left.length; i++) {
      const a = Math.max(Math.abs(left[i]!), Math.abs(right[i]!));
      if (a > peak) peak = a;
      if (a >= 1) clipped++;
      if (a > 0.001) last = i;
      mono[i] = (left[i]! + right[i]!) / 2;
      sum += mono[i]! * mono[i]!;
    }
    const frame = 1024;
    const features: number[] = [];
    for (let start = 0; start + frame <= Math.max(last, frame); start += frame) {
      for (const f of bands) {
        // Goertzel magnitude of one band over one frame.
        const k = 2 * Math.cos((2 * Math.PI * f) / rate);
        let s1 = 0, s2 = 0;
        for (let i = start; i < start + frame; i++) {
          const s0 = mono[i]! + k * s1 - s2;
          s2 = s1;
          s1 = s0;
        }
        features.push(Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - k * s1 * s2)));
      }
    }
    reports.push({ name, peak, rms: Math.sqrt(sum / (last + 1)), seconds: last / rate, clipped, features });
  }
  return reports;
}

/** Cosine similarity of two spectrograms, aligned at the start (the shorter is zero-padded). */
export function similarity(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0, y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  return dot / Math.sqrt(na * nb);
}
