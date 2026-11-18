"""
ai.tokenizer
============

A small, **dependency-free** tokenizer used to demonstrate the *first stage* of
a Transformer pipeline (BART / T5 style): turning raw text into a sequence of
discrete token ids that index an embedding table.

It is deliberately self-contained (no HuggingFace download required) but models
the pieces that matter pedagogically:

* **Special tokens** — sequence boundary markers.  BART uses ``<s> … </s>``;
  T5 appends ``</s>`` and uses sentinel tokens.  We expose this as a switch.
* **Subword splitting** — production tokenizers (BPE / SentencePiece) break rare
  words into sub-units so the vocabulary stays small and there are no OOV
  tokens.  We include a lightweight, transparent greedy splitter so students
  can *see* a long word fragment into pieces (rendered with the ``##``
  continuation convention).
* **Deterministic ids** — each token maps to a stable integer id via a hash into
  a fixed vocabulary size, mirroring "look up this token's row in the embedding
  matrix" without shipping a real 50k-row vocab file.

This is honest about being an illustration; the *attention math* downstream is
the real, verifiable part.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List

#: Pretend embedding-table size (BART-base is ~50265). Ids are taken mod this.
VOCAB_SIZE = 50265

#: A tiny set of common English suffixes used by the illustrative subword
#: splitter so that, e.g., "tokenization" → ["token", "##ization"].
_SUFFIXES = ["ization", "ising", "izing", "ation", "ically", " ness", " ment",
             "tion", "sion", "ing", "ers", "est", "ed", "ly", "er", "es", "s"]


@dataclass(frozen=True)
class Token:
    """One token after tokenization."""
    text: str          # surface form (with ## for subword continuations)
    token_id: int      # row index into the (pretend) embedding table
    is_special: bool   # True for <s>, </s>, etc.
    position: int      # 0-based position in the sequence


def _stable_id(token: str) -> int:
    """Deterministic, process-independent token id in ``[0, VOCAB_SIZE)``.

    Python's builtin ``hash`` is salted per process, so we use a small FNV-1a
    hash to guarantee the same token always lands on the same embedding row.
    """
    h = 0x811C9DC5
    for ch in token.encode("utf-8"):
        h ^= ch
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h % VOCAB_SIZE


def _subword_split(word: str) -> List[str]:
    """Greedy, illustrative subword split of a single (lowercased) word.

    Strips at most one recognised suffix and emits it as a ``##`` continuation
    piece.  Real BPE is learned from data; this just makes the *concept*
    visible without a vocab file.
    """
    if len(word) <= 4:
        return [word]
    for suf in _SUFFIXES:
        suf = suf.strip()
        if word.endswith(suf) and len(word) - len(suf) >= 3:
            return [word[: -len(suf)], "##" + suf]
    return [word]


def tokenize(text: str, model: str = "BART", use_subwords: bool = True) -> List[Token]:
    """Tokenize ``text`` into a list of :class:`Token`.

    Parameters
    ----------
    text:
        Raw input string.
    model:
        ``"BART"`` wraps the sequence in ``<s> … </s>``; ``"T5"`` appends a
        trailing ``</s>`` only.  This mirrors the real boundary conventions.
    use_subwords:
        If True, long words may be split into ``word`` + ``##suffix`` pieces.
    """
    # split into words and standalone punctuation, keeping everything
    raw = re.findall(r"[A-Za-z0-9']+|[^\sA-Za-z0-9]", text.strip())

    pieces: List[str] = []
    for w in raw:
        if use_subwords and w.isalpha():
            pieces.extend(_subword_split(w.lower()))
        else:
            pieces.append(w)

    # add model-specific special tokens
    if model.upper() == "BART":
        seq = ["<s>"] + pieces + ["</s>"]
    elif model.upper() == "T5":
        seq = pieces + ["</s>"]
    else:
        seq = pieces

    specials = {"<s>", "</s>", "<pad>", "<unk>", "<mask>"}
    tokens: List[Token] = []
    for pos, p in enumerate(seq):
        tokens.append(
            Token(
                text=p,
                token_id=_stable_id(p),
                is_special=p in specials,
                position=pos,
            )
        )
    return tokens


def summary(tokens: List[Token]) -> str:
    """Compact human-readable summary for captions."""
    n_special = sum(t.is_special for t in tokens)
    return (f"{len(tokens)} tokens "
            f"({n_special} special, {len(tokens) - n_special} content)")
