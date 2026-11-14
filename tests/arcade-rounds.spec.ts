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

type Game = Awaited<ReturnType<typeof start>>;
/** How each cartridge reaches its end from a fresh round: a scripted player, or an idle one where the game ends by itself. */
const ROUNDS: { id: string; seed: number | "zero"; play: (page: Page, game: Game) => Promise<void>; score?: RegExp; limit?: number }[] = [
  {
    id: "typing",
    seed: "zero",
    // Math.random 0: xflow's insert(). Indentation types itself; Enter between lines.
    play: async (page) => {
      for (const line of ["fn insert(&mut self, c: char) {", "self.value.insert(self.cursor, c);", "self.cursor += c.len_utf8();", "}"]) {
        await page.keyboard.type(line, { delay: 8 });
        if (line !== "}") await page.keyboard.press("Enter");
      }
    },
    score: / \d+ wpm$/,
  },
  {
    id: "memory",
    seed: "zero",
    // Math.random 0: every mark is the top one. One right, then a wrong one.
    play: async (page, game) => {
      await page.waitForTimeout(1800);
      await page.keyboard.press("ArrowUp");
      await expect.poll(game.score).toMatch(/ 1$/);
      await page.waitForTimeout(2600);
      await page.keyboard.press("ArrowDown");
    },
    score: / 1$/,
  },
  {
    id: "reaction",
    seed: "zero",
    // Math.random 0: the lamp lights 1.2 s after arming. Five tries.
    play: async (page) => {
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("Space");
        await page.waitForTimeout(1700);
        await page.keyboard.press("Space");
        await page.waitForTimeout(300);
      }
    },
    score: / \d+ ms$/,
  },
  // D heads right (WASD), into the frame sooner or later.
  { id: "snake", seed: 3, play: (page) => page.keyboard.press("d"), score: / (\d+ mm|—)$/ },
  {
    id: "breakout",
    seed: 5,
    // Three balls; an idle bar loses them. Space launches each.
    play: async (page, game) => {
      for (let i = 0; i < 80 && !(await game.over.count()); i++) {
        await page.keyboard.press("Space");
        await page.waitForTimeout(1500);
      }
    },
    limit: 150_000,
  },
  {
    id: "sheets",
    seed: "zero",
    play: async (page, game) => {
      const keys = ["a", "s", "d", "w"];
      for (let i = 0; i < 900 && !(await game.over.count()); i++) {
        await page.keyboard.press(keys[i % 4]!);
        await page.waitForTimeout(110);
      }
    },
    limit: 180_000,
  },
  { id: "punch", seed: 9, play: (page) => page.keyboard.press("Space"), limit: 60_000 },
  { id: "plane", seed: 4, play: (page) => page.keyboard.press("Space"), score: / 0$|—$/ },
  {
    id: "redline",
    seed: 2,
    // Start, then pick line 1 five times (no snippet's bug is on line 1) and move on.
    play: async (page) => {
      await page.keyboard.press("s");
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("1");
        await page.waitForTimeout(250);
        await page.keyboard.press("Space");
        await page.waitForTimeout(250);
      }
    },
    score: / 0$/,
  },
  { id: "parts", seed: 6, play: (page) => page.keyboard.press("w"), limit: 240_000 },
  {
    id: "stack",
    seed: 8,
    play: async (page, game) => {
      await page.keyboard.press("Space");
      for (let i = 0; i < 200 && !(await game.over.count()); i++) {
        await page.keyboard.press("Space");
        await page.waitForTimeout(60);
      }
    },
  },
];

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

    for (const round of ROUNDS)
      test(`${round.id}: a round to its end, then again after Space`, async ({ page }) => {
        test.setTimeout(2 * (round.limit ?? 60_000) + 30_000);
        const errors = collectErrors(page);
        await pin(page, round.seed);
        const game = await start(page, round.id);
        for (let n = 0; n < 2; n++) {
          await round.play(page, game);
          await expect(game.over).toBeVisible({ timeout: round.limit ?? 60_000 });
          if (round.score) expect(await game.score()).toMatch(round.score);
          if (n === 0) await restart(page, game);
        }
        expect(errors).toEqual([]);
      });

    test("Play my contributions: out of ships ends the year with the result, and Space plays again", async ({ page }) => {
      test.setTimeout(400_000);
      const errors = collectErrors(page);
      await pin(page, 11);
      await page.addInitScript(() => localStorage.setItem("sound", "off"));
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await page.mouse.move(700, 400);
      await page.mouse.move(720, 420);
      const button = page.getByRole("button", { name: "Play my contributions" });
      await button.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      await button.click();
      const canvas = page.locator("#activity canvas");
      await expect(canvas).toBeFocused();
      await canvas.evaluate((element) => element.scrollIntoView({ block: "center" }));
      await page.mouse.move(2, 2);
      const said = page.locator("#activity canvas + [role=status]");
      for (let n = 0; n < 2; n++) {
        // An idle ship is shot down three times.
        await expect(said).toContainText(/Out of ships|whole year/, { timeout: 180_000 });
        if (n === 0) {
          await page.waitForTimeout(900);
          await page.keyboard.press("Space");
          await expect(said).toContainText("Wave 1", { timeout: 5000 });
        }
      }
      await page.keyboard.press("Escape");
      await expect(button).toBeFocused({ timeout: 5000 });
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
