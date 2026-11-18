"""Streamlit entry point for the CS visualization engine."""

from __future__ import annotations

import streamlit as st

from cs_viz.ai.transformer import verify_attention_math
from cs_viz.ui.ai_page import render_ai_page
from cs_viz.ui.dsa_page import render_dsa_page


def main() -> None:
    """Run the Streamlit application."""

    st.set_page_config(
        page_title="CS Visualization Engine",
        page_icon="CS",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    st.sidebar.title("CS Visualization Engine")
    page = st.sidebar.radio(
        "Module",
        options=["DSA Lab", "Transformer Lab", "Verification"],
        index=0,
    )

    if page == "DSA Lab":
        render_dsa_page()
    elif page == "Transformer Lab":
        render_ai_page()
    else:
        _render_verification_page()


def _render_verification_page() -> None:
    """Render built-in verification checks."""

    st.title("Verification")
    report = verify_attention_math()
    status = "PASS" if report.passed else "FAIL"
    st.metric("Scaled dot-product attention", status)
    st.dataframe(
        [
            {"check": "Vectorized vs reference", "error": report.vectorized_reference_error},
            {"check": "Softmax row sums", "error": report.row_sum_error},
            {"check": "Finite-difference gradient", "error": report.gradient_error},
        ],
        hide_index=True,
        width="stretch",
    )
    st.write(f"Tolerance: `{report.tolerance}`")
    for detail in report.details:
        st.write(f"- {detail}")


if __name__ == "__main__":
    main()
