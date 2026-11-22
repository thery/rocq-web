// The service worker (app/sw.js, written into the site by scripts/sw.mjs):
// registered in the built site, it keeps the page and its files for the
// next visits and offline. A new version waits until the user takes it (the
// header's button, UpdateBadge), then the page reloads with it.
import { useSyncExternalStore } from "react";

// How often an open page looks for a new version (also at each load)
const CHECK_EVERY = 60 * 60 * 1000;

let waiting: ServiceWorker | null = null;
let reloading = false;
const listeners = new Set<() => void>();
const ready = (w: ServiceWorker) => {
  waiting = w;
  for (const l of listeners) l();
};

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  const sw = navigator.serviceWorker;
  sw.addEventListener("controllerchange", () => reloading && location.reload());
  sw.register(`${import.meta.env.BASE_URL}sw.js`).then((r) => {
    // a version installed while another is in use
    const track = (w: ServiceWorker) => {
      if (w.state === "installed" && sw.controller) {
        // the former service worker (coi.js), which kept no files
        if (sw.controller.scriptURL.endsWith("/coi.js")) w.postMessage("skip-waiting");
        else ready(w);
      }
    };
    if (r.waiting) track(r.waiting);
    r.addEventListener("updatefound", () => {
      const w = r.installing;
      w?.addEventListener("statechange", () => track(w));
    });
    setInterval(() => r.update().catch(() => {}), CHECK_EVERY);
  });
  // Not cross-origin isolated (a host without COOP and COEP headers): the
  // service worker adds them, from the next load of the page. Not in an
  // iframe, which only the page around it can make isolated
  if (!crossOriginIsolated && window === window.top)
    sw.ready.then(() => {
      if (!sessionStorage.getItem("rocq-web:coi")) {
        sessionStorage.setItem("rocq-web:coi", "1");
        location.reload();
      }
    });
}

// A new version is ready
export const useUpdate = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => waiting !== null,
  );

// The page again, with the new version
export function update() {
  if (!waiting) return;
  reloading = true;
  waiting.postMessage("skip-waiting");
}
