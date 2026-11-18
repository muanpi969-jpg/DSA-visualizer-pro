"""Transformer attention mechanics and numerical verification.

The implementation focuses on the core operation used in BART/T5-style
encoder-decoder Transformers:

    Attention(Q, K, V) = softmax(Q K^T / sqrt(d_k)) V

Every matrix in the Streamlit visualizer comes from this code path, and the
verification helpers compare the vectorized NumPy/SciPy implementation against
a slow reference implementation plus a finite-difference gradient check.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import sqrt
from typing import Literal

import numpy as np
from scipy.special import softmax

from cs_viz.ai.tokenization import EncodedText, PedagogicalTokenizer


AttentionMode = Literal[
    "Encoder self-attention",
    "Decoder causal self-attention",
    "Encoder-decoder cross-attention",
]


@dataclass(frozen=True)
class ProjectionWeights:
    """Deterministic projection matrices for a single attention head."""

    w_q: np.ndarray
    w_k: np.ndarray
    w_v: np.ndarray


@dataclass(frozen=True)
class AttentionTrace:
    """All matrices needed to explain one scaled dot-product attention pass."""

    mode: AttentionMode
    source: EncodedText
    target: EncodedText
    query_tokens: tuple[str, ...]
    key_tokens: tuple[str, ...]
    source_embeddings: np.ndarray
    target_embeddings: np.ndarray
    q: np.ndarray
    k: np.ndarray
    v: np.ndarray
    scores: np.ndarray
    attention_weights: np.ndarray
    context: np.ndarray
    mask: np.ndarray | None

    @property
    def matrix_options(self) -> dict[str, np.ndarray]:
        """Matrices offered in the UI matrix inspector."""

        return {
            "Source embeddings X_source": self.source_embeddings,
            "Target embeddings X_target": self.target_embeddings,
            "Queries Q": self.q,
            "Keys K": self.k,
            "Values V": self.v,
            "Scaled scores QK^T / sqrt(d_k)": self.scores,
            "Attention weights softmax(scores)": self.attention_weights,
            "Context attention @ V": self.context,
        }

    @property
    def shape_rows(self) -> list[dict[str, str]]:
        """Table-friendly matrix multiplication summary."""

        return [
            {
                "operation": "Token IDs -> embedding lookup",
                "left": f"{len(self.source.token_ids)} tokens",
                "right": f"embedding dim {self.source_embeddings.shape[1]}",
                "output": str(tuple(self.source_embeddings.shape)),
            },
            {
                "operation": "Q = X_query @ W_q",
                "left": str((self.q.shape[0], self.source_embeddings.shape[1])),
                "right": str((self.source_embeddings.shape[1], self.q.shape[1])),
                "output": str(tuple(self.q.shape)),
            },
            {
                "operation": "K = X_key @ W_k",
                "left": str((self.k.shape[0], self.source_embeddings.shape[1])),
                "right": str((self.source_embeddings.shape[1], self.k.shape[1])),
                "output": str(tuple(self.k.shape)),
            },
            {
                "operation": "scores = Q @ K.T / sqrt(d_k)",
                "left": str(tuple(self.q.shape)),
                "right": str((self.k.shape[1], self.k.shape[0])),
                "output": str(tuple(self.scores.shape)),
            },
            {
                "operation": "attention = softmax(scores)",
                "left": str(tuple(self.scores.shape)),
                "right": "row-wise normalization",
                "output": str(tuple(self.attention_weights.shape)),
            },
            {
                "operation": "context = attention @ V",
                "left": str(tuple(self.attention_weights.shape)),
                "right": str(tuple(self.v.shape)),
                "output": str(tuple(self.context.shape)),
            },
        ]


@dataclass(frozen=True)
class VerificationReport:
    """Numerical evidence that the attention implementation is correct."""

    passed: bool
    vectorized_reference_error: float
    row_sum_error: float
    gradient_error: float
    tolerance: float
    details: tuple[str, ...]


def deterministic_embedding_table(vocab_size: int, d_model: int, seed: int) -> np.ndarray:
    """Create a stable embedding table for repeatable visualizations."""

    rng = np.random.default_rng(seed)
    table = rng.normal(loc=0.0, scale=0.35, size=(vocab_size, d_model))
    table[0] = 0.0  # <pad> is conventionally the zero-ish row in many models.
    return table


def deterministic_projection_weights(d_model: int, d_k: int, d_v: int, seed: int) -> ProjectionWeights:
    """Create stable Q/K/V projection matrices."""

    rng = np.random.default_rng(seed + 10_000)
    scale = 1.0 / sqrt(max(d_model, 1))
    return ProjectionWeights(
        w_q=rng.normal(0.0, scale, size=(d_model, d_k)),
        w_k=rng.normal(0.0, scale, size=(d_model, d_k)),
        w_v=rng.normal(0.0, scale, size=(d_model, d_v)),
    )


def causal_mask(length: int) -> np.ndarray:
    """Return a lower-triangular boolean mask for decoder self-attention."""

    return np.tril(np.ones((length, length), dtype=bool))


def attention_from_qkv(
    q: np.ndarray,
    k: np.ndarray,
    v: np.ndarray,
    mask: np.ndarray | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """Compute scaled dot-product attention from already projected Q, K, and V."""

    scale = sqrt(q.shape[1])
    scores = (q @ k.T) / scale
    if mask is not None:
        scores = np.where(mask, scores, -np.inf)
    weights = softmax(scores, axis=-1)
    context = weights @ v
    return weights, context


def project_and_attend(
    query_input: np.ndarray,
    key_value_input: np.ndarray,
    weights: ProjectionWeights,
    mask: np.ndarray | None = None,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Project embeddings to Q/K/V and compute attention outputs."""

    q = query_input @ weights.w_q
    k = key_value_input @ weights.w_k
    v = key_value_input @ weights.w_v
    attention_weights, context = attention_from_qkv(q, k, v, mask)
    scores = (q @ k.T) / sqrt(q.shape[1])
    if mask is not None:
        scores = np.where(mask, scores, -np.inf)
    return q, k, v, scores, attention_weights, context


def build_attention_trace(
    source_text: str,
    target_text: str,
    mode: AttentionMode,
    d_model: int = 8,
    d_k: int = 8,
    d_v: int = 8,
    seed: int = 7,
    lowercase: bool = True,
) -> AttentionTrace:
    """Tokenize text and run one pedagogical Transformer attention pass."""

    tokenizer = PedagogicalTokenizer(lowercase=lowercase).fit((source_text, target_text))
    source = tokenizer.encode(source_text)
    target = tokenizer.encode(target_text)
    embeddings = deterministic_embedding_table(len(tokenizer.token_to_id), d_model, seed)
    source_embeddings = embeddings[list(source.token_ids)]
    target_embeddings = embeddings[list(target.token_ids)]
    projections = deterministic_projection_weights(d_model, d_k, d_v, seed)

    if mode == "Encoder self-attention":
        query_input = source_embeddings
        key_value_input = source_embeddings
        query_tokens = source.tokens
        key_tokens = source.tokens
        mask = None
    elif mode == "Decoder causal self-attention":
        query_input = target_embeddings
        key_value_input = target_embeddings
        query_tokens = target.tokens
        key_tokens = target.tokens
        mask = causal_mask(len(target.tokens))
    elif mode == "Encoder-decoder cross-attention":
        query_input = target_embeddings
        key_value_input = source_embeddings
        query_tokens = target.tokens
        key_tokens = source.tokens
        mask = None
    else:  # pragma: no cover - protected by the Literal type and UI options.
        raise ValueError(f"Unsupported attention mode: {mode}")

    q, k, v, scores, attention_weights, context = project_and_attend(
        query_input=query_input,
        key_value_input=key_value_input,
        weights=projections,
        mask=mask,
    )
    return AttentionTrace(
        mode=mode,
        source=source,
        target=target,
        query_tokens=query_tokens,
        key_tokens=key_tokens,
        source_embeddings=source_embeddings,
        target_embeddings=target_embeddings,
        q=q,
        k=k,
        v=v,
        scores=scores,
        attention_weights=attention_weights,
        context=context,
        mask=mask,
    )


def _manual_attention_reference(
    q: np.ndarray,
    k: np.ndarray,
    v: np.ndarray,
    mask: np.ndarray | None = None,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Slow attention implementation used only for verification."""

    rows, cols = q.shape[0], k.shape[0]
    scores = np.empty((rows, cols), dtype=float)
    for row in range(rows):
        for col in range(cols):
            scores[row, col] = float(np.dot(q[row], k[col]) / sqrt(q.shape[1]))
            if mask is not None and not mask[row, col]:
                scores[row, col] = -np.inf

    weights = np.empty_like(scores)
    for row in range(rows):
        finite_scores = scores[row]
        max_score = np.max(finite_scores)
        exp_values = np.exp(finite_scores - max_score)
        weights[row] = exp_values / np.sum(exp_values)

    context = np.zeros((rows, v.shape[1]), dtype=float)
    for row in range(rows):
        for col in range(cols):
            context[row] += weights[row, col] * v[col]

    return scores, weights, context


def _loss_from_qkv(q: np.ndarray, k: np.ndarray, v: np.ndarray) -> float:
    """Simple scalar loss for gradient checking."""

    _weights, context = attention_from_qkv(q, k, v)
    return float(np.sum(context))


def _attention_sum_loss_gradients(
    q: np.ndarray,
    k: np.ndarray,
    v: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Analytic gradients for ``sum(attention(Q, K, V))``.

    This verifies the calculus behind the attention block. For each row, the
    softmax vector-Jacobian product is:

        dL/dscores = attention * (dL/dattention - dot(dL/dattention, attention))
    """

    weights, context = attention_from_qkv(q, k, v)
    del context  # The loss gradient with respect to every context entry is 1.

    d_context = np.ones((q.shape[0], v.shape[1]), dtype=float)
    d_attention = d_context @ v.T
    d_scores = weights * (d_attention - np.sum(d_attention * weights, axis=1, keepdims=True))
    scale = sqrt(q.shape[1])
    d_q = d_scores @ k / scale
    d_k = d_scores.T @ q / scale
    d_v = weights.T @ d_context
    return d_q, d_k, d_v


def _finite_difference_gradient_error(
    q: np.ndarray,
    k: np.ndarray,
    v: np.ndarray,
    epsilon: float = 1e-6,
) -> float:
    """Compare analytic Q/K/V gradients against central differences."""

    analytic = _attention_sum_loss_gradients(q, k, v)
    arrays = [q.copy(), k.copy(), v.copy()]
    max_error = 0.0

    for array_index, array in enumerate(arrays):
        analytic_gradient = analytic[array_index]
        for index in np.ndindex(array.shape):
            plus_arrays = [candidate.copy() for candidate in arrays]
            minus_arrays = [candidate.copy() for candidate in arrays]
            plus_arrays[array_index][index] += epsilon
            minus_arrays[array_index][index] -= epsilon
            numerical = (
                _loss_from_qkv(*plus_arrays) - _loss_from_qkv(*minus_arrays)
            ) / (2 * epsilon)
            max_error = max(max_error, abs(float(numerical - analytic_gradient[index])))

    return max_error


def verify_attention_math(seed: int = 11, tolerance: float = 1e-7) -> VerificationReport:
    """Run numerical checks for the attention implementation."""

    rng = np.random.default_rng(seed)
    q = rng.normal(size=(4, 5))
    k = rng.normal(size=(4, 5))
    v = rng.normal(size=(4, 3))
    mask = causal_mask(4)

    vectorized_weights, vectorized_context = attention_from_qkv(q, k, v, mask)
    _ref_scores, reference_weights, reference_context = _manual_attention_reference(q, k, v, mask)

    vectorized_reference_error = float(
        max(
            np.max(np.abs(vectorized_weights - reference_weights)),
            np.max(np.abs(vectorized_context - reference_context)),
        )
    )
    row_sum_error = float(np.max(np.abs(vectorized_weights.sum(axis=1) - 1.0)))

    gradient_q = rng.normal(size=(3, 4))
    gradient_k = rng.normal(size=(3, 4))
    gradient_v = rng.normal(size=(3, 2))
    gradient_error = _finite_difference_gradient_error(gradient_q, gradient_k, gradient_v)

    details = (
        "Vectorized attention matches a slow loop-based reference.",
        "Every attention row sums to 1 after softmax.",
        "Analytic gradients for Q, K, and V match central finite differences.",
    )
    passed = (
        vectorized_reference_error <= tolerance
        and row_sum_error <= tolerance
        and gradient_error <= tolerance
    )
    return VerificationReport(
        passed=passed,
        vectorized_reference_error=vectorized_reference_error,
        row_sum_error=row_sum_error,
        gradient_error=gradient_error,
        tolerance=tolerance,
        details=details,
    )
