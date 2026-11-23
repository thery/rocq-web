(* pbp: proof by pointing.
   https://github.com/thery/coq_tmp (pbp.v, pbp_select.v)

   Step into a proof (Alt+↓), select a part of the goal
   with the mouse and click "Point" next to the selection:
   the pbp line that brings this part to the surface is
   written after the sentence the goal is shown for.
   To link two parts, select the first one, click "Link…",
   select the second one and click "Link".  A part of a
   hypothesis can be selected too: the line then starts
   with [move: H;].  Pointing needs the two Require of
   elpi and pbp_select below.

   pbp has rules for /\, \/, -> and ~ only: the line for
   a part of [a + b = b + a] is a valid pattern (for
   [rewrite [X in ...]] too), but pbp fails on it. *)
From Stdlib Require Import ssreflect.
From elpi Require Import elpi.
From coq_tmp Require Import pbp_select.

(* Select the first a, or the last one *)
Lemma add_comm (a b : nat) : a + b = b + a.
Proof.
Abort.

(* Select the last A: pbp [X in _ -> _ /\ X]. *)
Lemma and_swap (A B : Prop) : A /\ B -> B /\ A.
Proof.
Abort.

(* Linking: select B in the type of ab, click Link…, select the B of the
   conclusion, click Link:
   move: ab; pbp [X Y in (_ -> X) -> Y]. *)
Lemma modus_ponens (A B : Prop) (ab : A -> B) (a : A) : B.
Proof.
Abort.

(* Two goals: a part of the second one gives a line for it (2: pbp ...) *)
Lemma and_proj (A B : Prop) : (A /\ B -> A) /\ (A /\ B -> B).
Proof.
split.
Abort.

(* The tests of pbp.v, to redo by pointing; the lines pbp.v uses are
   given after each statement. *)

(* pbp [Z in _ -> _ /\ Z].  move: pbp.  by pbp [X in X /\ _ -> _].
   move: pbp.  by pbp [X in Y /\ X -> _]. *)
Lemma test_pbp0 (A B C : Prop) : A /\ B -> B /\ A.
Proof.
Abort.

(* pbp [X Y in X /\ Z -> Y /\ _].  move: Z.  pbp [X Y in X -> _ -> Y]. *)
Lemma test_pbp1 (A B C : Prop) : A /\ B -> A /\ B.
Proof.
Abort.

(* pbp [X in X \/ Y -> _].  by pbp [X in X \/ _].  by pbp [X in _ \/ X]. *)
Lemma test_pbp2 (A B C : Prop) : A \/ B -> A \/ B.
Proof.
Abort.

(* pbp [X Y in X \/ Z -> _ \/ Y].  move: Z.  pbp [X Y in X -> Y \/ _]. *)
Lemma test_pbp3 (A B C : Prop) : A \/ B -> B \/ A.
Proof.
Abort.

(* by pbp [X Y in (_ -> X) -> H -> Y]. *)
Lemma test_pbp4 (A B : Prop) : (B -> A) -> B -> A.
Proof.
Abort.

(* pbp [X Y in (X -> H) -> Y -> _].  move: H.  pbp [X Y in X -> _ -> Y]. *)
Lemma test_pbp5 (A B : Prop) : (B -> A) -> B -> A.
Proof.
Abort.

(* pbp [X Y in (X -> H) /\ Y -> _].  move: H.  pbp [X Y in X -> _ -> Y]. *)
Lemma test_pb6 (A B : Prop) : (A -> B) /\ A -> B.
Proof.
Abort.
