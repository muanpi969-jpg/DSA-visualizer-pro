"""
ai.attention
============

The **real, verifiable linear algebra** behind a Transformer's attention block,
implemented from scratch in NumPy so every intermediate matrix can be inspected
and animated.  This is the mechanism at the core of encoder–decoder models like
**BART** and **T5**.

Pipeline implemented here (a single self-attention block)::

    text ──tokenize──► ids
        ──embed──► X            (seq, d_model)   token + positional embeddings
        ──project──► Q, K, V    (heads, seq, d_head)   X·Wq, X·Wk, X·Wv
        ──score──►  S = QKᵀ/√d_head                     (heads, seq, seq)
        ──mask──►   (optional causal mask for decoders)
        ──softmax─► A = softmax(S)                       row-stochastic weights
        ──mix──►    H = A·V                              (heads, seq, d_head)
        ──concat+project──► O = concat(H)·Wo            (seq, d_model)

Everything is deterministic given a ``seed`` so the visualization and the unit
tests agree exactly.

References
----------
Vaswani et al., "Attention Is All You Need" (2017): the scaled dot-product
attention,  Attention(Q, K, V) = softmax(QKᵀ / √d_k) V.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

import numpy as np
from scipy.special import softmax as scipy_softmax

from ai.tokenizer import Token


# ---------------------------------------------------------------------------
# Embeddings
# ---------------------------------------------------------------------------
def positional_encoding(seq_len: int, d_model: int) -> np.ndarray:
    """Sinusoidal positional encodings from the original Transformer paper.

    ``PE[pos, 2i]   = sin(pos / 10000^(2i/d_model))``
    ``PE[pos, 2i+1] = cos(pos / 10000^(2i/d_model))``

    These let the otherwise permutation-invariant attention block reason about
    token order.  Returned shape: ``(seq_len, d_model)``.
    """
    pe = np.zeros((seq_len, d_model))
    position = np.arange(seq_len)[:, None]
    div_term = np.exp(np.arange(0, d_model, 2) * (-np.log(10000.0) / d_model))
    pe[:, 0::2] = np.sin(position * div_term)
    pe[:, 1::2] = np.cos(position * div_term[: pe[:, 1::2].shape[1]])
    return pe


def build_embeddings(tokens: List[Token], d_model: int, seed: int = 0) -> np.ndarray:
    """Construct the input matrix ``X`` = token embeddings + positional encodings.

    Token embeddings are drawn deterministically from each token's id (so the
    same word always embeds to the same vector), then the sinusoidal positional
    encoding is added — exactly the ``X`` that enters the first attention block.

    Returns ``(seq_len, d_model)``.
    """
    seq_len = len(tokens)
    emb = np.zeros((seq_len, d_model))
    for i, tok in enumerate(tokens):
        # a per-token-id RNG → stable embedding row for that vocabulary entry
        rng = np.random.default_rng(seed * 1_000_003 + tok.token_id)
        emb[i] = rng.standard_normal(d_model) * 0.5
    emb += positional_encoding(seq_len, d_model)
    return emb


# ---------------------------------------------------------------------------
# Scaled dot-product attention (single head)
# ---------------------------------------------------------------------------
def softmax_rows(x: np.ndarray) -> np.ndarray:
    """Numerically stable row-wise softmax (subtract row max before exponentiating).

    Implemented by hand so the verification suite can prove it equals SciPy's.
    """
    x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)


def scaled_dot_product_attention(
    Q: np.ndarray, K: np.ndarray, V: np.ndarray, mask: Optional[np.ndarray] = None
):
    """Compute attention for one head.

    Parameters
    ----------
    Q, K, V : ``(seq, d_head)``
    mask    : optional ``(seq, seq)`` additive mask (``-inf`` where disallowed).

    Returns
    -------
    (output, weights, scores) where
        scores  = QKᵀ / √d_head        (pre-softmax, post-scaling)
        weights = softmax(scores)      (each row sums to 1)
        output  = weights · V
    """
    d_head = Q.shape[-1]
    scores = (Q @ K.T) / np.sqrt(d_head)     # (seq, seq)
    if mask is not None:
        scores = scores + mask
    weights = softmax_rows(scores)           # (seq, seq), row-stochastic
    output = weights @ V                     # (seq, d_head)
    return output, weights, scores


# ---------------------------------------------------------------------------
# Multi-head self-attention block
# ---------------------------------------------------------------------------
@dataclass
class AttentionResult:
    """Everything the UI needs to visualise one self-attention block."""
    token_labels: List[str]
    X: np.ndarray                 # (seq, d_model) input embeddings
    Wq: np.ndarray                # (d_model, d_model)
    Wk: np.ndarray
    Wv: np.ndarray
    Wo: np.ndarray
    Q: np.ndarray                 # (heads, seq, d_head)
    K: np.ndarray
    V: np.ndarray
    scores: np.ndarray            # (heads, seq, seq)  scaled, pre-softmax
    weights: np.ndarray           # (heads, seq, seq)  post-softmax
    head_outputs: np.ndarray      # (heads, seq, d_head)
    output: np.ndarray            # (seq, d_model)
    n_heads: int
    d_model: int
    d_head: int
    causal: bool


class MultiHeadSelfAttention:
    """A from-scratch multi-head self-attention block.

    The projection matrices ``Wq, Wk, Wv, Wo`` are random but seeded, standing
    in for the *learned* parameters of a trained model.  The point of the
    visualization is the **mechanism**, which is identical whether the weights
    are learned or random.
    """

    def __init__(self, d_model: int = 24, n_heads: int = 3, seed: int = 42):
        if d_model % n_heads != 0:
            raise ValueError(f"d_model ({d_model}) must be divisible by n_heads ({n_heads}).")
        self.d_model = d_model
        self.n_heads = n_heads
        self.d_head = d_model // n_heads
        rng = np.random.default_rng(seed)
        # Xavier/Glorot-ish scaling keeps activations well-conditioned.
        scale = 1.0 / np.sqrt(d_model)
        self.Wq = rng.standard_normal((d_model, d_model)) * scale
        self.Wk = rng.standard_normal((d_model, d_model)) * scale
        self.Wv = rng.standard_normal((d_model, d_model)) * scale
        self.Wo = rng.standard_normal((d_model, d_model)) * scale

    def _split_heads(self, M: np.ndarray) -> np.ndarray:
        """``(seq, d_model)`` → ``(heads, seq, d_head)``."""
        seq = M.shape[0]
        return M.reshape(seq, self.n_heads, self.d_head).transpose(1, 0, 2)

    def forward(self, X: np.ndarray, token_labels: List[str], causal: bool = False) -> AttentionResult:
        """Run the block on input ``X`` (shape ``(seq, d_model)``).

        Set ``causal=True`` to apply a lower-triangular mask — this is precisely
        the difference between a BART/T5 *encoder* (full, bidirectional
        attention) and the *decoder* (each position may only attend to earlier
        positions).
        """
        seq = X.shape[0]
        # linear projections, then reshape into heads
        Qh = self._split_heads(X @ self.Wq)
        Kh = self._split_heads(X @ self.Wk)
        Vh = self._split_heads(X @ self.Wv)

        mask = None
        if causal:
            # additive mask: 0 on/below the diagonal, -inf above it
            mask = np.triu(np.full((seq, seq), -np.inf), k=1)

        scores = np.zeros((self.n_heads, seq, seq))
        weights = np.zeros((self.n_heads, seq, seq))
        head_outputs = np.zeros((self.n_heads, seq, self.d_head))
        for h in range(self.n_heads):
            out_h, w_h, s_h = scaled_dot_product_attention(Qh[h], Kh[h], Vh[h], mask)
            head_outputs[h] = out_h
            weights[h] = w_h
            scores[h] = s_h

        # concatenate heads back to (seq, d_model) and apply the output projection
        concat = head_outputs.transpose(1, 0, 2).reshape(seq, self.d_model)
        output = concat @ self.Wo

        return AttentionResult(
            token_labels=token_labels, X=X,
            Wq=self.Wq, Wk=self.Wk, Wv=self.Wv, Wo=self.Wo,
            Q=Qh, K=Kh, V=Vh, scores=scores, weights=weights,
            head_outputs=head_outputs, output=output,
            n_heads=self.n_heads, d_model=self.d_model, d_head=self.d_head, causal=causal,
        )


def run_attention(
    tokens: List[Token], d_model: int = 24, n_heads: int = 3,
    causal: bool = False, seed: int = 42,
) -> AttentionResult:
    """Convenience end-to-end: tokens → embeddings → multi-head self-attention."""
    labels = [t.text for t in tokens]
    X = build_embeddings(tokens, d_model, seed=seed)
    block = MultiHeadSelfAttention(d_model=d_model, n_heads=n_heads, seed=seed)
    return block.forward(X, labels, causal=causal)
