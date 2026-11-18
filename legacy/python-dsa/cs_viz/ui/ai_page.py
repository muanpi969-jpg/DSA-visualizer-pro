"""Streamlit page for Transformer mechanics."""

from __future__ import annotations

import numpy as np
import pandas as pd
import streamlit as st

from cs_viz.ai.tokenization import PedagogicalTokenizer
from cs_viz.ai.transformer import AttentionMode, build_attention_trace, verify_attention_math
from cs_viz.ai.visualizations import attention_heatmap, matrix_heatmap, shape_flow_table


DEFAULT_SOURCE = "The encoder reads the source sentence."
DEFAULT_TARGET = "The decoder attends to encoder states."


def render_ai_page() -> None:
    """Render the AI/ML mechanics lab."""

    st.title("Transformer Mechanics Lab")
    input_col, config_col = st.columns([3, 2])
    with input_col:
        source_text = st.text_area("Source text", value=DEFAULT_SOURCE, height=96)
        target_text = st.text_area("Target text", value=DEFAULT_TARGET, height=96)
    with config_col:
        mode = st.selectbox(
            "Attention mode",
            options=[
                "Encoder self-attention",
                "Decoder causal self-attention",
                "Encoder-decoder cross-attention",
            ],
            index=2,
        )
        d_model = st.slider("Embedding dimension", min_value=4, max_value=32, value=8, step=4)
        d_k = st.slider("Q/K dimension", min_value=4, max_value=32, value=8, step=4)
        seed = st.number_input("Deterministic seed", min_value=0, value=7, step=1)
        lowercase = st.checkbox("Lowercase tokenizer", value=True)

    trace = build_attention_trace(
        source_text=source_text,
        target_text=target_text,
        mode=mode,  # type: ignore[arg-type]
        d_model=d_model,
        d_k=d_k,
        d_v=d_k,
        seed=int(seed),
        lowercase=lowercase,
    )

    token_col, flow_col = st.columns([2, 3])
    with token_col:
        st.subheader("Tokenization")
        tokenizer = PedagogicalTokenizer(lowercase=lowercase).fit((source_text, target_text))
        token_rows = []
        for stream_name, encoded in (("source", trace.source), ("target", trace.target)):
            token_rows.extend(
                {
                    "stream": stream_name,
                    "position": position,
                    "token": token,
                    "id": token_id,
                }
                for position, (token, token_id) in enumerate(zip(encoded.tokens, encoded.token_ids))
            )
        st.dataframe(pd.DataFrame(token_rows), hide_index=True, width="stretch")
        with st.expander("Vocabulary"):
            st.dataframe(pd.DataFrame(tokenizer.vocabulary_rows()), hide_index=True, width="stretch")

    with flow_col:
        st.subheader("Matrix Flow")
        st.plotly_chart(shape_flow_table(trace), width="stretch")

    heatmap_col, inspector_col = st.columns([3, 2])
    with heatmap_col:
        st.plotly_chart(attention_heatmap(trace), width="stretch")
    with inspector_col:
        st.subheader("Matrix Inspector")
        matrix_name = st.selectbox("Matrix", options=list(trace.matrix_options))
        matrix = trace.matrix_options[matrix_name]
        row_sums = trace.attention_weights.sum(axis=1)
        st.metric("Attention row-sum max error", f"{np.max(np.abs(row_sums - 1.0)):.2e}")
        st.dataframe(
            pd.DataFrame(matrix).round(4),
            width="stretch",
            height=220,
        )

    x_labels, y_labels = _labels_for_matrix(trace, matrix_name)
    st.plotly_chart(
        matrix_heatmap(matrix, title=matrix_name, x_labels=x_labels, y_labels=y_labels),
        width="stretch",
    )

    with st.expander("Numerical verification"):
        report = verify_attention_math()
        status = "PASS" if report.passed else "FAIL"
        st.metric("Verification", status)
        st.write(
            {
                "vectorized_reference_error": report.vectorized_reference_error,
                "row_sum_error": report.row_sum_error,
                "gradient_error": report.gradient_error,
                "tolerance": report.tolerance,
            }
        )
        for detail in report.details:
            st.write(f"- {detail}")


def _labels_for_matrix(trace, matrix_name: str):
    """Return axis labels that match the selected matrix."""

    if matrix_name.startswith("Queries") or matrix_name.startswith("Context"):
        return None, trace.query_tokens
    if matrix_name.startswith("Keys") or matrix_name.startswith("Values"):
        return None, trace.key_tokens
    if matrix_name.startswith("Scaled scores") or matrix_name.startswith("Attention weights"):
        return trace.key_tokens, trace.query_tokens
    if matrix_name.startswith("Source"):
        return None, trace.source.tokens
    if matrix_name.startswith("Target"):
        return None, trace.target.tokens
    return None, None
