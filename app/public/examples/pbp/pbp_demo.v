(* pbp: proof by pointing.
   https://github.com/thery/coq_tmp (pbp.v, pbp_select.v,
   point_actions.v, point_actions_more.v,
   point_actions_show.v, point_actions_notations.v)

   Step into a proof (Alt+↓), select a part of the goal
   with the mouse: a bar under the selection shows the
   pointing actions, one button each (its tooltip says
   what it does).  A button writes the line of its action
   after the sentence the goal is shown for:
   - Point: the pbp line that brings the part to the
     surface;
   - Simplify here, Unfold here: a rewrite that simplifies
     the part, or unfolds the constant at its head.
   - Name occurrence: a set of the part, with its
     occurrence number ({2}).
   - Disable notation, Enable notation: the line that
     disables (enables) the notation of the part.
   Link… (two parts): select the first one, click Link…,
   select the second one and click Link.  A part of a
   hypothesis can be selected too: the line then starts
   with [move: H;] (or ends with [in H]).  Tick "check" in
   the bar to check the line at once, then point at the
   next goal.
   The actions that show instead of writing (Type of,
   Check this, Normal form, Head normal form, Where
   defined, Unfolds to, Without notations) print their
   text in the bar; nothing is written (try_show_actions
   and try_notation_actions at the end).

   The actions are declared in Rocq, with PointAction (the
   five first ones in point_actions.v and
   point_actions_more.v, the show ones in
   point_actions_show.v, the notation ones in
   point_actions_notations.v, and one more below): the
   bar shows those that are loaded where the goal is.
   Pointing needs the Require of point_actions_more below.

   pbp has rules for /\, \/, -> and ~ only: the line for
   a part of [a + b = b + a] is a valid pattern (for
   [rewrite [X in ...]] too), but pbp fails on it. *)
From Stdlib Require Import ssreflect.
From elpi Require Import elpi.
From coq_tmp Require Import point_actions_more point_actions_notations.

(* Select the first a, or the last one *)
Lemma add_comm (a b : nat) : a + b = b + a.
Proof.
Abort.

(* Select the last A, click Point: pbp [X in _ -> _ /\ X]. *)
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

Definition double n := n + n.

(* Simplify here: select 1 + 1, the line is
   rewrite [X in X + _ = _]/=.  (1 + 1 becomes 2).
   Unfold here: select double (1 + a) (or double
   alone), the line is rewrite [X in _ = X]/double. *)
Lemma simplify_unfold (a : nat) : 1 + 1 + a = double (1 + a).
Proof.
Abort.

(* PointActions shows the actions known at this
   point (under the goals, the cursor after it): the
   five of point_actions.v and point_actions_more.v,
   the six of point_actions_show.v and the three of
   point_actions_notations.v. *)
PointActions.

(* An action declared here: from now on, the bar has
   a button "Name it" (not in the lemmas above).  Its
   line is a template: {text} is the selected subterm
   as printed (point_actions.v lists the others). *)
PointAction "Name it" point "set x := ({text})."
  "name the selected subterm".

(* PointActions shows the actions known at this
   point: Name it too. *)
PointActions.

(* Select double (1 + a), click Name it:
   set x := (double (1 + a)). *)
Lemma name_it (a : nat) : 1 + 1 + a = double (1 + a).
Proof.
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

(* Try the show actions (point_actions_show.v): they show a
   text in the bar and write nothing.  Select a part and
   click:
   - Type of: the type of the part (on 1 + a: 1 + a : nat);
   - Check this: what Check prints for it;
   - Normal form, Head normal form: its value (on
     double 2: double 2 ⇒ 4);
   - Where defined: its head constant or variable, its
     kind, its library (on double (1 + a): ...double: a
     definition, ...; on a: a hypothesis of the goal);
   - Unfolds to: one unfolding of its head constant (on
     double (1 + a): double (1 + a) ⇒ 1 + a + (1 + a)). *)
Lemma try_show_actions (a : nat) (H : double (1 + a) = 2 + a + a) :
  forall n : nat, n + double 2 = n + 4.
Proof.
Abort.

(* Try the notation actions (point_actions_notations.v):
   - select b * 2 and click Disable notation: the line
     Disable Notation := (Nat.mul _ _) (all).
     once checked, the goal prints a + Nat.mul b 2 = b;
   - select Nat.mul b 2 and click Enable notation: the
     line Enable Notation := (Nat.mul _ _) (all).  puts
     it back;
   - select a part and click Without notations (it
     shows): the part printed without notations, on the
     whole goal eq (Nat.add a (Nat.mul b 2)) b. *)
Lemma try_notation_actions (a b : nat) : a + b * 2 = b.
Proof.
Abort.
