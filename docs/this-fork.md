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

The examples follow coq_tmp's main at commit 49f6c78 (package version
2026.11.20+49f6c78), which works unchanged with rocq-elpi 3.7.0 and Elpi
4.1.1, as with Elpi 4.0.0. When coq_tmp changes, rerun
`scripts/demo-libs.sh`, check that its list of files and
`demo-libs/Makefile` still match what `ExtractText.v` and `Cyp.v` load
(`From ... Extra Dependency`), and that each example compiles under node:
`node out/full/rocq_web.js compile f.v`.

## Proof by pointing (branch `pbp-click`)

An experiment with `pbp.v` and `pbp_select.v` of coq_tmp (branch
`pbp-select`, see its README, section "pbp: proof by pointing"). In the
goals panel, select a part of a focused goal with the mouse, in its
conclusion or in the type of a hypothesis: a small bar appears under the
selection.

- **Point** runs `elpi pbp_pattern S E.` (`H S E` for hypothesis `H`;
  `N: ...` for goal `N`) after the sentence the goals are shown for, as a
  query: the document is unchanged. `S E` count the characters that are
  not blanks of the part's text, so the panel's line breaks do not
  matter. The line it prints (`pbp [X in X + _ = _].`) is written after
  that sentence: on a new line indented as it when nothing follows it on
  its line, else after it on the same line; the cursor goes to its end.
  Step by step, Alt+↓ then checks it.
- **Link…** keeps the selection (highlighted); select the second part and
  click **Link**: `elpi pbp_pattern S E S' E'` (or `H S E S' E'`, the
  hypothesis first, or `H S E H' S' E'`). Escape or ✕ forgets the first.
- The widened warning (`pbp-widened`) and the errors go to the Log panel;
  an error is also shown in the bar.
- **check** (a box in the bar, off by default, remembered in the
  browser): the line written is checked at once. Step by step, the
  checking goes to its end (as Alt+→ there), so the goals shown are those
  after it and one can point again; a line that fails stops the checking
  before it, its error shown as usual. When checking as you type, the
  cursor is put after the line in any case, so the goals shown are
  already those after it.

The files come as the example `pbp` (`app/public/examples/pbp`: `pbp.v`,
`pbp_select.v` as in coq_tmp 9083864, a `_RocqProject` `-R . coq_tmp` so
that their `From coq_tmp Require` works, and `pbp_demo.v`). A file that
points needs `From elpi Require Import elpi.` and `From coq_tmp Require
Import pbp_select.` (the `elpi` tactic of the command). Its code:
`app/src/components/goals/Point.tsx` (the selection, the bar),
`app/src/hooks/usePoint.ts` (the command, the line written). Test:
`CHECK=step|all node tests/pbp.mjs` (`CHROME=/usr/bin/google-chrome` for
the system's Chrome, `SHOTS=DIR` for screenshots).
