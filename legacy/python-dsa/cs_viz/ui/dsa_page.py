"""Streamlit page for Data Structures and Algorithms visualizations."""

from __future__ import annotations

import pandas as pd
import streamlit as st

from cs_viz.dsa.dynamic_programming import KnapsackItem, knapsack_steps
from cs_viz.dsa.graph import bfs_steps, parse_edge_list
from cs_viz.dsa.linked_list import linked_list_insert_after_steps
from cs_viz.dsa.sorting import insertion_sort_steps
from cs_viz.dsa.visualizations import (
    bfs_figure,
    insertion_sort_figure,
    knapsack_figure,
    linked_list_figure,
)
from cs_viz.ui.common import parse_int_sequence, render_step_narration, stable_signature, stepper


DEFAULT_ARRAY = [8, 3, 5, 1, 9, 2]
DEFAULT_EDGES = """A-B
A-C
B-D
C-D
C-E
D-F
E-F"""
DEFAULT_LIST = [10, 20, 30, 40]
DEFAULT_WEIGHTS = [2, 3, 4, 5]
DEFAULT_VALUES = [3, 4, 5, 8]


def render_dsa_page() -> None:
    """Render the DSA lab."""

    st.title("DSA Execution Lab")
    algorithm = st.segmented_control(
        "Algorithm",
        options=["Insertion Sort", "BFS", "Linked List Insert", "0/1 Knapsack DP"],
        default="Insertion Sort",
    )

    if algorithm == "Insertion Sort":
        _render_insertion_sort()
    elif algorithm == "BFS":
        _render_bfs()
    elif algorithm == "Linked List Insert":
        _render_linked_list()
    else:
        _render_knapsack()


def _render_insertion_sort() -> None:
    raw = st.text_input("Array values", value=", ".join(map(str, DEFAULT_ARRAY)))
    values = parse_int_sequence(raw, DEFAULT_ARRAY)
    steps = insertion_sort_steps(values)
    index = stepper("insertion_sort", len(steps), stable_signature(values))
    step = steps[index]

    chart_col, state_col = st.columns([3, 2])
    with chart_col:
        st.plotly_chart(insertion_sort_figure(step), width="stretch")
    with state_col:
        render_step_narration(step.action, step.explanation, step.pseudocode_line)
        st.dataframe(
            pd.DataFrame({"index": list(range(len(step.array))), "value": list(step.array)}),
            hide_index=True,
            width="stretch",
        )


def _render_bfs() -> None:
    config_col, queue_col = st.columns([2, 1])
    with config_col:
        raw_edges = st.text_area("Edges", value=DEFAULT_EDGES, height=160)
    adjacency = parse_edge_list(raw_edges)
    nodes = sorted(adjacency)
    with queue_col:
        start = st.selectbox("Start node", options=nodes or ["A"], index=0)
        directed = st.checkbox("Directed parsing", value=False)

    adjacency = parse_edge_list(raw_edges, directed=directed)
    steps = bfs_steps(adjacency, start)
    index = stepper("bfs", len(steps), stable_signature(adjacency, start, directed))
    step = steps[index]

    chart_col, state_col = st.columns([3, 2])
    with chart_col:
        st.plotly_chart(bfs_figure(step), width="stretch")
    with state_col:
        render_step_narration(step.action, step.explanation, step.pseudocode_line)
        st.metric("Queue", " -> ".join(step.queue) if step.queue else "empty")
        st.dataframe(
            pd.DataFrame(
                [{"node": node, "status": step.status[node]} for node in step.nodes]
            ),
            hide_index=True,
            width="stretch",
        )


def _render_linked_list() -> None:
    raw = st.text_input("Linked-list node values", value=", ".join(map(str, DEFAULT_LIST)))
    values = parse_int_sequence(raw, DEFAULT_LIST)
    max_index = max(len(values) - 1, 0)
    controls = st.columns([1, 1])
    with controls[0]:
        target_index = st.slider("Insert after index", min_value=0, max_value=max_index, value=min(1, max_index))
    with controls[1]:
        new_value = st.number_input("New node value", value=25, step=1)

    steps = linked_list_insert_after_steps(values, target_index, int(new_value))
    index = stepper("linked_list", len(steps), stable_signature(values, target_index, new_value))
    step = steps[index]

    chart_col, state_col = st.columns([3, 2])
    with chart_col:
        st.plotly_chart(linked_list_figure(step), width="stretch")
    with state_col:
        render_step_narration(step.action, step.explanation, step.pseudocode_line)
        st.dataframe(
            pd.DataFrame(
                {
                    "node": list(step.node_ids),
                    "value": [step.values[node] for node in step.node_ids],
                    "next": [
                        next((target for source, target in step.links if source == node), "NULL")
                        for node in step.node_ids
                    ],
                }
            ),
            hide_index=True,
            width="stretch",
        )


def _render_knapsack() -> None:
    input_cols = st.columns([1, 1, 1])
    with input_cols[0]:
        raw_weights = st.text_input("Weights", value=", ".join(map(str, DEFAULT_WEIGHTS)))
    with input_cols[1]:
        raw_values = st.text_input("Values", value=", ".join(map(str, DEFAULT_VALUES)))
    with input_cols[2]:
        capacity = st.number_input("Capacity", min_value=0, value=8, step=1)

    weights = parse_int_sequence(raw_weights, DEFAULT_WEIGHTS)
    values = parse_int_sequence(raw_values, DEFAULT_VALUES)
    item_count = min(len(weights), len(values))
    items = [
        KnapsackItem(weight=max(0, weights[index]), value=values[index])
        for index in range(item_count)
    ]
    steps = knapsack_steps(items, int(capacity))
    index = stepper("knapsack", len(steps), stable_signature(items, capacity))
    step = steps[index]

    chart_col, state_col = st.columns([3, 2])
    with chart_col:
        st.plotly_chart(knapsack_figure(step), width="stretch")
    with state_col:
        render_step_narration(step.action, step.explanation, step.pseudocode_line)
        st.dataframe(
            pd.DataFrame(
                [
                    {"item": index + 1, "weight": item.weight, "value": item.value}
                    for index, item in enumerate(items)
                ]
            ),
            hide_index=True,
            width="stretch",
        )
        st.metric("Best value", int(step.table[-1, -1]))
