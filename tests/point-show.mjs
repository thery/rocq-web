// Proof by pointing, actions of kind show (headless Chromium, as
// tests/pbp.mjs): the example pbp opened, its pbp_demo.v followed by a
// scratch part that declares its own actions with templates (Echo: {text},
// Twice: {text} on two lines, Head: {head}), the text of a show action
// shown in the bar (lines kept, selectable), nothing written in the
// document, closed by Escape, ✕, a new selection, new goals; not offered
// during a link; its errors in the bar, its widening warning in the log.
// If the point_actions.v of the example does not know the kind show yet,
// the actions are declared of kind point and the page's list of actions
// says show for them (MOCK in the output): the rest is real (point_run
// runs, its text is the one shown).
// EXAMPLE=pbp-paths (the example pbp-paths, where it exists: by paths).
//   ROCQ_WEB_URL=http://localhost:5173/ CHROME=/usr/bin/google-chrome node tests/point-show.mjs
import { launch } from "./launch.mjs";

const url = process.env.ROCQ_WEB_URL ?? "http://localhost:5173/";
const mode = process.env.CHECK ?? "step";
const shots = process.env.SHOTS;
const scratch = ["Echo", "Twice", "Head"];
const example = process.env.EXAMPLE ?? "pbp";
const [file, compiled] = example === "pbp-paths" ? ["pbp_paths_demo.v", "point_actions_more.v"] : ["pbp_demo.v", "point_actions.v"];

const actionsFile = await (await fetch(new URL(`examples/${example}/point_actions.v`, url))).text();
const supported = /point-kind-name show /.test(actionsFile);
const kind = supported ? "show" : "point";
console.log(supported ? "the kind show is known by point_actions.v" : "MOCK: point_actions.v does not know the kind show: declared as point, listed as show");

const browser = await launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const page = await browser.newPage({ viewport: { width: 1400, height: 850 } });
page.setDefaultTimeout(60000);
await page.addInitScript((m) => localStorage.setItem("rocq-web:check", m), mode);
if (!supported) {
  // (the list of the actions: the scratch ones of kind show)
  await page.addInitScript((names) => {
    const parse = JSON.parse;
    JSON.parse = (...a) => {
      const v = parse(...a);
      if (Array.isArray(v)) for (const x of v) if (x && names.includes(x.name) && x.kind === "point") x.kind = "show";
      return v;
    };
  }, scratch);
}
page.on("pageerror", (e) => console.log(`[pageerror] ${e.message}`));
let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failed++;
};
const idle = async () => {
  await page.waitForTimeout(500);
  await page.waitForSelector('.status[data-status="Idle"]', { timeout: 300000 });
};
await page.goto(`${url}?example=${example}&file=${file}`);
await page.waitForFunction(() => document.querySelector(".log")?.textContent.includes("server ready"), null, { timeout: 120000 });
await page.waitForFunction((m) => document.querySelector(".log")?.textContent.includes(m), `compiled ${example}/${compiled}`, { timeout: 600000 });
await idle();
const original = await page.evaluate(() => window.rocqView.state.doc.toString());
const text = `${original.trimEnd()}

(* Scratch: actions of kind ${kind} declared here *)
PointAction "Echo" ${kind} "{text}" "show the selection".
PointAction "Twice" ${kind} "{text}
{text}" "show the selection twice".
PointAction "Head" ${kind} "{head}" "show the head constant".

Lemma echo (a : nat) : 1 + 1 + a = double (1 + a).
Proof.
Abort.

Lemma echo2 (a : nat) : a = a.
Proof.
Abort.
`;
const lines = text.split("\n");

// The goals after the line that starts with [after] then [n] lines (the
// cursor at its end; step by step, checked up to there)
async function goTo(after, n = 1) {
  await page.evaluate((t) => {
    const v = window.rocqView;
    if (v.state.doc.toString() !== t) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: t } });
  }, text);
  const line = lines.findIndex((l) => l.startsWith(after)) + n;
  await page.evaluate((line) => {
    const v = window.rocqView;
    const l = v.state.doc.line(line + 1);
    v.dispatch({ selection: { anchor: l.to } });
    v.focus();
  }, line);
  await page.keyboard.press("Alt+ArrowRight");
  await idle();
  await page.waitForTimeout(800);
}

// Selects the [k]-th occurrence of [s] in the conclusion of the first goal
async function select(s, k = 0) {
  await page.evaluate(
    ({ s, k }) => {
      const part = document.querySelector('[data-goal="0"] .concl[data-part]');
      const t = part.textContent;
      let i = -1;
      for (let j = 0; j <= k; j++) i = t.indexOf(s, i + 1);
      const at = (o) => {
        const w = document.createTreeWalker(part, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          if (o <= n.data.length) return [n, o];
          o -= n.data.length;
        }
      };
      const r = document.createRange();
      r.setStart(...at(i));
      r.setEnd(...at(i + s.length));
      const sel = document.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
    },
    { s, k },
  );
  await page.waitForSelector(".point-bar");
}
const textNow = async (l) => ((await l.count()) ? l.first().textContent() : null);
async function buttons() {
  await page.waitForFunction(() => !document.querySelector(".point-bar")?.textContent.startsWith("…"), null, { timeout: 30000 }).catch(() => {});
  return page.locator(".point-bar button").allTextContents();
}
const click = (label) => page.locator(".point-bar button", { hasText: new RegExp(`^${label}$`) }).click();
const shown = () => textNow(page.locator('[data-testid="point-shown"] pre'));
// The text shown once it is there, or the error of the bar
async function result() {
  for (let i = 0; i < 150; i++) {
    const t = await shown();
    if (t !== null) return t;
    const e = await textNow(page.locator(".point-bar .error"));
    if (e) return `error: ${e}`;
    await page.waitForTimeout(200);
  }
  return "nothing";
}
const unchanged = async () => (await page.evaluate(() => window.rocqView.state.doc.toString())) === text;
const shot = async (name) => shots && (await page.screenshot({ path: `${shots}/show-${name}.png` }));

await goTo("Lemma echo (a");
await select("1 + 1");
const all = await buttons();
check(scratch.every((n) => all.includes(n)) && all.includes("Point") && all.includes("Link…"), `the bar: ${JSON.stringify(all)}`);
check((await page.locator(".point-bar input[type=checkbox]").count()) === 1, "the check box (point actions there too)");
check((await page.locator(".point-bar button", { hasText: /^Echo$/ }).getAttribute("title")) === "show the selection", "Echo's tooltip");
// (the check box ticked: no matter for a show action)
if (!(await page.locator(".point-bar input[type=checkbox]").isChecked())) await page.locator(".point-bar input[type=checkbox]").click();

await click("Echo");
check((await result()) === "1 + 1", `Echo on 1 + 1: ${JSON.stringify(await shown())}`);
await page.waitForTimeout(1000);
check(await unchanged(), "Echo: nothing written");
check((await page.evaluate(() => document.getSelection().toString())) === "1 + 1", "the selection kept");
check(
  (await page.locator('[data-testid="point-shown"] pre').evaluate((e) => getComputedStyle(e).fontFamily)).includes("monospace"),
  "monospace",
);
await shot("echo");
// a drag in the text: selected there, the text stays
{
  const b = await page.locator('[data-testid="point-shown"] pre').boundingBox();
  await page.mouse.move(b.x + 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width - 2, b.y + b.height / 2);
  await page.mouse.up();
  await page.waitForTimeout(300);
  const sel = await page.evaluate(() => {
    const s = document.getSelection();
    return { text: s.toString(), inBar: !!s.anchorNode && !!document.querySelector(".point-bar")?.contains(s.anchorNode) };
  });
  check(sel.inBar && sel.text.length > 0, `a drag in the text selects it: ${JSON.stringify(sel)}`);
  check((await shown()) === "1 + 1", "a drag in the text: still shown");
}
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
check((await shown()) === null, "Escape: closed");

await select("1 + 1");
await click("Twice");
check((await result()) === "1 + 1\n1 + 1", `Twice: two lines: ${JSON.stringify(await shown())}`);
await shot("twice");
await page.locator('[data-testid="point-shown"] button[aria-label="Close"]').click();
await page.waitForTimeout(300);
check((await shown()) === null, "✕: closed");

await click("Echo");
await result();
await select("double (1 + a)");
await page.waitForTimeout(300);
check((await shown()) === null, "a new selection: closed");
await click("Echo");
check((await result()) === "double (1 + a)", `Echo on double (1 + a): ${JSON.stringify(await shown())}`);
await click("Head");
check((await result()) === "double", `Head on double (1 + a): ${JSON.stringify(await shown())}`);

// widened: the warning in the log, the text of the subterm
await select("+ 1");
await click("Echo");
const widened = await result();
check(widened === "1 + 1", `Echo on "+ 1" (widened): ${JSON.stringify(widened)}`);
if (example === "pbp-paths") {
  // (by paths: the subterm around the selection, no widening)
  const last = await page.evaluate(() => window.rocqWebPoint?.());
  check(/^elpi point_run_path "Echo" "[0-9.]*"\.$/.test(last), `by its path: ${last}`);
} else check((await page.textContent(".log")).includes("widened to 1 + 1"), "the widening warning in the log");

// an error: in the bar, no text
await select("a", 0);
await click("Head");
const err = await result();
check(err.startsWith("error: ") && (await shown()) === null, `Head on a: ${JSON.stringify(err)}`);
await shot("error");
check(await unchanged(), "nothing written by the show actions");

// new goals: closed
await select("1 + 1");
await click("Echo");
await result();
await goTo("Lemma echo2");
check((await shown()) === null, "new goals: closed");

// during a link: no show action
await goTo("Lemma echo (a");
await select("1 + 1");
await buttons();
await click("Link…");
await select("double (1 + a)");
const during = (await page.locator(".point-bar button").allTextContents()).filter((b) => b !== "✕");
check(JSON.stringify(during) === '["Link"]', `during a link: ${JSON.stringify(during)}`);
await page.keyboard.press("Escape");

// a point action still writes its line
await select("1 + 1");
await buttons();
await click("Point");
for (let i = 0; i < 100 && (await unchanged()); i++) await page.waitForTimeout(200);
const now = (await page.evaluate(() => window.rocqView.state.doc.toString())).split("\n");
check(now[lines.findIndex((l) => l.startsWith("Lemma echo (a")) + 2] === "pbp [X in X + _ = _].", "Point still writes its line");

await browser.close();
console.log(`${failed} failed (${mode}${supported ? "" : ", MOCK kind"})`);
process.exit(failed ? 1 : 0);
