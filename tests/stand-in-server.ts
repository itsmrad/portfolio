/**
 * The stand-in store over HTTP, for screenshots and manual checks:
 *   node tests/stand-in-server.ts 3399 [scenario]
 * then build and start the site with KV_REST_API_URL=http://127.0.0.1:3399
 * and any KV_REST_API_TOKEN. Scenarios: empty, one, many (default).
 */
import { createServer } from "node:http";

// Node runs this file directly, which needs the extension; the type checker does not allow it.
// @ts-expect-error TS5097
import { StandInStore } from "./stand-in-store.ts";

const [port = "3399", scenario = "many"] = process.argv.slice(2);
const store = new StandInStore();

// A deterministic spread: clusters near Anupam, in Europe and the Americas, at the globe's edges and poles.
let seed = 7;
const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const around = (lat: number, lon: number, spread: number, count: number) =>
  Array.from({ length: count }, (): [number, number, number] => [
    Math.round(Math.max(-90, Math.min(90, lat + (random() - 0.5) * spread))),
    Math.round(Math.max(-180, Math.min(180, lon + (random() - 0.5) * spread))),
    1 + Math.floor(random() ** 3 * 40),
  ]);

if (scenario === "one") store.seed({ total: 1, cells: [[52, 13, 1]], live: 0 });
if (scenario === "many") {
  store.seed({
    total: 1284,
    live: 3,
    cells: [
      ...around(28, 77, 8, 18), // near Anupam
      ...around(51, 0, 10, 14), // Europe, near a London visitor
      ...around(40, -100, 30, 16), // North America
      ...around(-23, -47, 10, 6),
      ...around(35, 139, 6, 6),
      ...around(1, 104, 4, 5),
      [80, 20, 2], // far north
      [-75, 0, 1], // far south
      [10, 175, 3], // the globe's eastern edge
      [-40, -170, 2], // and western
    ],
  });
}

createServer((request, response) => {
  let body = "";
  request.on("data", (chunk) => (body += chunk));
  request.on("end", async () => {
    const reply = await store.handle(request.url ?? "/", JSON.parse(body || "null"));
    response.writeHead(reply.status, { "content-type": "application/json" });
    response.end(await reply.text());
  });
}).listen(Number(port), "127.0.0.1");
