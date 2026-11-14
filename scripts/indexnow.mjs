// IndexNow ping: tells Bing, Yandex, Naver, Seznam, Yep and Amazon (through the shared
// api.indexnow.org endpoint) that the sitemap's URLs changed. Needs no secret: the key
// is public by design and served from the site as /<key>.txt (public/<key>.txt).
//
//   node scripts/indexnow.mjs                      # production: read the live sitemap, ping
//   node scripts/indexnow.mjs --dry-run <origin>   # read sitemap and key from <origin>, print the request
//
// Run on every production deploy by .github/workflows/indexnow.yml.
import { readdirSync } from "node:fs";

const SITE = "https://www.anupamdas.me";
const dryRun = process.argv.includes("--dry-run");
const origin = (dryRun && process.argv[process.argv.indexOf("--dry-run") + 1]) || SITE;

const keyFile = readdirSync("public").find((file) => /^[0-9a-f]{32}\.txt$/.test(file));
if (!keyFile) throw new Error("No IndexNow key file (public/<32 hex>.txt)");
const key = keyFile.slice(0, -4);

const get = async (path) => {
  const response = await fetch(origin + path);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.text();
};

// The engines fetch the key file to verify ownership: make sure this deploy serves it.
if ((await get(`/${keyFile}`)).trim() !== key) throw new Error(`/${keyFile} does not serve the key`);
const urlList = [...(await get("/sitemap.xml")).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (urlList.length === 0) throw new Error("The sitemap lists no URLs");

const body = { host: new URL(SITE).host, key, keyLocation: `${SITE}/${keyFile}`, urlList };
if (dryRun) {
  console.log(JSON.stringify(body));
} else {
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  // 200 OK, or 202 Accepted while the key is being verified; anything else is a failure.
  console.log(`IndexNow: HTTP ${response.status} for ${urlList.length} URL(s)`);
  if (response.status !== 200 && response.status !== 202) process.exit(1);
}
