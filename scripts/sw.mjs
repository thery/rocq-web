// Writes DIR/sw.js, the service worker of app/sw.js with the lists of the
// files it caches and their revisions (a hash of their contents).
//   node scripts/sw.mjs [DIR]   (dist by default)
// scripts/dist.mjs runs it, and scripts/cloudflare.mjs again on its copy,
// whose rocq/worker.js it changes and which has no lsp_worker.wasm.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const dir = process.argv[2] ?? "dist";

// fetched on install
const precached = (p) =>
  p === "index.html" ||
  p === "manifest.webmanifest" ||
  /^(assets|examples|icons)\//.test(p) ||
  p === "rocq/worker.js" ||
  /^rocq\/[^/]+\/(lsp_worker\.js|files\.json|packages\.json)$/.test(p);
// kept once fetched
const lazy = (p) => /^rocq\/[^/]+\/(lsp_worker\.wasm|search\.tsv)$/.test(p);

function walk(d, f) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) {
      // (Rocq's libraries, fetched with their version)
      if (!/^(coqlib|plugins|findlib)$/.test(e.name)) walk(p, f);
    } else if (statSync(p).isFile() && !p.endsWith(".br")) f(relative(dir, p).split(sep).join("/"));
  }
}
const lists = { precache: [], lazy: [] };
walk(dir, (p) => {
  const list = precached(p) ? lists.precache : lazy(p) ? lists.lazy : null;
  if (!list) return;
  const revision = createHash("sha256").update(readFileSync(join(dir, p))).digest("hex").slice(0, 16);
  list.push([p === "index.html" ? "" : p, revision]);
});
for (const l of Object.values(lists)) l.sort((a, b) => (a[0] < b[0] ? -1 : 1));
if (!lists.precache.some(([p]) => p === "")) {
  console.error(`${dir}: no index.html`);
  process.exit(1);
}

const source = readFileSync(new URL("../app/sw.js", import.meta.url), "utf8");
let out = source;
for (const [name, list] of Object.entries(lists)) {
  const line = new RegExp(`^var ${name} = \\[\\];$`, "m");
  if (!line.test(out)) {
    console.error(`app/sw.js: no "var ${name} = [];" line`);
    process.exit(1);
  }
  out = out.replace(line, () => `var ${name} = ${JSON.stringify(list)};`);
}
writeFileSync(join(dir, "sw.js"), out);
console.log(`${dir}/sw.js: ${lists.precache.length} files cached on install, ${lists.lazy.length} once fetched`);
