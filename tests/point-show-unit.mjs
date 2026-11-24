// Proof by pointing, actions of kind show: the pure part (app/src/lib/
// pointActions.ts, no browser, no Rocq). Node >= 23.6 (it strips the types).
//   node tests/point-show-unit.mjs
import { parseActions, pointLine, shownText } from "../app/src/lib/pointActions.ts";

let failed = 0;
const check = (what, got, expected) => {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  console.log(`${ok ? "ok  " : "FAIL"} ${what}: ${JSON.stringify(got)}${ok ? "" : ` expected ${JSON.stringify(expected)}`}`);
  if (!ok) failed++;
};

check(
  "the list with an action of kind show",
  parseActions('[{"name":"Point","kind":"point","doc":"pbp"},{"name":"Link","kind":"link","doc":""},{"name":"Type of","kind":"show","doc":"the type of the selection"}]'),
  [
    { name: "Point", kind: "point", doc: "pbp" },
    { name: "Link", kind: "link", doc: "" },
    { name: "Type of", kind: "show", doc: "the type of the selection" },
  ],
);
check("a show action without doc", parseActions('[{"name":"Echo","kind":"show"}]'), [{ name: "Echo", kind: "show", doc: "" }]);
check("another kind: left out", parseActions('[{"name":"P","kind":"pointing"},{"name":"E","kind":"show","doc":"d"}]'), [{ name: "E", kind: "show", doc: "d" }]);
check("not a list", parseActions('{"name":"P"}'), null);
check("not JSON", parseActions("pbp [X in X]."), null);
// what point_run prints: a line (written), a text (shown, lines kept)
check("the line of a point action", pointLine("  pbp [X in X]. \n"), "pbp [X in X].");
check("the text of a show action: its lines kept", shownText("\nn + 0\n     : nat\n"), "n + 0\n     : nat");
check("the text of a show action: its indentation kept", shownText("  x"), "  x");
console.log(failed ? `${failed} FAILED` : "all ok");
process.exit(failed ? 1 : 0);
