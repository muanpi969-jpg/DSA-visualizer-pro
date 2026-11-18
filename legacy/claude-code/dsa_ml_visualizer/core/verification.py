"""
core.verification
=================

**Verification of the AI matrix math.**

The brief requires a step that proves the linear algebra in the attention
visualization "accurately reflects standard machine learning principles".  This
module re-derives every quantity independently and asserts the invariants that
*must* hold for any correct scaled-dot-product / multi-head attention
implementation:

1.  **Softmax is a probability distribution** — every attention row is
    non-negative and sums to exactly 1.
2.  **Hand-rolled softmax == SciPy's** ``scipy.special.softmax`` — our numerically
    stable implementation matches the reference to floating-point tolerance.
3.  **Scaling is correct** — scores equal ``QKᵀ / √d_head`` (the ``1/√d_k``
    factor that keeps gradients healthy).
4.  **Output is the weighted sum of values** — ``head_output == weights @ V``.
5.  **Causal masking works** — with a decoder mask, no position attends to the
    future (strictly-upper-triangular weights are ~0).
6.  **Shapes compose** — heads split/concat round-trips to ``(seq, d_model)``.
7.  **Permutation equivariance of attention** — permuting the input rows permutes
    the output rows identically (a defining property of attention *before*
    positional encodings are added).

Each check returns a :class:`CheckResult`; :func:`run_all_checks` aggregates
them.  The same functions are exercised by ``tests/test_attention.py`` so the
guarantees are enforced in CI as well as shown live in the dashboard.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List

import numpy as np
from scipy.special import softmax as scipy_softmax

from ai.attention import (
    MultiHeadSelfAttention,
    scaled_dot_product_attention,
    softmax_rows,
)


@dataclass
class CheckResult:
    name: str
    passed: bool
    detail: str


# tolerance for floating-point comparisons
_ATOL = 1e-9


def check_softmax_is_distribution() -> CheckResult:
    rng = np.random.default_rng(0)
    logits = rng.standard_normal((5, 7)) * 3.0
    p = softmax_rows(logits)
    row_sums = p.sum(axis=1)
    ok = bool(np.all(p >= 0) and np.allclose(row_sums, 1.0, atol=_ATOL))
    return CheckResult(
        "Softmax rows form a probability distribution",
        ok,
        f"min weight={p.min():.2e} (≥0), row sums ∈ [{row_sums.min():.6f}, {row_sums.max():.6f}] (=1)",
    )


def check_softmax_matches_scipy() -> CheckResult:
    rng = np.random.default_rng(1)
    logits = rng.standard_normal((4, 6)) * 5.0
    mine = softmax_rows(logits)
    ref = scipy_softmax(logits, axis=1)
    err = float(np.max(np.abs(mine - ref)))
    return CheckResult(
        "Hand-rolled softmax matches scipy.special.softmax",
        err < 1e-12,
        f"max |mine − scipy| = {err:.2e}",
    )


def check_scaling_factor() -> CheckResult:
    rng = np.random.default_rng(2)
    seq, d_head = 6, 8
    Q, K, V = (rng.standard_normal((seq, d_head)) for _ in range(3))
    _, _, scores = scaled_dot_product_attention(Q, K, V)
    expected = (Q @ K.T) / np.sqrt(d_head)
    err = float(np.max(np.abs(scores - expected)))
    return CheckResult(
        "Scores use the 1/√d_head scaling",
        err < _ATOL,
        f"max |scores − QKᵀ/√d_head| = {err:.2e}",
    )


def check_output_is_weighted_value_sum() -> CheckResult:
    rng = np.random.default_rng(3)
    seq, d_head = 5, 4
    Q, K, V = (rng.standard_normal((seq, d_head)) for _ in range(3))
    output, weights, _ = scaled_dot_product_attention(Q, K, V)
    expected = weights @ V
    err = float(np.max(np.abs(output - expected)))
    return CheckResult(
        "Attention output equals weights · V",
        err < _ATOL,
        f"max |output − A·V| = {err:.2e}",
    )


def check_causal_mask() -> CheckResult:
    rng = np.random.default_rng(4)
    seq, d_head = 6, 4
    Q, K, V = (rng.standard_normal((seq, d_head)) for _ in range(3))
    mask = np.triu(np.full((seq, seq), -np.inf), k=1)
    _, weights, _ = scaled_dot_product_attention(Q, K, V, mask)
    upper = weights[np.triu_indices(seq, k=1)]
    ok = bool(np.allclose(upper, 0.0, atol=_ATOL))
    return CheckResult(
        "Causal mask blocks attention to future tokens",
        ok,
        f"max future-attention weight = {upper.max():.2e} (≈0)",
    )


def check_multihead_shapes() -> CheckResult:
    d_model, n_heads, seq = 24, 3, 7
    block = MultiHeadSelfAttention(d_model=d_model, n_heads=n_heads, seed=5)
    X = np.random.default_rng(6).standard_normal((seq, d_model))
    res = block.forward(X, [f"t{i}" for i in range(seq)])
    ok = (
        res.Q.shape == (n_heads, seq, d_model // n_heads)
        and res.weights.shape == (n_heads, seq, seq)
        and res.output.shape == (seq, d_model)
    )
    return CheckResult(
        "Multi-head split/concat preserves shapes",
        bool(ok),
        f"Q{res.Q.shape}, weights{res.weights.shape}, output{res.output.shape}",
    )


def check_permutation_equivariance() -> CheckResult:
    """Attention(PX) == P·Attention(X) for a permutation P (no positional enc.).

    This is a *defining* structural property: attention treats its input as a
    set, so reordering the rows reorders the outputs identically.  (In the full
    model, positional encodings deliberately break this so order matters.)
    """
    d_model, n_heads, seq = 12, 2, 5
    block = MultiHeadSelfAttention(d_model=d_model, n_heads=n_heads, seed=7)
    rng = np.random.default_rng(8)
    X = rng.standard_normal((seq, d_model))
    perm = rng.permutation(seq)
    labels = [f"t{i}" for i in range(seq)]

    base = block.forward(X, labels).output
    permuted = block.forward(X[perm], [labels[i] for i in perm]).output
    err = float(np.max(np.abs(permuted - base[perm])))
    return CheckResult(
        "Attention is permutation-equivariant (pre-positional)",
        err < 1e-9,
        f"max |Attn(PX) − P·Attn(X)| = {err:.2e}",
    )


#: Ordered list of all verification callables.
ALL_CHECKS = [
    check_softmax_is_distribution,
    check_softmax_matches_scipy,
    check_scaling_factor,
    check_output_is_weighted_value_sum,
    check_causal_mask,
    check_multihead_shapes,
    check_permutation_equivariance,
]


def run_all_checks() -> List[CheckResult]:
    """Execute every verification and return the results."""
    return [check() for check in ALL_CHECKS]


def all_passed(results: List[CheckResult]) -> bool:
    return all(r.passed for r in results)


if __name__ == "__main__":  # pragma: no cover - manual smoke run
    results = run_all_checks()
    width = max(len(r.name) for r in results)
    for r in results:
        status = "PASS" if r.passed else "FAIL"
        print(f"[{status}] {r.name:<{width}}  | {r.detail}")
    print("\nALL PASSED" if all_passed(results) else "\nSOME CHECKS FAILED")
