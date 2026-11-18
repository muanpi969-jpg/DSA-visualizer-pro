"""
ui.components
=============

Reusable Streamlit + Plotly building blocks shared by the DSA and AI pages:

* a uniform **step navigator** (first / prev / next / last + slider) that drives
  the frame-by-frame replay for every algorithm;
* a compact **metrics row**;
* the shared colour palette so highlights mean the same thing everywhere.

Keeping these here means the per-algorithm pages stay focused on *what* to draw,
not on widget plumbing.
"""

from __future__ import annotations

from typing import Dict, List

import streamlit as st

from core.state import Step

# -- shared semantic colours ------------------------------------------------
COLORS = {
    "default": "#3a4a63",
    "compared": "#e9a13b",   # being looked at
    "swapped": "#d6504a",    # just moved
    "sorted": "#2bb673",     # finalised
    "pivot": "#9b59b6",      # quicksort pivot
    "key": "#4477c4",        # insertion-sort key
    "current": "#e97a2f",    # graph/DP active element
    "frontier": "#f1c40f",   # queue / stack
    "visited": "#2bb673",
    "dependency": "#4477c4",
    "path": "#e97a2f",
    "muted": "#26303f",
}


def step_navigator(n_steps: int, key: str) -> int:
    """Render the first/prev/next/last buttons + a slider; return the active index.

    The active index lives in ``st.session_state[key]`` so it survives reruns and
    can be mutated by the buttons *before* the slider widget is instantiated
    (the only Streamlit-safe ordering).  The value is clamped whenever the
    number of steps shrinks (e.g. the user shortens their input).
    """
    if key not in st.session_state:
        st.session_state[key] = 0
    # clamp in case the run got shorter than last time
    st.session_state[key] = max(0, min(st.session_state[key], n_steps - 1))

    b1, b2, b3, b4, _ = st.columns([1, 1, 1, 1, 6])
    if b1.button("⏮", key=f"{key}_first", help="First step", width="stretch"):
        st.session_state[key] = 0
    if b2.button("◀", key=f"{key}_prev", help="Previous step", width="stretch"):
        st.session_state[key] = max(0, st.session_state[key] - 1)
    if b3.button("▶", key=f"{key}_next", help="Next step", width="stretch"):
        st.session_state[key] = min(n_steps - 1, st.session_state[key] + 1)
    if b4.button("⏭", key=f"{key}_last", help="Last step", width="stretch"):
        st.session_state[key] = n_steps - 1

    if n_steps > 1:
        # slider keyed to the same session-state entry (no value= → no conflict)
        st.slider("Step", 0, n_steps - 1, key=key)
    return st.session_state[key]


def metrics_row(step: Step, extra: Dict[str, str] | None = None) -> None:
    """Render the step's running counters (plus optional extras) as metric tiles."""
    items: List[tuple[str, str]] = [(k.replace("_", " ").title(), str(v))
                                    for k, v in step.metrics.items()]
    if extra:
        items += [(k, v) for k, v in extra.items()]
    items.append(("Step", f"{step.index + 1}"))
    if not items:
        return
    cols = st.columns(len(items))
    for col, (label, value) in zip(cols, items):
        col.metric(label, value)


def caption(step: Step) -> None:
    """Show the narration for the current step in a callout box."""
    st.info(f"**Step {step.index + 1} — ** {step.description}")
