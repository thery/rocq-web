# This fork

[rocq-web](https://github.com/rboudrouss/rocq-web) with the proof-text
tools xtext and cyp of [thery/coq_tmp](https://github.com/thery/coq_tmp),
written in Rocq-Elpi. The branch `elpi-files` is upstream's `main` plus:

- itauto (`From Cdcl Require Import Itauto`, which cyp uses): its plugin
  is built after itauto's own `make`, which extracts `src/proverPatch.ml`,
  and `patches/itauto-rocq-9.2.patch` makes its release 9.1.0 build with
  Rocq 9.2;
- the opam package `rocq-xtext-cyp`, the libraries of xtext and cyp,
  installed in the switch by `scripts/demo-libs.sh`;
- the examples `xtext` and `cyp`, first in the Examples panel; a first
  visit opens `xtext`;
- the example `cyp-tutorial`: coq_tmp's cyp tutorial in one file,
  `tutorial.v`, to step through (installed by coq_tmp's
  `cyp/tutorial/rocq-web.sh`, below);
- proof by pointing: select a part of a goal, the bar shows the pointing
  actions declared in Rocq (Point, Link…, Simplify here, Unfold here, Name occurrence,
  those a file declares), a click writes the line in the script (example
  `pbp`, section below);
- Mathematical Components 2.6.0 (boot, order, ssreflect, finite-group,
  fingroup, algebra) on Hierarchy Builder's master, and its example
  Mathematical Components; without upstream's example Equations: the
  switch does not have the library.

## The switch

As in [building.md](building.md) (ocaml-emcc a47c6e6 or later: it exports
the C maths functions that micromega and Elpi's float builtins call), plus:

```sh
opam pin add -n rocq-core 9.2.0
opam pin add -n dune 3.23.1                   # 3.24 dropped dune's coq extension
opam repo add --this-switch rocq-released https://rocq-prover.org/opam/released
opam install rocq-elpi.3.7.0                  # with elpi 4.1.1: coq.parse.argument,
                                              # coq.ltac.name-uvar (xtext and cyp)
# itauto's release 9.1.0 and patches/itauto-rocq-9.2.patch: Rocq 9.2's API
# (Evd.add_constraints, PolyFlags), `Set Itauto Classic` finding
# Stdlib.Logic.Classical_Prop, the opam bounds (itauto's master follows
# Rocq's development version, past 9.2)
curl -L https://gitlab.inria.fr/fbesson/itauto/-/archive/9.1.0/itauto-9.1.0.tar.gz | tar xz
cd itauto-9.1.0 && patch -p1 < ../rocq-web/patches/itauto-rocq-9.2.patch
opam pin add -k path coq-itauto .
# Hierarchy Builder's master: its release 1.10.3 does not build with
# Elpi 4.1 (math-comp/hierarchy-builder#608, fixed by #605); pinned until
# a release contains #605
opam pin add -n rocq-hierarchy-builder.1.10.3+f32130a \
  git+https://github.com/math-comp/hierarchy-builder.git#f32130a
# mathcomp-algebra 2.6.0 needs rocq-micromega-plugin (micromega_plugin)
opam install -j4 rocq-hierarchy-builder rocq-micromega-plugin.1.1.1 \
  rocq-mathcomp-ssreflect.2.6.0 rocq-mathcomp-fingroup.2.6.0 \
  rocq-mathcomp-algebra.2.6.0                 # about 16 min with -j4
```

## The xtext and cyp libraries

```sh
eval "$(make -s SWITCH=rocq-web env)"
sh scripts/demo-libs.sh [~/git/coq_tmp [COMMIT]]   # main by default, a few seconds
node scripts/assets.mjs full out/full/web && node scripts/dist.mjs
```

`scripts/demo-libs.sh` copies the files the libraries need from a commit
of coq_tmp into `_src/demo-libs/`, with `demo-libs/Makefile` and
`demo-libs/rocq-xtext-cyp.opam` (version: the commit's date and hash), and
pins the package there. `scripts/assets.mjs` then ships it like any other
package, `.elpi` files included. Its logical names are those of coq_tmp:

| name | folder of coq_tmp | installed |
|------|-------------------|-----------|
| `ProofText` | `prooftext/` | `Tactics.vo` and the `.elpi` files xtext and cyp share |
| `Lexicon` | `lexicon/` | the vocabulary of each language, `.elpi` files |
| `XText` | `xtext/` | `ExtractText.vo` (`ExtractText`, `ExtractText_partial`) and `elpi/` |
| `CypV` | `cyp/vernac/` | `Gaps.vo`, `Cyp.vo` (`Cyp Lemma`, `Cyp File`, `CypFile`) and `elpi/` |

The examples follow coq_tmp's main at commit 65a1f30 (package version
2026.11.23+65a1f30), with rocq-elpi 3.7.0 and Elpi 4.1.1. Its
`Tactics.v` has the command `CypJustification` (a word of the proofs
declared to mean a tactic), which the tutorial uses. When coq_tmp changes, rerun
`scripts/demo-libs.sh`, check that its list of files and
`demo-libs/Makefile` still match what `ExtractText.v` and `Cyp.v` load
(`From ... Extra Dependency`), and that each example compiles under node:
`node out/full/rocq_web.js compile f.v`.

## The cyp tutorial

```sh
sh ~/git/coq_tmp/cyp/tutorial/rocq-web.sh app/public/examples
```

copies coq_tmp's `cyp/tutorial/tutorial.v` (the whole tutorial, chapter
by chapter, in one Rocq file) to `app/public/examples/cyp-tutorial/` and
adds its entry to `index.json`, after `cyp`. The page opens it with
`?example=cyp-tutorial&file=tutorial.v`. Some of its proofs are wrong on
purpose (the chapter on errors): cyp marks their nodes ❌ in the messages,
but the file has no Rocq error. Under node, its output is coq_tmp's
`cyp/tutorial/expected/rocq/tutorial.out`.

## Proof by pointing

An experiment with `pbp.v`, `pbp_select.v` and `point_actions.v` of
coq_tmp (see its README, sections "pbp: proof by pointing" and "Pointing
actions: the protocol for the interfaces"). In the goals panel, select a
part of a focused goal with the mouse, in its conclusion or in the type
of a hypothesis: a small bar appears under the selection, with one
button per pointing action.

The page knows no action: they are declared in Rocq, and the bar shows
those loaded at the sentence the goals are shown for.

- **The list.** Once a part is selected, the page runs `elpi
  point_actions.` after that sentence, as a query (the document is
  unchanged), and keeps the list it prints (a JSON array of `name`,
  `kind`, `doc`) for these goals: it is asked again only when the goals
  shown change. A button per action, in the order of their
  declarations, its `doc` as tooltip. When the query fails (the file does
  not load `point_actions`), the bar says so quietly, without buttons.
- **An action of kind `point`** (`Point`, `Simplify here`, `Unfold
  here`): its button runs `elpi point_run "Name" S E.` (`H S E` for
  hypothesis `H`; `N: ...` for goal `N`). `S E` count the characters that
  are not blanks of the part's text, so the panel's line breaks do not
  matter. The line it prints (`pbp [X in X + _ = _].`) is written after
  that sentence: on a new line indented as it when nothing follows it on
  its line, else after it on the same line; the cursor goes to its end.
  Step by step, Alt+↓ then checks it.
- **An action of kind `link`** (`Link`): its button is `Name…`; it keeps
  the part (highlighted); select the second part and click `Name`:
  `elpi point_run "Name" S E S' E'` (or `H S E S' E'`, `S E H S' E'`,
  `H S E H' S' E'`), the parts in the order they were selected (the first
  is `X` of the pattern, the second `Y`). Escape or ✕ forgets the first.
- **An action of kind `show`** (once coq_tmp's point_actions.v has it:
  `Type of`, `Normal form`, ...): run as one of kind point, but nothing
  is written: the text it prints is shown in the bar (monospace, all its
  lines, it can be selected and copied) until ✕, Escape, another
  selection or new goals. It takes one part: it is not offered while a
  link waits for its second part; **check** does not apply to it.
- The widened warning (`pbp-widened`) and the errors go to the Log panel;
  an error is also shown in the bar (the text after `point_run: `).
- **check** (a box in the bar, off by default, remembered in the
  browser): the line written is checked at once. Step by step, the
  checking goes to its end (as Alt+→ there), so the goals shown are those
  after it and one can point again; a line that fails stops the checking
  before it, its error shown as usual. When checking as you type, the
  cursor is put after the line in any case, so the goals shown are
  already those after it.

### Declaring an action

Any file can add buttons, after `From coq_tmp Require Import
point_actions.`, with a template:

```
PointAction "Name it" point "set x := ({text})." "name the selected subterm".
```

The kind is `point` (one part), `link` (two) or `show` (one part, the
text shown; when point_actions.v has it); the last string, the
tooltip, is optional. The placeholders of the template are `{pattern}`
(the pattern of pbp, `[X in ...]`), `{revert}` (`move: H; ` for a part
of a hypothesis), `{local}` (the pattern in the conclusion or in the
hypothesis the part is in), `{in}` (` in H`), `{head}` (the constant at
the head of the part) and `{text}` (the part, as printed); an action
that computes its line is written in Elpi (coq_tmp's README). The
buttons of the sentences after the declaration have the new action, not
those before. `PointActions.` prints the actions known at that point
(name, kind, where declared, template, doc). The demo `pbp_demo.v`
declares `Name it` between two `PointActions.` lines.

The files come as the example `pbp` (`app/public/examples/pbp`: `pbp.v`,
`pbp_select.v` and `point_actions.v` as in coq_tmp a7da995, a
`_RocqProject` `-R . coq_tmp` so that their `From coq_tmp Require`
works, and `pbp_demo.v`). They stay in the example, not in
`rocq-xtext-cyp`: one reads them beside the demo, and the page compiles
them in a few seconds. When coq_tmp's change, copy them again from its
root. (`pbp.v` has one warning of Elpi, a linear variable `H` at line
276, as in coq_tmp.) Its code: `app/src/components/goals/Point.tsx` (the
selection, the bar), `app/src/hooks/usePoint.ts` (the queries, the line
written), `app/src/lib/pointActions.ts` (the list of the actions).
Tests: `CHECK=step|all node tests/pbp.mjs`; `node tests/point-show.mjs`
(the kind show, on actions declared in a scratch part; while
point_actions.v does not know the kind, they are declared of kind point
and listed as show: it says MOCK); `node tests/point-show-unit.mjs` (no
browser)
(`CHROME=/usr/bin/google-chrome` for the system's Chrome, `SHOTS=DIR`
for screenshots).
