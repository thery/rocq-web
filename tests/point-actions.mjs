// The point-actions example (point_actions_tutorial.v): the whole tutorial is
// checked with no error in the page, and the first click of its section 0
// writes its line.
//   ROCQ_WEB_URL=http://localhost:5173/ CHROME=/usr/bin/google-chrome node tests/point-actions.mjs
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
await page.goto(`${url}?example=point-actions&file=point_actions_tutorial.v`);
await page.waitForFunction(() => document.querySelector(".log")?.textContent.includes("server ready"), null, { timeout: 120000 });
// (the document opened once pbp.v and pbp_select.v are compiled)
await page.waitForFunction(() => document.querySelector(".log")?.textContent.includes("compiled point-actions/point_actions.v"), null, { timeout: 300000 });
await idle();
const original = await page.evaluate(() => window.rocqView.state.doc.toString());
const lines = original.split("\n");
const goals = page.locator('[data-testid="goals"]');

// The goals after the line [after] then [n] lines (the cursor at its end;
// step by step, checked up to there), the text as it was (or [text])
async function goTo(after, n = 1, text = original) {
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

// The text of [l] now, null if it is not there (textContent would wait
// for it)
const textNow = async (l) => ((await l.count()) ? l.first().textContent() : null);
// The labels of the bar's buttons (once the actions are there)
async function buttons() {
  await page.waitForFunction(() => !document.querySelector(".point-bar")?.textContent.startsWith("…"), null, { timeout: 30000 }).catch(() => {});
  return page.locator(".point-bar button").allTextContents();
}
const click = async (label) => {
  await page.locator(".point-bar button", { hasText: new RegExp(`^${label}$`) }).click();
};
// The line written after line [line], or the error of the Point bar
async function written(line) {
  for (let i = 0; i < 100; i++) {
    const now = await page.evaluate(() => window.rocqView.state.doc.toString());
    if (now !== original) return now.split("\n")[line + 1];
    const error = await textNow(page.locator(".point-bar .error"));
    if (error) return `error: ${error}`;
    await page.waitForTimeout(200);
  }
  return "nothing";
}
const shot = async (name) => shots && (await page.screenshot({ path: `${shots}/${mode}-${name}.png` }));

// smoke test of the point-actions example: the whole tutorial is checked
// with no error, and the first click of section 0 writes its line
{
  const n = original.split("\n").length;
  await page.evaluate((line) => {
    const v = window.rocqView; v.dispatch({ selection: { anchor: v.state.doc.length } }); v.focus();
  });
  await page.keyboard.press("Alt+ArrowRight");
  await idle();
  await page.waitForTimeout(1500);
  const errs = await page.locator(".cm-lintRange-error").count();
  check(errs === 0, `the whole tutorial checked with no error (${errs} error marks)`);
  const line = await goTo("Lemma pointing_yourself", 2);
  await select("B", 0);
  await page.waitForSelector(".point-bar");
  const got = await buttons();
  check(got.includes("Point") && got.includes("Simplify here"), `the bar in section 0: ${JSON.stringify(got)}`);
  await click("Point");
  const w = await written(line);
  check(w === "pbp [X in X /\\ _].", `Point writes ${JSON.stringify(w)}`);
}
await browser.close();
console.log(`${failed} failed (smoke)`);
process.exit(failed ? 1 : 0);
