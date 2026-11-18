"""Tests for deterministic DSA traces."""

from __future__ import annotations

from cs_viz.dsa.dynamic_programming import KnapsackItem, knapsack_steps
from cs_viz.dsa.graph import bfs_steps, parse_edge_list
from cs_viz.dsa.linked_list import linked_list_insert_after_steps
from cs_viz.dsa.sorting import insertion_sort_steps


def test_insertion_sort_trace_finishes_sorted() -> None:
    steps = insertion_sort_steps([8, 3, 5, 1])

    assert steps[-1].array == (1, 3, 5, 8)


def test_bfs_trace_visits_reachable_nodes() -> None:
    graph = parse_edge_list("A-B\nA-C\nB-D")
    steps = bfs_steps(graph, "A")

    assert all(status == "visited" for status in steps[-1].status.values())


def test_linked_list_insert_rewires_next_pointers() -> None:
    steps = linked_list_insert_after_steps([10, 20, 30], target_index=1, new_value=25)

    assert steps[-1].links == (("N0", "N1"), ("N1", "N3"), ("N3", "N2"))


def test_knapsack_trace_computes_optimal_value() -> None:
    items = [
        KnapsackItem(weight=2, value=3),
        KnapsackItem(weight=3, value=4),
        KnapsackItem(weight=5, value=8),
    ]
    steps = knapsack_steps(items, capacity=5)

    assert int(steps[-1].table[-1, -1]) == 8
