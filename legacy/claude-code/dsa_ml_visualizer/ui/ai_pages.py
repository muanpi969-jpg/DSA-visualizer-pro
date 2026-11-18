"""
ui.ai_pages
===========

Streamlit page for the **AI / ML module**: a visual dissection of a Transformer
self-attention block (the engine inside BART / T5).

The page walks through the pipeline in tabs that mirror the data flow:

* **Tokenize** — raw text → tokens → ids → embeddings (+ positional encoding).
* **Q · K · V** — the three linear projections of the input, per head.
* **Attention** — QKᵀ scaling → softmax → weighted sum of V, with the iconic
  attention heatmap and a drill-down into one query token's distribution.
* **Verify** — runs :mod:`core.verification` live so the user can confirm the
  matrix math obeys standard ML principles.

All numbers come from :mod:`ai.attention`, which implements the math from
scratch in NumPy.
"""

from __future__ import annotations

import numpy as np
import plotly.graph_objects as go
import streamlit as st

from ai import tokenizer as tok
from ai.attention import run_attention
from core.verification import run_all_checks
from ui.components import COLORS

_LAYOUT = dict(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
               font=dict(color="#c7d0dd"), margin=dict(l=10, r=10, t=40, b=10))


def _matrix_heatmap(M, x_labels, y_labels, title, colorscale="RdBu", zmid=0.0, height=360):
    """Render a labelled matrix as a heatmap (used for embeddings, Q/K/V, scores)."""
    fig = go.Figure(go.Heatmap(
        z=M, x=x_labels, y=y_labels, colorscale=colorscale, zmid=zmid,
        colorbar=dict(thickness=12), hovertemplate="%{y} · %{x}: %{z:.3f}<extra></extra>",
    ))
    fig.update_layout(title=title, height=height, **_LAYOUT)
    fig.update_yaxes(autorange="reversed")
    return fig


# ---------------------------------------------------------------------------
def _tokenize_tab(tokens):
    st.markdown("#### 1 · Tokenization")
    st.caption("Raw text is split into tokens, each mapped to an integer id that "
               "indexes a row of the embedding table. `##` marks a subword continuation; "
               "`<s>`/`</s>` are special boundary tokens.")
    # token chips
    chip_html = ""
    for t in tokens:
        bg = "#9b59b6" if t.is_special else ("#4477c4" if t.text.startswith("##") else "#2f3b4e")
        chip_html += (f"<span style='display:inline-block;margin:3px;padding:5px 9px;"
                      f"border-radius:7px;background:{bg};color:#fff;font-family:monospace;"
                      f"font-size:13px'>{t.text}<span style='opacity:.6;font-size:11px'>"
                      f" · {t.token_id}</span></span>")
    st.markdown(chip_html, unsafe_allow_html=True)
    st.caption(tok.summary(tokens))


def _embeddings_tab(res):
    st.markdown("#### 2 · Input embeddings  `X = token_embedding + positional_encoding`")
    st.caption(f"Shape **(seq={res.X.shape[0]}, d_model={res.d_model})**. Each row is one "
               "token's vector entering the attention block.")
    st.plotly_chart(
        _matrix_heatmap(res.X, [f"d{i}" for i in range(res.d_model)], res.token_labels,
                        "X — input embeddings", height=max(280, 26 * len(res.token_labels))),
        width="stretch")


def _qkv_tab(res):
    st.markdown("#### 3 · Linear projections  `Q = X·Wq`, `K = X·Wk`, `V = X·Wv`")
    st.caption("Each attention head gets its own slice of Q, K, V. These are the *learned* "
               "views of every token: what it's looking for (Q), what it offers as a key (K), "
               "and what it passes on (V).")
    head = st.selectbox("Head", list(range(res.n_heads)), key="qkv_head",
                        format_func=lambda h: f"Head {h + 1}")
    dims = [f"h{head}·d{i}" for i in range(res.d_head)]
    c1, c2, c3 = st.columns(3)
    with c1:
        st.plotly_chart(_matrix_heatmap(res.Q[head], dims, res.token_labels, "Q", height=320),
                        width="stretch")
    with c2:
        st.plotly_chart(_matrix_heatmap(res.K[head], dims, res.token_labels, "K", height=320),
                        width="stretch")
    with c3:
        st.plotly_chart(_matrix_heatmap(res.V[head], dims, res.token_labels, "V", height=320),
                        width="stretch")


def _attention_tab(res):
    st.markdown("#### 4 · Scaled dot-product attention  "
                "`A = softmax(QKᵀ / √d_head)`,  `output = A·V`")
    st.caption("The attention matrix: row *i* shows how much query token *i* attends to every "
               "key token. Each row sums to 1. The 1/√d_head factor keeps the scores from "
               "saturating the softmax.")
    head = st.selectbox("Head", list(range(res.n_heads)), key="attn_head",
                        format_func=lambda h: f"Head {h + 1}")

    c1, c2 = st.columns(2)
    with c1:
        st.plotly_chart(
            _matrix_heatmap(res.scores[head], res.token_labels, res.token_labels,
                            "Scores  QKᵀ/√d_head  (pre-softmax)", colorscale="RdBu", height=380),
            width="stretch")
    with c2:
        fig = go.Figure(go.Heatmap(
            z=res.weights[head], x=res.token_labels, y=res.token_labels,
            colorscale="Oranges", zmin=0, zmax=1, colorbar=dict(thickness=12),
            hovertemplate="query %{y} → key %{x}: %{z:.3f}<extra></extra>"))
        fig.update_layout(title="Attention weights  A  (post-softmax)", height=380, **_LAYOUT)
        fig.update_yaxes(autorange="reversed")
        st.plotly_chart(fig, width="stretch")

    st.markdown("##### Drill into one query token")
    q_label = st.selectbox("Query token", res.token_labels, key="attn_query")
    qi = res.token_labels.index(q_label)
    weights_row = res.weights[head][qi]
    scores_row = res.scores[head][qi]

    bar = go.Figure(go.Bar(x=res.token_labels, y=weights_row, marker_color=COLORS["current"],
                           text=[f"{w:.2f}" for w in weights_row], textposition="outside"))
    bar.update_layout(title=f"How '{q_label}' distributes its attention (head {head + 1})",
                      height=300, yaxis_title="weight", **_LAYOUT)
    bar.update_yaxes(range=[0, 1])
    st.plotly_chart(bar, width="stretch")

    top = int(np.argmax(weights_row))
    st.success(f"`{q_label}` attends most strongly to **`{res.token_labels[top]}`** "
               f"(weight {weights_row[top]:.3f}). Raw score before softmax was "
               f"{scores_row[top]:.3f}; the row of weights sums to {weights_row.sum():.4f} (=1). "
               f"The output for this token is the weighted sum of all value vectors V.")


def _verify_tab():
    st.markdown("#### 5 · Verification — does the math obey ML principles?")
    st.caption("These checks re-derive each quantity independently (and cross-check against "
               "`scipy.special.softmax`). They run live, every time, and are also enforced in "
               "`tests/test_attention.py`.")
    results = run_all_checks()
    for r in results:
        icon = "✅" if r.passed else "❌"
        st.markdown(f"{icon} **{r.name}**  \n&nbsp;&nbsp;&nbsp;<code>{r.detail}</code>",
                    unsafe_allow_html=True)
    if all(r.passed for r in results):
        st.success(f"All {len(results)} verification checks passed — the attention "
                   "implementation matches standard scaled-dot-product / multi-head attention.")
    else:
        st.error("Some checks failed — see details above.")


def attention_page() -> None:
    st.subheader("🤖 Transformer Attention — under the hood (BART / T5)")

    with st.container(border=True):
        c1, c2 = st.columns([3, 2])
        text = c1.text_input("Input text to analyse",
                             "The cat sat on the mat", key="ai_text")
        model = c2.selectbox("Model boundary convention", ["BART", "T5"], key="ai_model")
        c3, c4, c5, c6 = st.columns(4)
        n_heads = c3.selectbox("Heads", [1, 2, 3, 4], index=2, key="ai_heads")
        d_per_head = c4.selectbox("Dim / head", [4, 8, 16], index=1, key="ai_dhead")
        causal = c5.toggle("Causal mask (decoder)", value=False, key="ai_causal",
                           help="Encoders (BART/T5) attend bidirectionally; decoders mask the future.")
        use_sub = c6.toggle("Subword split", value=True, key="ai_subword")

    if not text.strip():
        st.error("Enter some text.")
        return

    d_model = n_heads * d_per_head
    tokens = tok.tokenize(text, model=model, use_subwords=use_sub)
    if len(tokens) > 24:
        tokens = tokens[:24]
        st.warning("Truncated to 24 tokens for legibility.")
    res = run_attention(tokens, d_model=d_model, n_heads=n_heads, causal=causal, seed=42)

    st.caption(f"**Config —** model={model}, tokens={len(tokens)}, d_model={d_model}, "
               f"heads={n_heads}, d_head={res.d_head}, attention="
               f"{'causal (decoder)' if causal else 'full (encoder)'}.")

    t1, t2, t3, t4, t5 = st.tabs(
        ["① Tokenize", "② Embeddings", "③ Q·K·V", "④ Attention", "⑤ Verify"])
    with t1:
        _tokenize_tab(tokens)
    with t2:
        _embeddings_tab(res)
    with t3:
        _qkv_tab(res)
    with t4:
        _attention_tab(res)
    with t5:
        _verify_tab()


PAGES = {"Transformer Attention": attention_page}
