"""
ui.dsa_pages
============

Streamlit pages and Plotly figure builders for the **Data Structures &
Algorithms** module.  Each page:

1. collects user input (a custom array, an edge list, two strings …);
2. runs the corresponding instrumented algorithm to get a ``StepRecorder``;
3. renders the active frame with a builder that only knows about the small,
   shared highlight vocabulary defined in :mod:`core.state`.

The four families intentionally exercise different mental models:
array indices, graph frontiers, raw pointers, and 2-D DP state.
"""

from __future__ import annotations

from typing import Dict, List, Tuple

import plotly.graph_objects as go
import streamlit as st

from core.state import Step
from dsa import dynamic_programming as dp
from dsa import graph_traversal as gt
from dsa import linked_list as ll
from dsa import sorting
from ui.components import COLORS, caption, metrics_row, step_navigator

_PLOTLY_LAYOUT = dict(
    paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
    font=dict(color="#c7d0dd"), margin=dict(l=10, r=10, t=30, b=10),
)


# ===========================================================================
# Sorting
# ===========================================================================
def _sorting_figure(step: Step) -> go.Figure:
    a: List[int] = step.snapshot["array"]
    hl = step.highlights
    colors = [COLORS["default"]] * len(a)
    for i in hl.get("sorted", []):
        colors[i] = COLORS["sorted"]
    for i in hl.get("compared", []):
        colors[i] = COLORS["compared"]
    if "key" in hl:
        colors[hl["key"]] = COLORS["key"]
    if "pivot" in hl:
        colors[hl["pivot"]] = COLORS["pivot"]
    for i in hl.get("swapped", []):
        colors[i] = COLORS["swapped"]

    fig = go.Figure(go.Bar(
        x=list(range(len(a))), y=a, marker_color=colors,
        text=a, textposition="outside", cliponaxis=False,
    ))
    fig.update_layout(height=420, xaxis_title="index", yaxis_title="value", **_PLOTLY_LAYOUT)
    fig.update_xaxes(showgrid=False, tickmode="linear")
    fig.update_yaxes(showgrid=True, gridcolor="rgba(255,255,255,0.06)")
    return fig


def sorting_page() -> None:
    st.subheader("🔢 Sorting Algorithms")
    st.caption("Watch comparisons and swaps. Colours: "
               "🟧 compared · 🟥 swapped · 🟩 sorted · 🟪 pivot · 🟦 key.")

    c1, c2 = st.columns([3, 2])
    algo_name = c1.selectbox("Algorithm", list(sorting.ALGORITHMS), key="sort_algo")
    raw = c2.text_input("Custom array (comma-separated)", "5, 2, 9, 1, 5, 6, 3", key="sort_arr")
    try:
        arr = [int(x) for x in raw.replace(" ", "").split(",") if x != ""]
        assert 1 <= len(arr) <= 20
    except (ValueError, AssertionError):
        st.error("Enter 1–20 integers, comma-separated.")
        return

    st.caption(f"**Complexity —** {sorting.COMPLEXITY[algo_name]}")
    rec = sorting.ALGORITHMS[algo_name](arr)
    idx = step_navigator(len(rec), key=f"sort_step::{algo_name}::{raw}")
    step = rec[idx]
    st.plotly_chart(_sorting_figure(step), width="stretch")
    metrics_row(step)
    caption(step)


# ===========================================================================
# Graph traversal
# ===========================================================================
@st.cache_data(show_spinner=False)
def _layout_for(edge_text: str) -> Dict[str, Tuple[float, float]]:
    """Cache the (deterministic) spring layout so it doesn't jitter between steps."""
    return gt.spring_layout(gt.parse_edges(edge_text))


def _graph_figure(step: Step, pos: Dict[str, Tuple[float, float]]) -> go.Figure:
    adj = step.snapshot["adj"]
    hl = step.highlights
    visited = set(hl.get("visited", []))
    frontier = set(hl.get("frontier", []))
    current = hl.get("current")
    tree_edges = {tuple(sorted(e)) for e in hl.get("tree_edges", [])}

    fig = go.Figure()
    # base edges
    for u in adj:
        for v in adj[u]:
            if u < v:
                in_tree = tuple(sorted((u, v))) in tree_edges
                fig.add_trace(go.Scatter(
                    x=[pos[u][0], pos[v][0]], y=[pos[u][1], pos[v][1]],
                    mode="lines", hoverinfo="skip", showlegend=False,
                    line=dict(width=4 if in_tree else 1.4,
                              color=COLORS["current"] if in_tree else "rgba(255,255,255,0.18)"),
                ))
    # nodes
    for node, (x, y) in pos.items():
        if node == current:
            color = COLORS["current"]
        elif node in visited:
            color = COLORS["visited"]
        elif node in frontier:
            color = COLORS["frontier"]
        else:
            color = COLORS["default"]
        fig.add_trace(go.Scatter(
            x=[x], y=[y], mode="markers+text", text=[node], textposition="middle center",
            textfont=dict(color="white", size=14), hoverinfo="text", showlegend=False,
            marker=dict(size=40, color=color, line=dict(width=2, color="rgba(255,255,255,0.4)")),
        ))
    fig.update_layout(height=460, **_PLOTLY_LAYOUT)
    fig.update_xaxes(visible=False)
    fig.update_yaxes(visible=False)
    return fig


def graph_page() -> None:
    st.subheader("🕸️ Graph Traversal")
    st.caption("Colours: 🟧 current · 🟨 in queue/stack (frontier) · 🟩 visited. "
               "Bold orange edges form the traversal tree.")

    c1, c2 = st.columns([3, 2])
    algo_name = c1.selectbox("Algorithm", list(gt.ALGORITHMS), key="graph_algo")
    edge_text = c2.text_input("Edges (e.g. A-B, B-C)", gt.SAMPLE_GRAPH, key="graph_edges")
    adj = gt.parse_edges(edge_text)
    if not adj:
        st.error("Enter at least one edge like `A-B`.")
        return
    start = c1.selectbox("Start node", sorted(adj), key="graph_start")

    pos = _layout_for(edge_text)
    rec = gt.ALGORITHMS[algo_name](adj, start)
    idx = step_navigator(len(rec), key=f"graph_step::{algo_name}::{edge_text}::{start}")
    step = rec[idx]
    st.plotly_chart(_graph_figure(step, pos), width="stretch")
    metrics_row(step)
    caption(step)


# ===========================================================================
# Linked list (pointer manipulation)
# ===========================================================================
def _linked_list_figure(step: Step) -> go.Figure:
    values = step.snapshot["values"]
    nxt = step.snapshot["next"]
    hl = step.highlights
    n = len(values)
    # conceptual pointers → the node id they currently reference
    pointer_at: Dict[int, List[str]] = {}
    for name in ("prev", "curr", "next", "slow", "fast", "middle"):
        if name in hl and hl[name] is not None and hl[name] != -1:
            pointer_at.setdefault(hl[name], []).append(name)

    fig = go.Figure()
    y0 = 0.0
    # next-pointer arrows (can point backward after a reversal)
    for i in range(n):
        j = nxt[i]
        if j == -1:
            fig.add_annotation(x=i + 0.42, y=y0, ax=i, ay=y0, xref="x", yref="y",
                               axref="x", ayref="y", showarrow=True, arrowhead=2,
                               arrowsize=1.2, arrowwidth=2, arrowcolor="#7c8aa0")
            fig.add_annotation(x=i + 0.5, y=y0, text="∅", showarrow=False,
                               font=dict(color="#7c8aa0", size=16))
        else:
            curve = 0.28 if j > i else -0.28
            fig.add_annotation(x=j, y=y0 + (0.05 if j > i else -0.05), ax=i, ay=y0,
                               xref="x", yref="y", axref="x", ayref="y", showarrow=True,
                               arrowhead=2, arrowsize=1.1, arrowwidth=2,
                               arrowcolor="#e9a13b", standoff=22, startstandoff=22,
                               yshift=int(curve * 40))
    # node boxes
    for i, val in enumerate(values):
        color = COLORS["default"]
        if i in pointer_at:
            names = pointer_at[i]
            if "curr" in names or "slow" in names:
                color = COLORS["current"]
            elif "middle" in names:
                color = COLORS["sorted"]
            else:
                color = COLORS["key"]
        fig.add_trace(go.Scatter(
            x=[i], y=[y0], mode="markers+text", text=[str(val)], textposition="middle center",
            textfont=dict(color="white", size=16), hoverinfo="text", showlegend=False,
            marker=dict(size=46, color=color, symbol="square",
                        line=dict(width=2, color="rgba(255,255,255,0.45)")),
        ))
        if i in pointer_at:
            fig.add_annotation(x=i, y=y0 + 0.55, text="<br>".join(pointer_at[i]),
                               showarrow=False, font=dict(color="#e6edf3", size=12))
    fig.update_layout(height=320, **_PLOTLY_LAYOUT)
    fig.update_xaxes(visible=False, range=[-0.8, n - 0.2])
    fig.update_yaxes(visible=False, range=[-1, 1.2])
    return fig


def linked_list_page() -> None:
    st.subheader("⛓️ Linked List — Pointer Manipulation")
    st.caption("Nodes keep their memory slot; only the `next` arrows are rewired — "
               "just like real pointers. Labels above a node name the pointers on it.")

    c1, c2 = st.columns([3, 2])
    algo_name = c1.selectbox("Operation", list(ll.ALGORITHMS), key="ll_algo")
    raw = c2.text_input("Node values (comma-separated)", "1, 2, 3, 4, 5", key="ll_vals")
    try:
        vals = [int(x) for x in raw.replace(" ", "").split(",") if x != ""]
        assert 1 <= len(vals) <= 12
    except (ValueError, AssertionError):
        st.error("Enter 1–12 integers, comma-separated.")
        return

    rec = ll.ALGORITHMS[algo_name](vals)
    idx = step_navigator(len(rec), key=f"ll_step::{algo_name}::{raw}")
    step = rec[idx]
    st.plotly_chart(_linked_list_figure(step), width="stretch")
    metrics_row(step)
    caption(step)


# ===========================================================================
# Dynamic programming
# ===========================================================================
def _dp_figure(step: Step) -> go.Figure:
    table = step.snapshot["table"]
    rows = step.snapshot["rows"]
    cols = step.snapshot["cols"]
    hl = step.highlights
    n, m = len(table), len(table[0])

    # cell background = highlight role (current / dependency / path / plain)
    current = tuple(hl["current"]) if "current" in hl else None
    deps = {tuple(d) for d in hl.get("dependencies", [])}
    path = {tuple(p) for p in hl.get("path", [])}
    z = [[0] * m for _ in range(n)]
    for r in range(n):
        for c in range(m):
            if (r, c) == current:
                z[r][c] = 3
            elif (r, c) in deps:
                z[r][c] = 2
            elif (r, c) in path:
                z[r][c] = 1
    colorscale = [[0.0, COLORS["muted"]], [0.33, COLORS["path"]],
                  [0.66, COLORS["dependency"]], [1.0, COLORS["current"]]]

    fig = go.Figure(go.Heatmap(
        z=z, zmin=0, zmax=3, colorscale=colorscale, showscale=False,
        xgap=3, ygap=3, hoverinfo="skip",
    ))
    # annotate each cell with its value
    for r in range(n):
        for c in range(m):
            fig.add_annotation(x=c, y=r, text=str(table[r][c]), showarrow=False,
                               font=dict(color="white", size=14))
    fig.update_layout(height=460, **_PLOTLY_LAYOUT)
    fig.update_xaxes(tickmode="array", tickvals=list(range(m)),
                     ticktext=[f"∅" if x == "" else x for x in cols], side="top",
                     title="string B →", showgrid=False)
    fig.update_yaxes(tickmode="array", tickvals=list(range(n)),
                     ticktext=[f"∅" if x == "" else x for x in rows], autorange="reversed",
                     title="↓ string A", showgrid=False)
    return fig


def dp_page() -> None:
    st.subheader("📊 Dynamic Programming")
    st.caption("Bottom-up table filling. Colours: 🟧 cell being computed · "
               "🟦 cells it depends on · the final orange trail is the reconstructed path.")

    c1, c2, c3 = st.columns([3, 2, 2])
    algo_name = c1.selectbox("Problem", list(dp.ALGORITHMS), key="dp_algo")
    a = c2.text_input("String A", "kitten", key="dp_a")
    b = c3.text_input("String B", "sitting", key="dp_b")
    a, b = a.strip()[:12], b.strip()[:12]
    if not a or not b:
        st.error("Enter two non-empty strings (≤ 12 chars each).")
        return

    rec = dp.ALGORITHMS[algo_name](a, b)
    idx = step_navigator(len(rec), key=f"dp_step::{algo_name}::{a}::{b}")
    step = rec[idx]
    st.plotly_chart(_dp_figure(step), width="stretch")
    metrics_row(step)
    caption(step)


#: Sub-page dispatch table consumed by app.py.
PAGES = {
    "Sorting": sorting_page,
    "Graph Traversal": graph_page,
    "Linked List (pointers)": linked_list_page,
    "Dynamic Programming": dp_page,
}
