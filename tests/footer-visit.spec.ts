import { expect, test } from "@playwright/test";

import { GET, POST } from "../src/app/api/visit/route";
import { VisitorCounter } from "../src/components/footer/visitor-counter";

/**
 * The visitor counter's rules, run in Node against a stand-in for the store's
 * REST API (no browser, no network). The stand-in implements the two commands
 * the route sends: GET of the total and the count-once script.
 */
const BROWSER = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Safari/537.36";

type Mode = "ok" | "down" | "html" | "slow";
function standIn(mode: Mode = "ok") {
  const store = { total: 41, keys: new Set<string>(), commands: [] as unknown[][] };
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    const command = JSON.parse(String(init.body)) as unknown[];
    store.commands.push(command);
    if (mode === "down") return new Response("down", { status: 500 });
    if (mode === "html") return new Response("<html>", { status: 200 });
    if (mode === "slow") {
      await new Promise((_, reject) => init.signal?.addEventListener("abort", () => reject(init.signal?.reason)));
    }
    let result: number | string = store.total;
    if (command[0] === "GET") result = String(store.total);
    if (command[0] === "EVAL") {
      const key = String(command[4]);
      if (!store.keys.has(key)) {
        store.keys.add(key);
        result = ++store.total;
      }
    }
    return Response.json({ result });
  }) as typeof fetch;
  return store;
}

const visit = (headers: Record<string, string> = {}, init: RequestInit = {}) =>
  POST(
    new Request("https://www.anupamdas.me/api/visit", {
      method: "POST",
      headers: { "user-agent": BROWSER, "sec-fetch-site": "same-origin", "x-real-ip": "203.0.113.7", ...headers },
      ...init,
    }),
  );

const realFetch = globalThis.fetch;
test.beforeEach(() => {
  process.env.KV_REST_API_URL = "https://store.test";
  process.env.KV_REST_API_TOKEN = "token";
  process.env.VERCEL_ENV = "production";
});
test.afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.VERCEL_ENV;
});

test("one count per address per day, whatever the user agent; the address is never stored", async () => {
  const store = standIn();
  for (let i = 0; i < 40; i++) {
    const response = await visit({ "user-agent": `${BROWSER} build/${i}` });
    expect(await response.json()).toEqual({ count: 42 });
  }
  expect(await (await visit({ "x-real-ip": "198.51.100.9" })).json()).toEqual({ count: 43 });
  expect(store.keys.size).toBe(2);
  // One atomic command per counted visit, with the day-long expiry inside it.
  expect(store.commands.every((command) => command[0] === "EVAL" && command.at(-1) === 86400)).toBe(true);
  expect(JSON.stringify(store.commands)).not.toContain("203.0.113.7");
  expect(JSON.stringify(store.commands)).not.toContain("198.51.100.9");
});

test("only production counts; previews and local runs never write", async () => {
  for (const environment of ["preview", "development", undefined]) {
    const store = standIn();
    if (environment) process.env.VERCEL_ENV = environment;
    else delete process.env.VERCEL_ENV;
    expect(await (await visit()).json()).toEqual({});
    expect(store.commands).toEqual([]);
  }
});

test("what is not a plain browser visit is answered without touching the store", async () => {
  const cases: Record<string, string>[] = [
    { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
    { "user-agent": "curl/8.5.0" },
    { "user-agent": "" },
    { "sec-fetch-site": "cross-site" },
    { "sec-fetch-site": "" },
    { "sec-purpose": "prefetch;prerender" },
    { purpose: "prefetch" },
    { "x-real-ip": "" },
  ];
  for (const headers of cases) {
    const store = standIn();
    const response = await visit(headers);
    expect(response.status, JSON.stringify(headers)).toBe(200);
    expect(await response.json()).toEqual({});
    expect(store.commands, JSON.stringify(headers)).toEqual([]);
  }
  const store = standIn();
  // A real server passes the length the client sent; a body means it is not the page.
  const withBody = await visit({ "content-length": "2048" }, { body: "x".repeat(2048) });
  expect(withBody.status).toBe(413);
  expect(store.commands).toEqual([]);
});

test("reads are cached by the CDN, so they do not cost a store command each", async () => {
  standIn();
  const response = await GET();
  expect(await response.json()).toEqual({ count: 41 });
  expect(response.headers.get("cache-control")).toMatch(/s-maxage=\d+.*stale-while-revalidate=\d+/);
});

for (const mode of ["down", "html", "slow"] as const) {
  test(`a store that is ${mode} leaves an empty answer, quickly and without an error status`, async () => {
    standIn(mode);
    const started = Date.now();
    for (const response of [await GET(), await visit()]) {
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({});
    }
    expect(Date.now() - started).toBeLessThan(8000);
  });
}

test("without the store's variables there is no route and no cell", async () => {
  delete process.env.KV_REST_API_URL;
  const store = standIn();
  expect((await GET()).status).toBe(404);
  expect((await visit()).status).toBe(404);
  expect(store.commands).toEqual([]);
  expect(VisitorCounter()).toBeNull();
});

test("with the store, the cell is two columns wide and hidden until the client has a real count", async () => {
  const cell = VisitorCounter() as unknown as { props: { label: string; className: string; children: { props: object } } };
  expect(cell.props.label).toBe("Visitors");
  expect(cell.props.className.split(" ")).toEqual(expect.arrayContaining(["invisible", "col-span-2"]));
  // No number from the server: the only child is the client counter, given the unit alone.
  expect(Object.keys(cell.props.children.props)).toEqual(["unit"]);
});
