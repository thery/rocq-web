# Rocq in the browser, with rocq-elpi and itauto

The site **https://thery.github.io/rocq-web/** is a build of
[rocq-web](https://github.com/rboudrouss/rocq-web) by Rayane Boudrouss
(live at [rocq.rboud.com](https://rocq.rboud.com/)): Rocq 9.2 and coq-lsp
compiled to WebAssembly, running in your browser.  Many thanks to its
author: this is his work, with a few additions, on the branch
[`elpi-files`](https://github.com/thery/rocq-web/tree/elpi-files)
(da682d0; see its `docs/this-fork.md`):

- rocq-elpi at its master (commit 4a8efd92), and `.elpi` files kept in
  workspaces;
- [itauto](https://gitlab.inria.fr/fbesson/itauto) (Frédéric Besson),
  release 9.1.0 ported to Rocq 9.2, with its classical mode for Rocq 9;
- the C maths functions exported to plugins (`lia`, `lra`, Elpi's floats).

Its first two examples (menu Examples, or `?example=xtext`, `?example=cyp`)
are demos of the proof-text tools cyp and xtext of
[thery/coq_tmp](https://github.com/thery/coq_tmp).  The first visit
reloads the page once (rocq-web's `coi.js` makes it cross-origin
isolated on GitHub Pages).

The example `pbp` (`?example=pbp`) is proof by pointing with the
pointing actions declared in Rocq of coq_tmp: Point, Link, Simplify
here, Unfold here, Name occurrence, the actions that show a text (Type
of, Check this, Normal form, Head normal form, Where defined, Unfolds
to, Without notations) and the notation actions (Disable notation,
Enable notation).
