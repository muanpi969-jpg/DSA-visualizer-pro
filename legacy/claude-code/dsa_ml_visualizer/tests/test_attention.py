"""
tests.test_attention
=====================

Pytest enforcement of the AI matrix math.  These tests reuse the same
verification logic that the dashboard's "⑤ Verify" tab runs live, plus a few
extra structural checks on the end-to-end pipeline and the tokenizer.

Run from the project root::

    pytest -q
"""

from __future__ import annotations

import numpy as np
import pytest

from ai.attention import (
    MultiHeadSelfAttention,
    build_embeddings,
    positional_encoding,
    run_attention,
    scaled_dot_product_attention,
    softmax_rows,
)
from ai.tokenizer import tokenize
from core.verification import ALL_CHECKS, run_all_checks


# --- the canonical verification suite --------------------------------------
@pytest.mark.parametrize("check", ALL_CHECKS, ids=lambda c: c.__name__)
def test_each_verification_check_passes(check):
    result = check()
    assert result.passed, f"{result.name} failed: {result.detail}"


def test_run_all_checks_aggregate():
    results = run_all_checks()
    assert len(results) == len(ALL_CHECKS)
    assert all(r.passed for r in results)


# --- softmax ---------------------------------------------------------------
def test_softmax_rows_sum_to_one():
    x = np.random.default_rng(0).standard_normal((10, 13)) * 4
    p = softmax_rows(x)
    assert np.allclose(p.sum(axis=1), 1.0)
    assert (p >= 0).all()


def test_softmax_translation_invariance():
    """softmax(x + c) == softmax(x): adding a constant to a row must not change it."""
    x = np.random.default_rng(1).standard_normal((3, 5))
    assert np.allclose(softmax_rows(x), softmax_rows(x + 100.0))


# --- scaled dot-product attention ------------------------------------------
def test_attention_output_shape_and_value():
    rng = np.random.default_rng(2)
    seq, d = 6, 8
    Q, K, V = (rng.standard_normal((seq, d)) for _ in range(3))
    out, weights, scores = scaled_dot_product_attention(Q, K, V)
    assert out.shape == (seq, d)
    assert weights.shape == (seq, seq)
    assert np.allclose(scores, (Q @ K.T) / np.sqrt(d))
    assert np.allclose(out, weights @ V)


def test_identical_keys_give_uniform_attention():
    """If every key/value is identical, attention must be uniform (1/seq each)."""
    seq, d = 4, 5
    Q = np.random.default_rng(3).standard_normal((seq, d))
    K = np.ones((seq, d))
    V = np.random.default_rng(4).standard_normal((seq, d))
    _, weights, _ = scaled_dot_product_attention(Q, K, V)
    assert np.allclose(weights, 1.0 / seq)


# --- positional encoding ---------------------------------------------------
def test_positional_encoding_bounds_and_shape():
    pe = positional_encoding(10, 16)
    assert pe.shape == (10, 16)
    assert pe.min() >= -1.0 - 1e-9 and pe.max() <= 1.0 + 1e-9


# --- multi-head block ------------------------------------------------------
def test_multihead_requires_divisible_dims():
    with pytest.raises(ValueError):
        MultiHeadSelfAttention(d_model=10, n_heads=3)


def test_end_to_end_pipeline_runs():
    tokens = tokenize("attention is all you need", model="BART")
    res = run_attention(tokens, d_model=24, n_heads=3, seed=42)
    seq = len(tokens)
    assert res.output.shape == (seq, 24)
    # every attention row, every head, is a valid distribution
    for h in range(res.n_heads):
        assert np.allclose(res.weights[h].sum(axis=1), 1.0)


def test_embeddings_are_deterministic():
    t = tokenize("hello world", model="T5")
    a = build_embeddings(t, d_model=16, seed=42)
    b = build_embeddings(t, d_model=16, seed=42)
    assert np.array_equal(a, b)


# --- tokenizer -------------------------------------------------------------
def test_bart_adds_boundary_tokens():
    t = tokenize("hi there", model="BART")
    assert t[0].text == "<s>" and t[-1].text == "</s>"


def test_token_ids_are_stable():
    a = tokenize("repeat repeat", model="T5", use_subwords=False)
    # the same surface form must map to the same id
    assert a[0].token_id == a[1].token_id
