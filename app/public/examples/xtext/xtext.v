(* xtext: the proof of a lemma written as text.
   https://github.com/thery/coq_tmp (xtext/)

   Step to an [ExtractText foo.] line (Alt+↓, or Alt+→ up to the cursor),
   or in "Check as you type" put the cursor on it: the proof of [foo]
   appears as text under the goals, one item per step, every formula in
   Rocq syntax.  The text follows "Extracting Text from Proofs" (Y. Coscoy,
   G. Kahn, L. Théry, 1995).
   Change a proof, or write your own lemma, and extract its text. *)
From Stdlib Require Import Arith.
From XText Require Import ExtractText.

(* A proof in propositional logic *)
Lemma and_swap (A B : Prop) : A /\ B -> B /\ A.
Proof. intros [a b]. split. exact b. exact a. Qed.
ExtractText and_swap.

(* The same text in French *)
ExtractText and_swap in "fr".

(* The same text with its tags (`A B : Prop`{.var}, *conj*{.just}, ...): the
   Markdown format that cyp checks again and that the PDF writer reads *)
#[tags] ExtractText and_swap.

(* A proof term written by hand: Coscoy's ABCD *)
Lemma ABCD (A B C D : Prop) :
  (A -> B -> C -> D) -> (A -> C -> B) -> (A -> C) -> A -> D.
Proof. intros h1 h2 h3 h4. exact (h1 h4 (h2 h4 (h3 h4)) (h3 h4)). Qed.
ExtractText ABCD.

(* Quantifiers *)
Lemma ex_forall (P : nat -> nat -> Prop) :
  (exists x, forall y, P x y) -> forall y, exists x, P x y.
Proof. intros [x H] y. exists x. apply H. Qed.
ExtractText ex_forall.

(* A proof by induction, with rewriting *)
Lemma add_0_r' (n : nat) : n + 0 = n.
Proof. induction n as [|m IH]. reflexivity. simpl. rewrite IH. reflexivity. Qed.
ExtractText add_0_r'.

(* A proof stopped midway: [ExtractText_partial.] prints the proof so far,
   each open goal written "Prove G".  It ends the proof, as Abort does:
   the lemma is not defined. *)
Lemma add_0_r_partial (n : nat) : n + 0 = n.
Proof. induction n as [|m IH]. reflexivity.
ExtractText_partial.
