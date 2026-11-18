"""Plotly renderers for DSA traces."""

from __future__ import annotations

import plotly.graph_objects as go

from cs_viz.dsa.dynamic_programming import DPStep
from cs_viz.dsa.graph import GraphStep, circular_layout
from cs_viz.dsa.linked_list import LinkedListStep
from cs_viz.dsa.sorting import SortStep


COLORS = {
    "base": "#6b7280",
    "sorted": "#2e7d32",
    "compare": "#f59e0b",
    "key": "#2563eb",
    "current": "#dc2626",
    "frontier": "#f97316",
    "visited": "#16a34a",
    "undiscovered": "#9ca3af",
    "pointer": "#7c3aed",
    "transient": "#0f766e",
}


def insertion_sort_figure(step: SortStep) -> go.Figure:
    """Render an insertion-sort array snapshot as a color-coded bar chart."""

    indices = list(range(len(step.array)))
    colors: list[str] = []
    for index in indices:
        if index == step.key_index:
            colors.append(COLORS["key"])
        elif index in step.compare_indices:
            colors.append(COLORS["compare"])
        elif 0 <= index <= step.sorted_until:
            colors.append(COLORS["sorted"])
        else:
            colors.append(COLORS["base"])

    figure = go.Figure(
        data=[
            go.Bar(
                x=indices,
                y=list(step.array),
                marker_color=colors,
                text=list(step.array),
                textposition="outside",
                hovertemplate="index=%{x}<br>value=%{y}<extra></extra>",
            )
        ]
    )
    figure.update_layout(
        title=step.action,
        height=420,
        margin=dict(l=24, r=24, t=64, b=48),
        xaxis_title="Array index",
        yaxis_title="Value",
        showlegend=False,
    )
    figure.update_yaxes(range=[0, max(step.array, default=1) * 1.25 + 1])
    return figure


def bfs_figure(step: GraphStep) -> go.Figure:
    """Render a graph traversal step."""

    positions = circular_layout(step.nodes)
    edge_x: list[float | None] = []
    edge_y: list[float | None] = []
    active_x: list[float | None] = []
    active_y: list[float | None] = []

    active_undirected = set(step.active_edge or tuple())
    for source, target in step.edges:
        x0, y0 = positions[source]
        x1, y1 = positions[target]
        target_lists = active_undirected == {source, target}
        if target_lists:
            active_x.extend([x0, x1, None])
            active_y.extend([y0, y1, None])
        else:
            edge_x.extend([x0, x1, None])
            edge_y.extend([y0, y1, None])

    node_x = [positions[node][0] for node in step.nodes]
    node_y = [positions[node][1] for node in step.nodes]
    node_colors = [
        COLORS["current"] if node == step.current_node else COLORS.get(step.status[node], COLORS["base"])
        for node in step.nodes
    ]

    figure = go.Figure()
    figure.add_trace(
        go.Scatter(
            x=edge_x,
            y=edge_y,
            mode="lines",
            line=dict(color="#cbd5e1", width=3),
            hoverinfo="skip",
            showlegend=False,
        )
    )
    figure.add_trace(
        go.Scatter(
            x=active_x,
            y=active_y,
            mode="lines",
            line=dict(color=COLORS["compare"], width=6),
            hoverinfo="skip",
            showlegend=False,
        )
    )
    figure.add_trace(
        go.Scatter(
            x=node_x,
            y=node_y,
            mode="markers+text",
            marker=dict(size=46, color=node_colors, line=dict(color="white", width=3)),
            text=step.nodes,
            textfont=dict(color="white", size=15),
            textposition="middle center",
            customdata=[step.status[node] for node in step.nodes],
            hovertemplate="node=%{text}<br>status=%{customdata}<extra></extra>",
            showlegend=False,
        )
    )
    figure.update_layout(
        title=step.action,
        height=460,
        margin=dict(l=16, r=16, t=64, b=16),
        xaxis=dict(visible=False, range=[-1.25, 1.25]),
        yaxis=dict(visible=False, range=[-1.25, 1.25]),
        plot_bgcolor="white",
    )
    return figure


def linked_list_figure(step: LinkedListStep) -> go.Figure:
    """Render a singly linked list with pointer labels."""

    x_positions = {node_id: index * 1.6 for index, node_id in enumerate(step.node_ids)}
    y_positions = {
        node_id: (-0.9 if node_id not in {source for source, _target in step.links} and node_id.startswith("N") else 0.0)
        for node_id in step.node_ids
    }

    # If the final linked order includes the new node, keep it on the main rail.
    linked_nodes = {node for link in step.links for node in link}
    if step.links:
        linked_nodes.add(step.links[-1][1])
    for node_id in linked_nodes:
        y_positions[node_id] = 0.0

    figure = go.Figure()

    def add_arrow(source: str, target: str, color: str, dash: str = "solid") -> None:
        x0, y0 = x_positions[source], y_positions[source]
        x1, y1 = x_positions[target], y_positions[target]
        figure.add_annotation(
            x=x1 - 0.38,
            y=y1,
            ax=x0 + 0.38,
            ay=y0,
            xref="x",
            yref="y",
            axref="x",
            ayref="y",
            showarrow=True,
            arrowhead=3,
            arrowsize=1,
            arrowwidth=3,
            arrowcolor=color,
            opacity=0.95,
        )
        figure.add_trace(
            go.Scatter(
                x=[x0 + 0.38, x1 - 0.38],
                y=[y0, y1],
                mode="lines",
                line=dict(color=color, width=2, dash=dash),
                hoverinfo="skip",
                showlegend=False,
            )
        )

    for source, target in step.links:
        add_arrow(source, target, "#475569")
    for source, target in step.transient_links:
        add_arrow(source, target, COLORS["transient"], dash="dot")

    node_colors = [
        COLORS["key"] if node_id in step.highlight_nodes else "#334155"
        for node_id in step.node_ids
    ]
    figure.add_trace(
        go.Scatter(
            x=[x_positions[node_id] for node_id in step.node_ids],
            y=[y_positions[node_id] for node_id in step.node_ids],
            mode="markers+text",
            marker=dict(size=58, color=node_colors, line=dict(color="white", width=3)),
            text=[f"{node_id}<br>{step.values[node_id]}" for node_id in step.node_ids],
            textfont=dict(color="white", size=12),
            textposition="middle center",
            hovertemplate="%{text}<extra></extra>",
            showlegend=False,
        )
    )

    for pointer_index, pointer in enumerate(step.pointers):
        if pointer.node_id is None:
            continue
        x = x_positions[pointer.node_id]
        y = y_positions[pointer.node_id] + 0.82 + pointer_index * 0.18
        figure.add_annotation(
            x=x,
            y=y_positions[pointer.node_id] + 0.38,
            ax=x,
            ay=y,
            text=pointer.name,
            showarrow=True,
            arrowhead=2,
            arrowwidth=2,
            arrowcolor=COLORS["pointer"],
            font=dict(color=COLORS["pointer"], size=13),
        )

    figure.update_layout(
        title=step.action,
        height=390,
        margin=dict(l=24, r=24, t=64, b=24),
        xaxis=dict(visible=False, range=[-0.8, max(x_positions.values(), default=1) + 0.8]),
        yaxis=dict(visible=False, range=[-1.4, 1.65]),
        plot_bgcolor="white",
    )
    return figure


def knapsack_figure(step: DPStep) -> go.Figure:
    """Render a DP table update as a heatmap."""

    rows = [f"i={index}" for index in range(step.table.shape[0])]
    columns = [f"w={index}" for index in range(step.table.shape[1])]
    figure = go.Figure(
        data=[
            go.Heatmap(
                z=step.table,
                x=columns,
                y=rows,
                colorscale="Blues",
                text=step.table,
                texttemplate="%{text}",
                hovertemplate="row=%{y}<br>capacity=%{x}<br>value=%{z}<extra></extra>",
                showscale=True,
            )
        ]
    )
    figure.add_shape(
        type="rect",
        x0=step.column - 0.5,
        x1=step.column + 0.5,
        y0=step.row - 0.5,
        y1=step.row + 0.5,
        xref="x",
        yref="y",
        line=dict(color=COLORS["compare"], width=4),
    )
    figure.update_layout(
        title=step.action,
        height=460,
        margin=dict(l=24, r=24, t=64, b=48),
        xaxis_title="Capacity",
        yaxis_title="Items considered",
    )
    return figure
