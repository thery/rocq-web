import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { examples, loadExample } from "./lib/examples";
import { openShared } from "./lib/share";
import { pickBuild } from "./lib/detect";
import { setActiveFile, temporary } from "./lib/storage";
import { registerServiceWorker } from "./lib/update";
import { setLibraries } from "./lib/workspaces";
import "./styles.css";

// the service worker: the page offline, its new versions, cross-origin
// isolation on hosts without headers
registerServiceWorker();

// iOS zooms in on a field focused whose text is smaller than 16px (the
// editor's, on a phone): not with maximum-scale, which on iOS does not stop
// the zoom of the fingers
if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
  const meta = document.querySelector('meta[name="viewport"]');
  meta?.setAttribute("content", `${meta.getAttribute("content")}, maximum-scale=1`);
}

// The example opened on a first visit: this fork's demo of xtext (not for
// a link that brings its own files: ?example, ?open, ?lib, #share, #files,
// nor in a temporary or embedded session)
const firstExample = "xtext";

// [firstVisit()]: true until an example has been opened in this browser
// (its storage remembers it, visited() records it once the example is
// loaded, so that a reload of the page before that, for cross-origin
// isolation, does not skip it; without storage, every visit is a first one)
function firstVisit(params: URLSearchParams) {
  if (temporary || params.has("open") || params.has("lib") || /^#(share|files)=/.test(location.hash)) return false;
  try {
    return !localStorage.getItem("rocq-web:visited");
  } catch {
    return true;
  }
}
function visited() {
  try {
    localStorage.setItem("rocq-web:visited", "1");
  } catch {}
}

// An example of a link (?example=ID, its file ?file=NAME active), or on a
// first visit firstExample
async function openExample() {
  const params = new URLSearchParams(location.search);
  const id = params.get("example") ?? (firstVisit(params) ? firstExample : null);
  if (!id) return;
  const e = (await examples()).find((e) => e.id === id);
  if (!e) return;
  const paths = await loadExample(e);
  if (!temporary) visited();
  const file = params.get("file");
  setActiveFile(paths.find((p) => p.endsWith(`/${file}`)) ?? paths[0]);
  if (!temporary) {
    params.delete("example");
    params.delete("file");
    history.replaceState(null, "", location.pathname + (params.size ? `?${params}` : "") + location.hash);
  }
}

// The names of the libraries, which the workspaces' must not hide
async function libraries() {
  const r = await fetch(`${import.meta.env.BASE_URL}rocq/${pickBuild()}/packages.json`);
  const packages: { modules: string[] }[] = await r.json();
  setLibraries(packages.flatMap((p) => p.modules.map((m) => m.split(".")[0])));
}

// the files shared by a link (#share=..., #files=...) first
Promise.all([
  libraries().catch(() => {}),
  openExample().catch(() => {}),
  openShared(),
]).finally(() =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
);
