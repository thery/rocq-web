(* cyp: a proof written as text, checked step by step by Rocq.
   https://github.com/thery/coq_tmp (cyp/)

   [Cyp Lemma name binders : statement := [ node ; ... ].] states a lemma
   and gives its proof as a list of nodes, the list items of a text: words
   (strings) and formulas (Rocq terms).  The string right after a formula
   gives its class: "{.claim}" for the conclusion of the node (one per
   node), "{.fact}" for a fact it uses; "by *X*{.just}" names a
   justification; a list among the arguments of a node is the list of its
   subnodes, which prove its conclusion.  cyp checks each node (with lia,
   nia, its rules ...) from the statement and the nodes before it.  The
   nodes are numbered 1, 2, ... and 1.1 for the first subnode of 1; those
   cyp cannot check are left as goals of the Proof block, named after
   their number (?c1, ?c2_1); [CypQed.] ends it.

   Step to a [Cyp Lemma] line (Alt+↓, or Alt+→ up to the cursor), or in
   "Check as you type" put the cursor on it: cyp's report on each node
   (✅ checked, 🔶 left to the Proof block) appears under the goals.
   Change a formula and see which node fails. *)
From Stdlib Require Import ZArith Lia PrimString List.
From CypV Require Import Cyp.
Import ListNotations.
Open Scope Z_scope.
Open Scope pstring_scope.

(* Every node is checked: the lemma is defined *)
Cyp Lemma square_pos (a b : Z) (H : 0 < a < b) : a * a < b * b :=
  [ "It is equivalent to prove" (0 < b * b - a * a) "{.claim}."
      [ "That can also be written as" (0 < (b + a) * (b - a)) "{.claim}."
          [ "From" (0 < a < b) "{.fact} we have" (0 < b + a /\ 0 < b - a) "{.claim}." ] ] ].
Proof. CypQed.
Check square_pos.

(* A wrong node: 0 < a - b is false.  cyp goes on: node 2 is checked
   with node 1 as a hypothesis, and node 1 is left as the goal ?c1 of the
   Proof block, where nothing proves it, so the lemma is not defined *)
Cyp Lemma wrong (a b : Z) (H : 0 < a < b) : a * a < b * b :=
  [ "From" (0 < a < b) "{.fact} we have" (0 < a - b) "{.claim}." ;
    "Hence" (0 < b + a) "{.claim}." ].
Proof.
  Show.
  Fail lia.
Abort.
Fail Check wrong.

(* Nodes the default tactics cannot check (they know nothing of
   Z.sqrt): the nodes 1 and 2 are the goals ?c1 and ?c2 of the Proof
   block, proved by their names, in any order *)
Cyp Lemma sqrt_sq (a b : Z) (H : 0 <= a) (Hb : 0 <= b) :
  0 <= Z.sqrt a * Z.sqrt a + Z.sqrt b :=
  [ "We have" (0 <= Z.sqrt a) "{.claim}." ;
    "We have" (0 <= Z.sqrt b) "{.claim}." ;
    "So" (0 <= Z.sqrt a * Z.sqrt a) "{.claim}." ].
Proof.
  [c2]: apply Z.sqrt_nonneg.
  [c1]: { Show. apply Z.sqrt_nonneg. }
CypQed.
Print Assumptions sqrt_sq.
