"""Plotly renderers for Transformer matrices."""

from __future__ import annotations

import numpy as np
import plotly.graph_objects as go

from cs_viz.ai.transformer import AttentionTrace


def _finite_for_display(matrix: np.ndarray) -> np.ndarray:
    """Replace infinities so Plotly heatmaps remain readable."""

    if np.isfinite(matrix).all():
        return matrix
    finite = matrix[np.isfinite(matrix)]
    floor = float(np.min(finite) - 1.0) if finite.size else -1.0
    return np.where(np.isfinite(matrix), matrix, floor)


def matrix_heatmap(
    matrix: np.ndarray,
    title: str,
    x_labels: list[str] | tuple[str, ...] | None = None,
    y_labels: list[str] | tuple[str, ...] | None = None,
    colorscale: str = "Viridis",
) -> go.Figure:
    """Render a numeric matrix as an annotated heatmap."""

    display = _finite_for_display(matrix)
    text = np.vectorize(lambda value: f"{value:.2f}")(matrix)
    figure = go.Figure(
        data=[
            go.Heatmap(
                z=display,
                x=x_labels,
                y=y_labels,
                colorscale=colorscale,
                text=text,
                texttemplate="%{text}",
                hovertemplate="row=%{y}<br>col=%{x}<br>value=%{text}<extra></extra>",
                colorbar=dict(len=0.78),
            )
        ]
    )
    figure.update_layout(
        title=title,
        height=430,
        margin=dict(l=24, r=24, t=64, b=48),
    )
    return figure


def attention_heatmap(trace: AttentionTrace) -> go.Figure:
    """Render attention distribution over query/key tokens."""

    return matrix_heatmap(
        trace.attention_weights,
        title=f"{trace.mode}: attention weights",
        x_labels=trace.key_tokens,
        y_labels=trace.query_tokens,
        colorscale="Blues",
    )


def shape_flow_table(trace: AttentionTrace) -> go.Figure:
    """Render the core Transformer matrix operations as a Plotly table."""

    rows = trace.shape_rows
    figure = go.Figure(
        data=[
            go.Table(
                header=dict(
                    values=["Operation", "Left", "Right", "Output"],
                    fill_color="#111827",
                    font=dict(color="white", size=13),
                    align="left",
                ),
                cells=dict(
                    values=[
                        [row["operation"] for row in rows],
                        [row["left"] for row in rows],
                        [row["right"] for row in rows],
                        [row["output"] for row in rows],
                    ],
                    fill_color="#f8fafc",
                    align="left",
                    height=30,
                ),
            )
        ]
    )
    figure.update_layout(height=320, margin=dict(l=0, r=0, t=8, b=8))
    return figure
