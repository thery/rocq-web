// The site's service worker (scripts/sw.mjs writes DIR/sw.js from it, with
// its lists).
//
// - The page, its scripts, the examples and the small files of Rocq's
//   builds (rocq/worker.js, lsp_worker.js, files.json, packages.json) are
//   fetched on install and served from the cache: the page works offline,
//   with the version it started with. A new version waits until the page
//   asks for it (the header's New version button, app/src/lib/update.ts),
//   then the page reloads with it.
// - lsp_worker.wasm and search.tsv, when served by the site (not on
//   Cloudflare, where the big files are in R2), are kept once fetched.
// - Rocq's libraries, fetched with their version (?v=), and the files on R2
//   are left to the browser's cache, which keeps them for good.
// - On hosts that cannot set headers (GitHub Pages), it adds COOP and COEP
//   to the page and its workers, so that they are cross-origin isolated
//   (the interrupts of Rocq need it), from the next load of the page.
//
// Each file is cached under its path and its revision (a hash of its
// contents), so that a version waiting does not touch the files of the one
// in use, and files that did not change are not fetched again.

// [path, revision], the page's path ""
var precache = [];
var lazy = [];

var CACHE = "rocq-web";
var scope = new URL("./", self.location.href);
var revisions = new Map(precache.concat(lazy));
var kept = new Set(lazy.map(function (e) { return e[0]; }));
var key = function (path, revision) { return scope.href + path + "?rocq-web-revision=" + revision; };

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(
        precache.map(function (entry) {
          var k = key(entry[0], entry[1]);
          return cache.match(k).then(function (hit) {
            if (hit) return;
            return fetch(scope.href + entry[0], { cache: "no-cache" }).then(function (res) {
              if (!res.ok) throw new Error(entry[0] + ": " + res.status);
              return cache.put(k, clean(res));
            });
          });
        }),
      );
    }),
  );
});

// the files of the other versions removed
self.addEventListener("activate", function (e) {
  var current = new Set(precache.concat(lazy).map(function (entry) { return key(entry[0], entry[1]); }));
  e.waitUntil(
    caches
      .open(CACHE)
      .then(function (cache) {
        return cache.keys().then(function (requests) {
          return Promise.all(requests.map(function (r) { return current.has(r.url) || cache.delete(r); }));
        });
      })
      .then(function () { return self.clients.claim(); }),
  );
});

self.addEventListener("message", function (e) {
  if (e.data === "skip-waiting") self.skipWaiting();
});

// A response after a redirect (Cloudflare Pages: /index.html to /) cannot
// answer a navigation
function clean(res) {
  if (!res.redirected) return res;
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

// COOP and COEP when the server sent none
function isolated(res) {
  if (res.status === 0 || res.headers.has("Cross-Origin-Embedder-Policy")) return res;
  var headers = new Headers(res.headers);
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: headers });
}

function cached(path, revision) {
  return caches.open(CACHE).then(function (cache) {
    var k = key(path, revision);
    return cache.match(k).then(function (hit) {
      return (
        hit ||
        fetch(scope.href + path).then(function (res) {
          res = clean(res);
          if (res.ok && kept.has(path)) return cache.put(k, res.clone()).then(function () { return res; });
          return res;
        })
      );
    });
  });
}

self.addEventListener("fetch", function (e) {
  var r = e.request;
  if (r.method !== "GET" || !r.url.startsWith(scope.href)) return;
  var path = new URL(r.url).pathname.slice(scope.pathname.length);
  // the page, whatever its query (?example=, #share=...)
  if (r.mode === "navigate" && path === "index.html") path = "";
  // (the files cached have no version in their URL, rocq/worker.js a ?build=)
  var revision = revisions.get(path);
  if (revision) e.respondWith(cached(path, revision).then(isolated));
  else if (["document", "iframe", "worker", "sharedworker"].indexOf(r.destination) >= 0)
    e.respondWith(fetch(r).then(isolated));
});
