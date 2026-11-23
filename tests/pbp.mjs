// Proof by pointing (headless Chromium, as tests/browser.mjs): the example
// pbp opened, parts of goals selected (a Range on the goal's text), the
// Point bar's buttons, the pbp line written after the sentence.
//   CHECK=step|all CHROME=/usr/bin/google-chrome SHOTS=DIR node tests/pbp.mjs
import { launch } from "./launch.mjs";

const url = process.env.ROCQ_WEB_URL ?? "http://localhost:5173/";
const mode = process.env.CHECK ?? "step";
const shots = process.env.SHOTS;

const browser = await launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const page = await browser.newPage({ viewport: { width: 1400, height: 850 } });
page.setDefaultTimeout(60000);
await page.addInitScript((m) => localStorage.setItem("rocq-web:check", m), mode);
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
await page.goto(`${url}?example=pbp&file=pbp_demo.v`);
await page.waitForFunction(() => document.querySelector(".log")?.textContent.includes("server ready"), null, { timeout: 120000 });
// (the document opened once pbp.v and pbp_select.v are compiled)
await page.waitForFunction(() => document.querySelector(".log")?.textContent.includes("compiled pbp/pbp_select.v"), null, { timeout: 300000 });
await idle();
const original = await page.evaluate(() => window.rocqView.state.doc.toString());
const lines = original.split("\n");
const goals = page.locator('[data-testid="goals"]');

// The goals after the line [after] then [n] lines (the cursor at its end;
// step by step, checked up to there), the text as it was
async function goTo(after, n = 1) {
  await page.evaluate((t) => {
    const v = window.rocqView;
    if (v.state.doc.toString() !== t) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: t } });
  }, original);
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
  return line;
}

// Selects the [k]-th occurrence of [s] in the text of a part: the
// conclusion of goal [goal], or the type of hypothesis [hyp]
async function select(s, k, { goal = 0, hyp } = {}) {
  return page.evaluate(
    ({ s, k, goal, hyp }) => {
      const g = document.querySelector(`[data-goal="${goal}"]`);
      const part = hyp ? g.querySelector(`[data-hyp="${hyp}"]`) : g.querySelector(".concl[data-part]");
      const text = part.textContent;
      let i = -1;
      for (let j = 0; j <= k; j++) i = text.indexOf(s, i + 1);
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
      return text;
    },
    { s, k, goal, hyp },
  );
}

const click = async (label) => {
  await page.locator(".point-bar button", { hasText: new RegExp(`^${label}$`) }).click();
};
// The line written after line [line], or the error of the Point bar
async function written(line) {
  for (let i = 0; i < 100; i++) {
    const now = await page.evaluate(() => window.rocqView.state.doc.toString());
    if (now !== original) return now.split("\n")[line + 1];
    const error = await page.locator(".point-bar .error").textContent().catch(() => null);
    if (error) return `error: ${error}`;
    await page.waitForTimeout(200);
  }
  return "nothing";
}
const shot = async (name) => shots && (await page.screenshot({ path: `${shots}/${mode}-${name}.png` }));

const cases = [
  { name: "first a", at: "Lemma add_comm", sel: [["a", 0]], line: "pbp [X in X + _ = _]." },
  { name: "last a", at: "Lemma add_comm", sel: [["a", 1]], line: "pbp [X in _ = _ + X]." },
  { name: "widened", at: "Lemma add_comm", sel: [["+ b", 0]], line: "pbp [X in X = _].", log: "widened to a + b" },
  { name: "last A", at: "Lemma and_swap", sel: [["A", 1]], line: "pbp [X in _ -> _ /\\ X].", proves: true },
  { name: "hypothesis", at: "Lemma modus_ponens", sel: [["B", 0, { hyp: "ab" }]], line: /^move: ab; pbp \[X in .*\]\.$/ },
  {
    name: "linking",
    at: "Lemma modus_ponens",
    sel: [["B", 0, { hyp: "ab" }], ["B", 0]],
    line: "move: ab; pbp [X Y in (_ -> X) -> Y].",
    proves: true,
  },
  {
    name: "linking, conclusion first",
    at: "Lemma modus_ponens",
    sel: [["B", 0], ["B", 0, { hyp: "ab" }]],
    line: "move: ab; pbp [X Y in (_ -> X) -> Y].",
  },
  { name: "linking, conclusion", at: "Lemma test_pbp1", sel: [["A", 0], ["A", 1]], line: "pbp [X Y in X /\\ _ -> Y /\\ _]." },
  { name: "second goal", at: "Lemma and_proj", n: 2, sel: [["B", 1, { goal: 1 }]], line: "2: pbp [X in _ -> X]." },
  { name: "nested", at: "Lemma add_comm", sel: [["a + b", 0], ["a", 0]], line: /^error: the two selections/ },
];
// Selects the parts of [c.sel] (Link… between two), clicks Point or Link
async function point(c) {
  for (const [i, [s, k, o]] of c.sel.entries()) {
    await select(s, k, o);
    await page.waitForSelector(".point-bar button");
    if (c.name === "first a") await shot("point-bar");
    if (i < c.sel.length - 1) {
      await click("Link…");
      if (c.name === "linking") await shot("link-first");
    }
  }
  if (c.name === "linking") await shot("link-second");
  await click(c.sel.length === 2 ? "Link" : "Point");
}

for (const c of process.env.ONLY === "checked" ? [] : cases) {
  const line = await goTo(c.at, c.n);
  await point(c);
  const got = await written(line);
  check(typeof c.line === "string" ? got === c.line : c.line.test(got), `${c.name}: ${JSON.stringify(got)}`);
  if (c.log) check((await page.textContent(".log")).includes(c.log), `${c.name}: "${c.log}" in the log`);
  if (c.name === "linking") await shot("link-written");
  if (c.name === "nested") await shot("error");
  if (c.proves) {
    // the line checked: no error
    await page.keyboard.press("Alt+ArrowDown");
    await idle();
    await page.waitForTimeout(1500);
    const errors = await page.locator(".problems li").allTextContents();
    check(errors.length === 0, `${c.name}: checked ${errors.join(" | ")}`);
    if (c.name === "last A") await shot("checked");
  }
}
// "check": the line written is checked at once (step by step, the
// checking moved past it; else the cursor after it)
const concl = () => goals.locator(".concl").first().textContent().catch(() => null);
const problem = async () =>
  mode === "step"
    ? await page.locator('[data-testid="stopped"]').textContent().catch(() => null)
    : (await page.locator(".problems li").allTextContents()).join(" | ") || null;
// The goals once they change from [before], or a problem
async function after(before) {
  for (let i = 0; i < 150; i++) {
    const p = await problem();
    if (p) return { problem: p };
    const now = await goals.textContent();
    if (now !== before && !/Nothing checked|Not in a proof/.test(now)) return { goals: now, concl: await concl() };
    await page.waitForTimeout(200);
  }
  return {};
}
const checked = [
  { name: "Point, checked", at: "Lemma and_swap", sel: [["A", 1]] },
  { name: "Link, checked", at: "Lemma modus_ponens", sel: [["B", 0, { hyp: "ab" }], ["B", 0]], concl: "A" },
  { name: "failing line, checked", at: "Lemma add_comm", sel: [["a", 0]], fails: true },
];
for (const c of checked) {
  const line = await goTo(c.at);
  await select(...c.sel[0]);
  await page.waitForSelector(".point-bar input");
  if (!(await page.locator(".point-bar input").isChecked())) await page.locator(".point-bar input").check();
  const before = await goals.textContent();
  await point(c);
  const got = await written(line);
  const r = await after(before);
  if (c.fails) check(!!r.problem, `${c.name}: ${got}, stopped: ${r.problem}`);
  else if (c.concl) check(!r.problem && r.concl?.trim() === c.concl, `${c.name}: ${got}, ${JSON.stringify(r)}`);
  else {
    check(!r.problem && r.concl, `${c.name}: ${got}, then ${JSON.stringify(r.concl)}`);
    // pointing again, at the new goal (A, with pbp : A /\ B): linking the
    // two A, its line written after the first
    await shot("checked-once");
    await point({ sel: [["A", 0, { hyp: "pbp" }], ["A", 0]] });
    await page.waitForFunction((l) => window.rocqView.state.doc.line(l + 3).text.includes("pbp"), line, { timeout: 30000 }).catch(() => {});
    const again = await after(r.goals);
    const now = (await page.evaluate(() => window.rocqView.state.doc.toString())).split("\n");
    check(/pbp/.test(now[line + 2]) && (again.concl !== r.concl || again.problem), `pointing again: ${JSON.stringify(now[line + 2])}, then ${JSON.stringify(again)}`);
    await shot("checked-twice");
  }
  if (c.fails) await shot("checked-error");
}
await browser.close();
console.log(`${failed} failed (${mode})`);
process.exit(failed ? 1 : 0);
