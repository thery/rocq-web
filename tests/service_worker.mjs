// The service worker (app/sw.js) on the site of make dist (headless
// Chromium, as tests/browser.mjs), served here: the page and Rocq offline
// once visited; a new version told by the header's button, the page and its
// reloads kept at the former until it is clicked; on a host without COOP and
// COEP headers, the page cross-origin isolated by the service worker after a
// reload of its own.
//   node tests/service_worker.mjs [DIR]   (dist by default)
import { readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { launch } from "./launch.mjs";

const dir = process.argv[2] ?? "dist";
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json" };

// v2: another page and a service worker that lists it
let version = 1;
const v1 = readFileSync(join(dir, "index.html"), "utf8");
const v2 = v1.replace("</head>", "<!-- v2 --></head>");
const sw2 = readFileSync(join(dir, "sw.js"), "utf8").replace(/\["",\s*"[0-9a-f]+"\]/, '["", "0000000000000002"]');
let headers = true;
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  let path = normalize(decodeURIComponent(url.pathname));
  if (path.endsWith("/")) path += "index.html";
  let body;
  if (version === 2 && path === "/index.html") body = v2;
  else if (version === 2 && path === "/sw.js") body = sw2;
  else
    try {
      if (!statSync(join(dir, path)).isFile()) throw 0;
      body = readFileSync(join(dir, path));
    } catch {
      return res.writeHead(404).end();
    }
  res.writeHead(200, {
    "Content-Type": types[extname(path)] ?? "application/octet-stream",
    "Cache-Control": path.startsWith("/assets/") || url.searchParams.has("v") ? "public, max-age=31536000, immutable" : "no-cache",
    ...(headers && { "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Embedder-Policy": "require-corp" }),
  });
  res.end(body);
}).listen(0);
const url = `http://localhost:${server.address().port}/`;

const browser = await launch();
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failed++; };
const idle = (page) => page.waitForSelector('.status[data-status="Idle"]', { timeout: 300000 });
const marked = async (page) => (await page.content()).includes("<!-- v2 -->");

let context = await browser.newContext();
let page = await context.newPage();
await page.goto(url);
await idle(page);
await page.evaluate(() => navigator.serviceWorker.ready);
check(await page.evaluate(() => crossOriginIsolated), "cross-origin isolated by the server");
await page.reload();
await idle(page);
check(await page.evaluate(() => !!navigator.serviceWorker.controller), "reloaded: the service worker serves the page");

await context.setOffline(true);
await page.reload();
await idle(page);
check(await page.locator("header h1").isVisible(), "offline: the page, and Rocq idle");
await context.setOffline(false);

version = 2;
await page.reload();
check(!(await marked(page)), "a new version: the page reloaded kept at the former");
await page.waitForSelector("header .update-badge", { timeout: 30000 }).then(
  () => check(true, "the header tells of it"),
  () => check(false, "the header tells of it"),
);
await page.reload();
check(!(await marked(page)) && (await page.locator("header .update-badge").count()) === 1, "reloaded again: the former, still told");
await Promise.all([page.waitForEvent("load"), page.click("header .update-badge")]);
await page.waitForSelector("header h1");
check(await marked(page), "clicked: the new version");
check(!(await page.locator("header .update-badge").count()), "nothing more to tell");
await context.close();

// as on GitHub Pages
version = 1;
headers = false;
context = await browser.newContext();
page = await context.newPage();
await page.goto(url);
await page.waitForFunction(() => crossOriginIsolated, null, { timeout: 30000 }).then(
  () => check(true, "without headers: isolated after the page's reload"),
  () => check(false, "without headers: isolated after the page's reload"),
);
await idle(page);
check(true, "and Rocq idle");

await browser.close();
server.close();
console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
