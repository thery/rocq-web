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
var precache = [["","acee6f9e8ae81716"],["assets/index-CPaO_nO_.css","7733ca925318154f"],["assets/index-Dl5iS2E7.js","3be74f719df3e3f5"],["examples/Basics/Basics.v","34147fbb1e0aa007"],["examples/Extraction/Extraction.v","d4809c884fb03a97"],["examples/Lists/Lists.v","ca9889a31be8d5bf"],["examples/Ltac2/Ltac2.v","f1d8fe8848ba42d6"],["examples/Modules/Defs.v","3f2f51bd0aba34e2"],["examples/Modules/Proofs.v","e79d3cfcaecbc5c9"],["examples/Ssreflect/Ssreflect.v","c265d98db47cd240"],["examples/cyp-tutorial/tutorial.v","e7526092a061a636"],["examples/cyp/cyp.v","6f75d895edab9517"],["examples/cyp/markdown.v","84e8b30c575c936f"],["examples/cyp/square_lt.md","067b4baa7202f632"],["examples/cyp/square_wrong.md","ca8ad38a5b1d093b"],["examples/index.json","394f79edf22f45e2"],["examples/pbp/_RocqProject","c63f69427eb4ec62"],["examples/pbp/pbp.v","5f8d1a3e85aeeae7"],["examples/pbp/pbp_demo.v","79fb5153e305533c"],["examples/pbp/pbp_select.v","cf0b151b5cee5cba"],["examples/pbp/point_actions.v","55d368c1ffb41bce"],["examples/pbp/point_actions_more.v","cfb909f4a0e455aa"],["examples/pbp/point_actions_notations.v","26adb900dd09373f"],["examples/pbp/point_actions_show.v","75970ce48ea4de7a"],["examples/point-actions/_RocqProject","c63f69427eb4ec62"],["examples/point-actions/pbp.v","5f8d1a3e85aeeae7"],["examples/point-actions/pbp_select.v","32be530a90f06417"],["examples/point-actions/point_actions.v","4f8bfdbbec7362ad"],["examples/point-actions/point_actions_tutorial.v","4709133f9ac6f7bd"],["examples/xtext/xtext.v","ef2f0767ca3722d4"],["icons/apple-touch-icon.png","33fa421788e9e0ec"],["icons/icon-192.png","d703c80664d5dcab"],["icons/icon-512.png","5e7a7605e5b9db8e"],["icons/icon.svg","a1ac15e9be39907a"],["icons/maskable-512.png","624bf0bd450ba8ba"],["manifest.webmanifest","308c477f963c1417"],["rocq/full/files.json","6ac5da3f015bc6b6"],["rocq/full/lsp_worker.js","ddef8eba5b9d4f45"],["rocq/full/packages.json","e082e2360ecf507d"],["rocq/worker.js","a2f1b9cd387b652d"]];
var lazy = [["rocq/full/lsp_worker.wasm","8d285e9aa0efc1db"],["rocq/full/search.tsv","55c25c5a5b0afeb2"]];

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
