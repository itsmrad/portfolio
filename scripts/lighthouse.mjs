// Lighthouse gate: mobile preset with simulated throttling, three runs per
// page, medians asserted against the performance budget. Needs a production
// build (`npm run build`). Uses the Chromium that Playwright resolves, so
// PLAYWRIGHT_BROWSERS_PATH is the only setting; no browser is downloaded.
//
// Scores and layout shift always gate. The two timings (LCP and blocking
// time) swing with machine load, so they are printed on every run but fail
// the gate only with `--strict-timing`, which the final QA run uses on an
// idle machine: `npm run lighthouse -- --strict-timing`.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";

// Next to the Playwright port, so one GATE_PORT per worktree keeps every gate apart.
const GATE_PORT = Number(process.env.GATE_PORT ?? 3210);
const PORT = GATE_PORT + 1;
const DEBUG_PORT = GATE_PORT + 2;
const RUNS = 3;
const STRICT_TIMING = process.argv.includes("--strict-timing");
const ORIGIN = `http://localhost:${PORT}`;

// Hard limits. They change only with the lead's sign-off.
const LIMIT = { cls: 0.02 };
const TIMING_LIMIT = { lcp: 2000, tbt: 100 };
const PAGES = [
  { path: "/", scores: { performance: 95, accessibility: 100, "best-practices": 100, seo: 100 } },
  // A 404 is not indexable and the browser itself logs the 404 response as a
  // console error, so SEO and best-practices cannot reach 100 there by design.
  { path: "/no-such-page", scores: { performance: 90, accessibility: 100 } },
];

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

const up = () => fetch(ORIGIN).then((response) => response.ok, () => false);
// A leftover server would be audited in place of this build.
if (await up()) throw new Error(`Port ${PORT} is already serving something; stop it first`);
// Run Next's own entry point (not npx) so that kill() reaches the server itself.
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], { stdio: "ignore" });
let browser;
const failures = [];
try {
  for (let attempt = 0; !(await up()); attempt++) {
    if (attempt > 50) throw new Error("next start did not come up; run `npm run build` first");
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  browser = await chromium.launch({
    channel: "chromium",
    executablePath: process.env.CHROME_PATH,
    args: [`--remote-debugging-port=${DEBUG_PORT}`],
  });
  await mkdir(".lighthouse", { recursive: true });

  for (const page of PAGES) {
    const runs = [];
    for (let run = 0; run < RUNS; run++) {
      const { lhr } = await lighthouse(ORIGIN + page.path, {
        port: DEBUG_PORT,
        output: "json",
        logLevel: "error",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        ignoreStatusCode: true,
      });
      if (lhr.runtimeError) throw new Error(`${page.path}: ${lhr.runtimeError.message}`);
      runs.push(lhr);
    }
    await writeFile(`.lighthouse/${page.path === "/" ? "home" : "404"}.json`, JSON.stringify(runs.at(-1)));

    const score = (category) => Math.round(median(runs.map((lhr) => lhr.categories[category].score)) * 100);
    const metric = (audit) => median(runs.map((lhr) => lhr.audits[audit].numericValue));
    const result = {
      performance: score("performance"),
      accessibility: score("accessibility"),
      "best-practices": score("best-practices"),
      seo: score("seo"),
      lcp: Math.round(metric("largest-contentful-paint")),
      cls: Number(metric("cumulative-layout-shift").toFixed(4)),
      tbt: Math.round(metric("total-blocking-time")),
    };
    console.log(page.path, JSON.stringify(result));

    for (const [category, minimum] of Object.entries(page.scores)) {
      if (result[category] < minimum) failures.push(`${page.path}: ${category} ${result[category]} < ${minimum}`);
    }
    for (const [name, maximum] of Object.entries(LIMIT)) {
      if (result[name] > maximum) failures.push(`${page.path}: ${name} ${result[name]} > ${maximum}`);
    }
    for (const [name, maximum] of Object.entries(TIMING_LIMIT)) {
      if (result[name] <= maximum) continue;
      const message = `${page.path}: ${name} ${result[name]} > ${maximum}`;
      if (STRICT_TIMING) failures.push(message);
      else console.log(`  timing over its limit (fails only with --strict-timing): ${message}`);
    }
    // Name what cost points, so a failure is actionable without opening the report.
    for (const category of Object.keys(page.scores).filter((c) => c !== "performance")) {
      const last = runs.at(-1);
      for (const ref of last.categories[category].auditRefs) {
        const audit = last.audits[ref.id];
        if (audit.score !== null && audit.score < 1) console.log(`  ${category}: ${audit.id} (${audit.title})`);
      }
    }
  }
} finally {
  await browser?.close();
  server.kill();
}

if (failures.length) {
  console.error(`Lighthouse gate failed:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log("Lighthouse gate passed");
