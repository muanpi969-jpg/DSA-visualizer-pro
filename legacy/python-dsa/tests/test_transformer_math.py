"""Verification tests for Transformer mechanics."""

from __future__ import annotations

import numpy as np

from cs_viz.ai.transformer import build_attention_trace, verify_attention_math


def test_attention_math_verification_passes() -> None:
    report = verify_attention_math()

    assert report.passed
    assert report.vectorized_reference_error <= report.tolerance
    assert report.row_sum_error <= report.tolerance
    assert report.gradient_error <= report.tolerance


def test_cross_attention_shapes_and_row_sums() -> None:
    trace = build_attention_trace(
        source_text="a small encoder input",
        target_text="decoder query",
        mode="Encoder-decoder cross-attention",
        d_model=8,
        d_k=8,
        d_v=6,
        seed=3,
    )

    assert trace.attention_weights.shape == (len(trace.target.tokens), len(trace.source.tokens))
    assert trace.context.shape == (len(trace.target.tokens), 6)
    assert np.allclose(trace.attention_weights.sum(axis=1), 1.0)
