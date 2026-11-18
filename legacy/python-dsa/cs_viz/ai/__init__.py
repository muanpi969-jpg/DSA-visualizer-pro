"""Transformer mechanics and verification helpers."""

from cs_viz.ai.tokenization import PedagogicalTokenizer
from cs_viz.ai.transformer import (
    AttentionTrace,
    VerificationReport,
    build_attention_trace,
    verify_attention_math,
)

__all__ = [
    "AttentionTrace",
    "PedagogicalTokenizer",
    "VerificationReport",
    "build_attention_trace",
    "verify_attention_math",
]
