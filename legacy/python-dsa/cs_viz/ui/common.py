"""Shared Streamlit UI helpers."""

from __future__ import annotations

import hashlib
import re
from typing import Sequence

import streamlit as st


def parse_int_sequence(raw: str, default: Sequence[int]) -> list[int]:
    """Parse a comma/space separated integer sequence."""

    values = [int(match.group(0)) for match in re.finditer(r"-?\d+", raw)]
    return values if values else list(default)


def stable_signature(*parts: object) -> str:
    """Create a stable signature for resetting stepper state on input changes."""

    digest = hashlib.sha256()
    for part in parts:
        digest.update(repr(part).encode("utf-8"))
    return digest.hexdigest()


def stepper(key: str, step_count: int, signature: str) -> int:
    """Render Prev/Next controls and return the current step index."""

    signature_key = f"{key}_signature"
    index_key = f"{key}_index"
    if st.session_state.get(signature_key) != signature:
        st.session_state[signature_key] = signature
        st.session_state[index_key] = 0

    current = int(st.session_state.get(index_key, 0))
    current = max(0, min(current, step_count - 1))
    st.session_state[index_key] = current

    previous_col, next_col, reset_col, progress_col = st.columns([1, 1, 1, 4])
    with previous_col:
        if st.button("Prev", key=f"{key}_previous", disabled=current == 0, width="stretch"):
            current -= 1
    with next_col:
        if st.button(
            "Next",
            key=f"{key}_next",
            disabled=current >= step_count - 1,
            width="stretch",
        ):
            current += 1
    with reset_col:
        if st.button("Reset", key=f"{key}_reset", width="stretch"):
            current = 0
    with progress_col:
        st.progress((current + 1) / max(step_count, 1), text=f"Step {current + 1} of {step_count}")

    st.session_state[index_key] = current
    return current


def render_step_narration(action: str, explanation: str, pseudocode_line: str) -> None:
    """Render the explanatory side panel for a step."""

    st.subheader(action)
    st.write(explanation)
    st.code(pseudocode_line, language="c")
