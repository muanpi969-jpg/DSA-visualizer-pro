"""Small deterministic tokenizer used for educational visualization.

This is not a byte-pair tokenizer and intentionally does not pretend to be the
exact tokenizer used by BART or T5. It provides a transparent, reproducible
token-to-id pipeline so students can see how text becomes indices before those
indices become vectors.
"""

from __future__ import annotations

from dataclasses import dataclass
import re


TOKEN_PATTERN = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?|\d+|[^\w\s]", re.UNICODE)


@dataclass(frozen=True)
class EncodedText:
    """Tokenization output."""

    text: str
    tokens: tuple[str, ...]
    token_ids: tuple[int, ...]


class PedagogicalTokenizer:
    """A tiny vocabulary-based tokenizer with stable special-token IDs."""

    special_tokens = ("<pad>", "<bos>", "<eos>", "<unk>")

    def __init__(self, lowercase: bool = True) -> None:
        self.lowercase = lowercase
        self.token_to_id: dict[str, int] = {
            token: index for index, token in enumerate(self.special_tokens)
        }
        self.id_to_token: dict[int, str] = {
            index: token for token, index in self.token_to_id.items()
        }

    def normalize(self, text: str) -> str:
        """Normalize text before token extraction."""

        return text.lower() if self.lowercase else text

    def tokenize(self, text: str) -> tuple[str, ...]:
        """Split text into word, number, and punctuation tokens."""

        normalized = self.normalize(text)
        tokens = tuple(TOKEN_PATTERN.findall(normalized))
        return tokens or ("<unk>",)

    def fit(self, texts: list[str] | tuple[str, ...]) -> "PedagogicalTokenizer":
        """Build a deterministic vocabulary from one or more texts."""

        for text in texts:
            for token in self.tokenize(text):
                if token not in self.token_to_id:
                    index = len(self.token_to_id)
                    self.token_to_id[token] = index
                    self.id_to_token[index] = token
        return self

    def encode(self, text: str, add_special_tokens: bool = True) -> EncodedText:
        """Convert text into tokens and integer IDs."""

        tokens = list(self.tokenize(text))
        if add_special_tokens:
            tokens = ["<bos>", *tokens, "<eos>"]
        token_ids = tuple(self.token_to_id.get(token, self.token_to_id["<unk>"]) for token in tokens)
        return EncodedText(text=text, tokens=tuple(tokens), token_ids=token_ids)

    def vocabulary_rows(self) -> list[dict[str, int | str]]:
        """Return table-friendly vocabulary rows."""

        return [
            {"token": token, "id": token_id}
            for token, token_id in sorted(self.token_to_id.items(), key=lambda item: item[1])
        ]
