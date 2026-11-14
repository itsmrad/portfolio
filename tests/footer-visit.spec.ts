import { expect, test } from "@playwright/test";

import { VisitorCounter } from "../src/components/footer/visitor-counter";
import {
  cellFrom,
  DAILY_WRITES,
  distanceFrom,
  KEYS,
  LIVE_WINDOW,
  live,
  MAX_CELLS,
  reopen,
  SHARED,
  stats,
  visit,
} from "../src/components/footer/visits";
import { StandInStore, useStandIn } from "./stand-in-store";

/**
 * The visitor counter, live count and map, server side: run in Node against
 * the stand-in store (no browser, no network, no real store).
 */
const BROWSER = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Safari/537.36";
const PAGE = { "user-agent": BROWSER, "sec-fetch-site": "same-origin", "x-real-ip": "203.0.113.7" };
const LONDON = { "x-vercel-ip-latitude": "51.5072", "x-vercel-ip-longitude": "-0.1276", "x-vercel-ip-country": "GB" };
const TAB = "AbCdEfGhIjKlMnOpQrStUv";

const post = (path: string, headers: Record<string, string> = {}, init: RequestInit = {}) =>
  new Request(`https://www.anupamdas.me${path}`, { method: "POST", headers: { ...PAGE, ...headers }, ...init });

let store: StandInStore;
let restore = () => {};
const realNow = Date.now;
test.beforeEach(() => {
  process.env.KV_REST_API_URL = "https://store.test";
  process.env.KV_REST_API_TOKEN = "token";
  process.env.VERCEL_ENV = "production";
  store = new StandInStore();
  restore = useStandIn(store);
  reopen();
});
test.afterEach(() => {
  restore();
  Date.now = realNow;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.VERCEL_ENV;
});

test.describe("location", () => {
  test("is rounded to the whole degree, from Vercel's headers only, and validated", () => {
    const cell = (lat?: string, lon?: string) =>
      cellFrom(new Headers({ ...(lat !== undefined && { "x-vercel-ip-latitude": lat }), ...(lon !== undefined && { "x-vercel-ip-longitude": lon }) }));
    expect(cell("28.6139", "77.2090")).toEqual([29, 77]);
    expect(cell("-33.8688", "151.2093")).toEqual([-34, 151]);
    expect(cell("-0.4", "-0.4")).toEqual([0, 0]);
    expect(cell("12.5", "-179.6")).toEqual([13, 180]);
    for (const [lat, lon] of [
      ["", "1"],
      ["abc", "1"],
      ["91", "0"],
      ["0", "181"],
      ["1e1", "2"],
      ["12.5.3", "2"],
      ["  ", "2"],
      [undefined, "2"],
      ["12", undefined],
    ] as const) {
      expect(cell(lat, lon), `${lat},${lon}`).toBeNull();
    }
  });

  test("distance: miles in the US, the UK, Liberia and Myanmar, kilometres elsewhere; rounded for 1° data", () => {
    const london: [number, number] = [52, 0];
    for (const country of ["US", "GB", "LR", "MM", "us", "gb"]) expect(distanceFrom(london, country)).toMatchObject({ unit: "mi" });
    for (const country of ["IN", "DE", "CA", "AU", null, ""]) expect(distanceFrom(london, country)).toMatchObject({ unit: "km" });
    // Above 1,000: to the hundred. London to New Delhi is about 6,700 km.
    expect(distanceFrom(london, "IN")).toEqual({ value: 6700, unit: "km" });
    expect(distanceFrom(london, "GB")).toEqual({ value: 4200, unit: "mi" });
    // Below 1,000: to the ten. Jaipur's cell (27, 76) is about 240 km away.
    const near = distanceFrom([27, 76], "IN");
    expect(near).toMatchObject({ unit: "km" });
    expect("value" in near && near.value % 10 === 0 && near.value > 150 && near.value < 300).toBe(true);
    // Anupam's own cell is not "0 km".
    expect(distanceFrom([29, 77], "IN")).toEqual({ same: true });
    expect(distanceFrom([29, 77], "US")).toEqual({ same: true });
  });
});

test.describe("counting", () => {
  test("one count per address per day, whatever the user agent; the address is never stored", async () => {
    for (let i = 0; i < 40; i++) await visit(post("/api/visit", { "user-agent": `${BROWSER} build/${i}`, ...LONDON }));
    expect(await (await visit(post("/api/visit", { "x-real-ip": "198.51.100.9" }))).json()).toEqual({ count: 2 });
    const dump = JSON.stringify([...store.strings.keys(), ...store.zsets.keys(), [...store.zsets.values()].map((set) => [...set.keys()])]);
    expect(dump).not.toContain("203.0.113.7");
    expect(dump).not.toContain("198.51.100.9");
    expect(store.strings.get(KEYS.total)?.value).toBe("2");
  });

  test("visits are aggregated per cell, and only as counts", async () => {
    await visit(post("/api/visit", LONDON));
    await visit(post("/api/visit", { ...LONDON, "x-real-ip": "198.51.100.1", "x-vercel-ip-latitude": "51.9" }));
    await visit(post("/api/visit", { "x-real-ip": "198.51.100.2" }));
    expect([...store.zsets.get(KEYS.cells)!]).toEqual([["52:0", 2]]);
    const body = await (await stats()).json();
    expect(body).toEqual({ count: 3, live: 0, cells: [[52, 0, 2]] });
  });

  test("a new visit costs one store call and five billed commands; a repeat three", async () => {
    await visit(post("/api/visit", LONDON));
    expect(store.billed).toBe(1 + 4 + 2); // the day's first write also sets the day key's expiry and tidies the live set
    store.billed = 0;
    await visit(post("/api/visit", { ...LONDON, "x-real-ip": "198.51.100.1" }));
    expect(store.billed).toBe(5);
    store.billed = 0;
    await visit(post("/api/visit", LONDON));
    expect(store.billed).toBe(3);
  });

  test("only production writes; previews and local runs never do, though local reads are real", async () => {
    store.seed({ total: 41, cells: [[52, 0, 3]] });
    for (const environment of ["preview", "development", undefined]) {
      if (environment) process.env.VERCEL_ENV = environment;
      else delete process.env.VERCEL_ENV;
      store.billed = 0;
      expect(await (await visit(post("/api/visit", LONDON))).json()).toEqual({});
      // The heartbeat still answers this visitor's own place: nothing is written for it.
      expect(await (await live(post(`/api/visit/live?id=${TAB}`, LONDON))).json()).toMatchObject({ you: [52, 0] });
      expect(store.billed).toBe(0);
      // Reads show the store's real numbers, deliberately: a local run with the variables set sees production's map.
      expect(await (await stats()).json()).toEqual({ count: 41, live: 0, cells: [[52, 0, 3]] });
    }
  });

  test("bots, prefetch, prerender, cross-site and malformed requests never touch the store", async () => {
    const cases: Record<string, string>[] = [
      { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
      { "user-agent": "curl/8.5.0" },
      { "user-agent": "Mozilla/5.0 HeadlessChrome/142.0" },
      { "user-agent": "" },
      { "user-agent": "x".repeat(600) },
      { "sec-fetch-site": "cross-site" },
      { "sec-fetch-site": "" },
      { "sec-purpose": "prefetch;prerender" },
      { purpose: "prefetch" },
      { "x-real-ip": "" },
    ];
    for (const headers of cases) {
      const visitReply = await visit(post("/api/visit", headers));
      expect(await visitReply.json(), JSON.stringify(headers)).toEqual({});
      // A heartbeat needs no address (it stores none); every other rule applies to it too.
      if (!("x-real-ip" in headers)) await live(post(`/api/visit/live?id=${TAB}`, headers));
    }
    for (const id of ["", "short", `${TAB}!`, "A".repeat(23), "../../etc"]) {
      expect(await (await live(post(`/api/visit/live?id=${encodeURIComponent(id)}`))).json()).toEqual({});
    }
    const body = { "content-length": "2048" };
    expect((await visit(post("/api/visit", body, { body: "x".repeat(2048) }))).status).toBe(413);
    expect((await live(post(`/api/visit/live?id=${TAB}`, body, { body: "x".repeat(2048) }))).status).toBe(413);
    expect(store.billed).toBe(0);
  });

  test("a daily ceiling: past it, nothing more is written today, and this instance stops calling the store", async () => {
    Date.now = () => Date.UTC(2026, 10, 14, 12);
    store.strings.set(KEYS.day(Date.now()), { value: String(DAILY_WRITES) });
    expect(await (await visit(post("/api/visit", LONDON))).json()).toEqual({});
    expect(store.strings.get(KEYS.total)).toBeUndefined();
    store.billed = 0;
    for (let i = 0; i < 50; i++) {
      await visit(post("/api/visit", { "x-real-ip": `198.51.100.${i}` }));
      await live(post(`/api/visit/live?id=${TAB}`));
    }
    expect(store.billed).toBe(0);
    // A new UTC day opens again.
    Date.now = () => Date.UTC(2026, 10, 15, 0, 0, 1);
    expect(await (await visit(post("/api/visit", LONDON))).json()).toEqual({ count: 1 });
  });

  test("the day is the UTC day, whatever the server's time zone", () => {
    const moment = Date.UTC(2026, 10, 14, 23, 30);
    const zone = process.env.TZ;
    try {
      process.env.TZ = "Pacific/Auckland";
      const auckland = KEYS.day(moment);
      process.env.TZ = "America/Los_Angeles";
      expect(KEYS.day(moment)).toBe(auckland);
      expect(auckland).toBe("visitors:day:2026-11-14");
    } finally {
      process.env.TZ = zone;
    }
  });
});

test.describe("live presence", () => {
  test("a heartbeat marks the tab live for 130 s, costs three billed commands, and answers only this visitor's place", async () => {
    Date.now = () => 1_800_000_000_000;
    const reply = await live(post(`/api/visit/live?id=${TAB}`, LONDON));
    expect(reply.headers.get("cache-control")).toBe("no-store");
    expect(await reply.json()).toEqual({ you: [52, 0], distance: { value: 4200, unit: "mi" } });
    store.billed = 0;
    await live(post(`/api/visit/live?id=${TAB}`, LONDON));
    expect(store.billed).toBe(3);
    // The visitor's place is not stored by a heartbeat.
    expect(store.zsets.get(KEYS.cells)?.size ?? 0).toBe(0);
    expect((await (await stats()).json()).live).toBe(1);
    Date.now = () => 1_800_000_000_000 + LIVE_WINDOW + 1;
    expect((await (await stats()).json()).live).toBe(0);
  });

  test("distinct tabs count once each, however often they beat", async () => {
    for (const id of [TAB, TAB, TAB, "ZZZZZZZZZZZZZZZZZZZZZZ", "YYYYYYYYYYYYYYYYYYYYYY"]) await live(post(`/api/visit/live?id=${id}`));
    expect((await (await stats()).json()).live).toBe(3);
  });

  test("an unknown place answers nothing about the visitor", async () => {
    expect(await (await live(post(`/api/visit/live?id=${TAB}`))).json()).toEqual({});
    expect(await (await live(post(`/api/visit/live?id=${TAB}`, { "x-vercel-ip-latitude": "x", "x-vercel-ip-longitude": "1" }))).json()).toEqual({});
  });
});

test.describe("shared reads", () => {
  test("are cached by the CDN, capped, validated and cost three billed commands", async () => {
    // More cells than the cap, plus junk a broken or tampered store might hold.
    store.seed({ total: 9, cells: Array.from({ length: MAX_CELLS + 50 }, (_, i): [number, number, number] => [(i % 170) - 85, (i % 360) - 180, i + 1]) });
    const cells = store.zsets.get(KEYS.cells)!;
    cells.set("999:0", 10_000);
    cells.set("not a cell", 10_001);
    const reply = await stats();
    expect(reply.headers.get("cache-control")).toBe(SHARED);
    expect(SHARED).toMatch(/s-maxage=\d+, stale-while-revalidate=\d+/);
    const body = (await reply.json()) as { cells: number[][] };
    expect(body.cells.length).toBeLessThanOrEqual(MAX_CELLS);
    expect(body.cells.every(([lat, lon, n]) => Math.abs(lat!) <= 90 && Math.abs(lon!) <= 180 && n! >= 1)).toBe(true);
    // Busiest first.
    expect(body.cells[0]![2]).toBeGreaterThanOrEqual(body.cells.at(-1)![2]!);
    expect(JSON.stringify(body).length).toBeLessThan(8 * 1024);
    expect(store.billed).toBe(3);
  });

  test("nonsense from the store is a failure, not a number", async () => {
    for (const total of ["-3", "1.5", "abc", String(2 ** 60)]) {
      store.strings.set(KEYS.total, { value: total });
      expect(await (await stats()).json(), total).toEqual({});
    }
  });

  for (const mode of ["down", "garbage", "slow"] as const) {
    test(`a store that is ${mode} leaves empty answers, quickly and with no error status`, async () => {
      store.mode = mode;
      const started = realNow();
      for (const reply of [await stats(), await visit(post("/api/visit", LONDON)), await live(post(`/api/visit/live?id=${TAB}`, LONDON))]) {
        expect(reply.status).toBe(200);
        expect(reply.headers.get("cache-control")).toBe("no-store");
      }
      expect(await (await stats()).json()).toEqual({});
      expect(realNow() - started).toBeLessThan(13_000);
    });
  }

  test("without the store's variables: no cell, an empty shared read, and no write routes", async () => {
    delete process.env.KV_REST_API_URL;
    const reply = await stats();
    expect(await reply.json()).toEqual({});
    expect(reply.headers.get("cache-control")).toMatch(/s-maxage=86400/);
    expect((await visit(post("/api/visit"))).status).toBe(404);
    expect((await live(post(`/api/visit/live?id=${TAB}`))).status).toBe(404);
    expect(store.billed).toBe(0);
    expect(VisitorCounter()).toBeNull();
  });

  test("with the store, the cell renders hidden until the client has a real count, with the live line's words", () => {
    const cell = VisitorCounter() as unknown as { props: { label: string; className: string; children: { props: Record<string, string> } } };
    expect(cell.props.label).toBe("Visitors");
    expect(cell.props.className.split(" ")).toEqual(["invisible"]);
    expect(cell.props.children.props).toMatchObject({ alone: "just you right now", many: "people here right now" });
  });
});
