---
require: From Stdlib Require Import ZArith Lia.
scope: Z_scope
by: lia | nia
---

# square_wrong

Let `a b : Z`{.var}. If `0 < a < b`{.hyp} then `a * a < b * b`{.claim}.

- From `0 < a < b`{.fact} we have `0 < a - b`{.claim}.
- Hence `0 < b + a`{.claim}.
