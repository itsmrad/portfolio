import { expect, test, type Page } from "@playwright/test";

import { collectErrors } from "./helpers";

/**
 * Every game played to the end of a round, then restarted and played again (review day 2, S5): the
 * start-and-first-key checks in arcade*.spec.ts let two broken endings ship (B1, B2). Math.random is
 * pinned to a seeded sequence so each round is the same; each runs with normal and with reduced motion.
 */

/** A small seeded generator in place of Math.random, so a round's layout and the machine's aim repeat. */
function pin(page: Page, seed: number | "zero") {
  return page.addInitScript((seed) => {
    if (seed === "zero") {
      Math.random = () => 0;
      return;
    }
    let a = seed as number;
    Math.random = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, seed);
}

async function start(page: Page, id: string) {
  await page.addInitScript(() => localStorage.setItem("sound", "off"));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(async () => {
    await page.mouse.move(700 + Math.random() * 20, 400);
    await expect(page.locator("[data-margin]")).toHaveCount(2, { timeout: 300 });
  }).toPass();
  await page.evaluate(() => document.getElementById("experience")!.scrollIntoView());
  const card = page.locator(`[data-arcade-card="${id}"]`);
  await card.getByRole("button", { name: /^Play / }).click();
  const canvas = card.locator("canvas");
  await expect(canvas).toBeFocused();
  // Off screen a game is paused by design: put the whole frame in view, and keep the pointer off it.
  await canvas.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await page.mouse.move(2, 2);
  return {
    card,
    score: () => card.locator("output").innerText(),
    over: card.locator('[data-phase="over"]'),
  };
}

/** Restart is Space on the result (the shell's own rule), after its half-second guard against held keys. */
async function restart(page: Page, game: Awaited<ReturnType<typeof start>>) {
  await page.waitForTimeout(600);
  await page.keyboard.press("Space");
  await expect(game.over).toHaveCount(0);
}

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test.describe(`rounds to the end, ${reducedMotion === "reduce" ? "reduced motion" : "full motion"}`, () => {
    test.use({ viewport: { width: 1440, height: 900 }, reducedMotion });

    test("Ruler and rivet: one point at a time to five, and it plays again", async ({ page }) => {
      test.setTimeout(150_000);
      const errors = collectErrors(page);
      await pin(page, 7);
      const game = await start(page, "pong");
      for (let round = 0; round < 2; round++) {
        await expect.poll(game.score, { timeout: 15_000 }).not.toMatch(/0–0$/);
        // The first missed rivet is one point, and the match goes on (B1: it scored every frame to 0–6).
        expect(await game.score()).toMatch(/ (0–1|1–0)$/);
        await expect(game.over).toHaveCount(0);
        await expect(game.over).toBeVisible({ timeout: 90_000 });
        // Frame timing decides rallies; whoever wins, it is five to at most four.
        expect(await game.score()).toMatch(/ ([0-4]–5|5–[0-4])$/);
        if (round === 0) {
          await restart(page, game);
          expect(await game.score()).toMatch(/0–0$/);
        }
      }
      expect(errors).toEqual([]);
    });

    test("Word check: six misses end it with the word shown; after a restart the right word wins", async ({ page }) => {
      const errors = collectErrors(page);
      // Math.random 0: the word is REACT.
      await pin(page, "zero");
      const game = await start(page, "words");
      for (let i = 0; i < 6; i++) {
        await page.keyboard.type("ABCDE");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(900);
      }
      // B2: under reduced motion the round never ended.
      await expect(game.over).toBeVisible({ timeout: 5000 });
      await restart(page, game);
      await page.keyboard.type("REACT");
      await page.keyboard.press("Enter");
      await expect(game.over).toBeVisible({ timeout: 5000 });
      expect(await game.score()).toMatch(/1\/6$/);
      expect(errors).toEqual([]);
    });
  });
}
