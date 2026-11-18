"""
app.py — ML & DSA Visual Lab
============================

Main Streamlit entry point.  This module is intentionally thin: it only wires up
navigation and global page configuration.  All algorithmic logic lives in
``dsa/`` and ``ai/``; all rendering lives in ``ui/``.  This keeps the separation
of concerns clean and makes every algorithm independently testable without
Streamlit.

Run it with::

    streamlit run app.py

Architecture
------------
::

    app.py                 ← navigation shell (this file)
    core/                  ← step-recording state machine + AI verification
    dsa/                   ← pure algorithm logic, emits Step streams
    ai/                    ← tokenizer + from-scratch attention (NumPy/SciPy)
    ui/                    ← Streamlit pages + Plotly figure builders
    tests/                 ← pytest verification of the AI matrix math
"""

from __future__ import annotations

import streamlit as st

from ui import ai_pages, dsa_pages

st.set_page_config(
    page_title="ML & DSA Visual Lab",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded",
)

# -- light global styling ---------------------------------------------------
st.markdown(
    """
    <style>
      .block-container { padding-top: 2.2rem; max-width: 1300px; }
      [data-testid="stMetricValue"] { font-size: 1.3rem; }
      h1, h2, h3 { letter-spacing: -0.01em; }
      div[data-testid="stExpander"] { border-radius: 12px; }
    </style>
    """,
    unsafe_allow_html=True,
)


def sidebar() -> tuple[str, str]:
    """Render navigation and return ``(module, sub_page)``."""
    with st.sidebar:
        st.title("🧠 Visual Lab")
        st.caption("Interactive visualizations of **Data Structures & Algorithms** "
                   "and **Transformer** mechanics — built from scratch.")
        st.divider()

        module = st.radio(
            "Module",
            ["Data Structures & Algorithms", "AI / ML — Transformers"],
            key="module",
        )
        st.divider()

        if module.startswith("Data"):
            sub = st.radio("Algorithm family", list(dsa_pages.PAGES), key="dsa_sub")
        else:
            sub = st.radio("Topic", list(ai_pages.PAGES), key="ai_sub")

        st.divider()
        with st.expander("ℹ️ How to use"):
            st.markdown(
                "- Tweak the **inputs** at the top of each page.\n"
                "- For DSA pages, use **⏮ ◀ ▶ ⏭** or the slider to step through "
                "the execution loop.\n"
                "- For the Transformer page, walk the **numbered tabs** left→right "
                "and open **⑤ Verify** to confirm the math.\n"
                "- Everything is recomputed live from your input."
            )
        st.caption("No pre-trained weights, no GPU — pure NumPy / SciPy.")
    return module, sub


def main() -> None:
    module, sub = sidebar()

    if module.startswith("Data"):
        st.title("Data Structures & Algorithms")
        st.caption("Step through the *execution loop* of classic algorithms — "
                   "comparisons, pointer rewiring, graph frontiers, and DP state.")
        dsa_pages.PAGES[sub]()
    else:
        st.title("AI / ML — Transformer Mechanics")
        st.caption("Unpack how encoder–decoder models like **BART** and **T5** work "
                   "under the hood: tokenization, the Q·K·V projections, and the "
                   "attention-weight linear algebra — all verifiable.")
        ai_pages.PAGES[sub]()


if __name__ == "__main__":
    main()
