(* cyp on a proof written in Markdown.
   https://github.com/thery/coq_tmp (cyp/)

   [CypFile "f.md".] reads the proof in f.md (open it in the Files panel:
   a header, the statement, one list item per node, each formula between
   backquotes with its class: `x : Z`{.var}, `P`{.hyp}, `C`{.claim} the
   conclusion of the node, `F`{.fact} a fact it uses, *lia*{.just} a
   justification), checks every node, writes f.checked.md (each node
   marked ✅ or ❌, under "Written by Rocq" in the Files panel) and
   defines the lemma when every node is proved.  Step to a [CypFile] line
   (Alt+↓, or Alt+→ up to the cursor), or in "Check as you type" put the
   cursor on it, to see cyp's report.  Edit square_lt.md and check this
   file again.  (The paths are from the root of the files, where Rocq
   runs.) *)
From Stdlib Require Import ZArith Lia.
From CypV Require Import Cyp.
Open Scope Z_scope.

(* every node proved: the lemma square_lt is defined *)
CypFile "cyp/square_lt.md".
Check square_lt.

(* a wrong node (0 < a - b): it is marked ❌ in square_wrong.checked.md,
   CypFile fails and the lemma is not defined *)
Fail CypFile "cyp/square_wrong.md".
Fail Check square_wrong.

(* [Cyp File] (two words) is followed by a Proof block: the node that cyp
   cannot check is its goal ?c1, which nothing proves here *)
Cyp File "cyp/square_wrong.md".
Proof.
  Show.
  Fail lia.
Abort.
