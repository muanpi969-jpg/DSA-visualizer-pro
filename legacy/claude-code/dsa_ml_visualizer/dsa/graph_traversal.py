"""
dsa.graph_traversal
====================

Breadth-first and depth-first search over an undirected/directed graph, plus a
tiny dependency-free spring layout so we can draw the graph with Plotly without
pulling in ``networkx``.

Snapshots use:

* ``"adj"``      – adjacency mapping (constant across steps)
* ``"order"``    – list of nodes in the order they were *visited*

Highlights use:

* ``current``    – the node being processed
* ``frontier``   – nodes waiting in the queue/stack
* ``visited``    – nodes already finalised
* ``tree_edges`` – (u, v) edges that form the traversal tree
"""

from __future__ import annotations

from collections import deque
from typing import Dict, List, Tuple

import numpy as np

from core.state import StepRecorder

Adjacency = Dict[str, List[str]]


def parse_edges(text: str) -> Adjacency:
    """Parse an edge list such as ``"A-B, A-C, B-D"`` into an adjacency map.

    Lines or commas both separate edges; ``-`` separates the two endpoints.
    The graph is treated as **undirected** (each edge is added both ways) and
    neighbours are kept sorted for deterministic traversal order.
    """
    adj: Adjacency = {}
    tokens = [t.strip() for chunk in text.split("\n") for t in chunk.split(",")]
    for tok in tokens:
        if not tok:
            continue
        if "-" not in tok:
            adj.setdefault(tok, adj.get(tok, []))  # isolated node
            continue
        u, v = (s.strip() for s in tok.split("-", 1))
        if not u or not v:
            continue
        adj.setdefault(u, [])
        adj.setdefault(v, [])
        if v not in adj[u]:
            adj[u].append(v)
        if u not in adj[v]:
            adj[v].append(u)
    for k in adj:
        adj[k].sort()
    return adj


def spring_layout(adj: Adjacency, iterations: int = 120, seed: int = 7) -> Dict[str, Tuple[float, float]]:
    """A minimal Fruchterman–Reingold force-directed layout in NumPy.

    Nodes repel each other (Coulomb-like) while edges act as springs.  This is
    enough to produce readable layouts for the small teaching graphs we use,
    and keeps the project free of a graph-drawing dependency.
    """
    nodes = list(adj.keys())
    n = len(nodes)
    if n == 0:
        return {}
    idx = {u: i for i, u in enumerate(nodes)}
    rng = np.random.default_rng(seed)
    pos = rng.standard_normal((n, 2))

    k = 1.0 / np.sqrt(n)  # ideal edge length
    edges = {(idx[u], idx[v]) for u in adj for v in adj[u]}

    for it in range(iterations):
        disp = np.zeros((n, 2))
        # repulsive forces between every pair
        for i in range(n):
            delta = pos[i] - pos                      # (n, 2)
            dist = np.linalg.norm(delta, axis=1)
            dist[i] = 1.0
            rep = (k * k) / dist[:, None]
            disp[i] += np.sum((delta / dist[:, None]) * rep, axis=0)
        # attractive forces along edges
        for i, j in edges:
            delta = pos[i] - pos[j]
            dist = max(np.linalg.norm(delta), 1e-3)
            att = (dist * dist) / k
            f = (delta / dist) * att
            disp[i] -= f
            disp[j] += f
        # cool down the maximum displacement
        temp = 0.1 * (1 - it / iterations)
        length = np.linalg.norm(disp, axis=1)
        length[length == 0] = 1.0
        pos += (disp / length[:, None]) * np.minimum(length, temp)[:, None]

    # normalise into a tidy [0, 1] box
    pos -= pos.min(axis=0)
    span = pos.max(axis=0)
    span[span == 0] = 1.0
    pos /= span
    return {u: (float(pos[idx[u], 0]), float(pos[idx[u], 1])) for u in nodes}


def bfs(adj: Adjacency, start: str) -> StepRecorder:
    """Breadth-first search using a FIFO queue.

    BFS explores the graph in "rings" of increasing distance from ``start`` and
    therefore yields shortest paths (in edges) on unweighted graphs.
    """
    rec = StepRecorder()
    if start not in adj:
        rec.record(f"Start node '{start}' is not in the graph.", {"adj": adj, "order": []})
        return rec

    visited: List[str] = []
    queue: deque[str] = deque([start])
    in_frontier = {start}
    tree_edges: List[Tuple[str, str]] = []

    rec.record(f"Enqueue start node {start}. Queue = [{start}].",
               {"adj": adj, "order": []},
               {"frontier": [start], "visited": [], "tree_edges": []})

    while queue:
        u = queue.popleft()
        in_frontier.discard(u)
        if u in visited:
            continue
        visited.append(u)
        rec.bump("nodes_visited")
        rec.record(f"Dequeue {u} → mark visited. Visit order: {' → '.join(visited)}.",
                   {"adj": adj, "order": list(visited)},
                   {"current": u, "frontier": list(queue), "visited": list(visited),
                    "tree_edges": list(tree_edges)})
        for v in adj[u]:
            rec.bump("edges_examined")
            if v not in visited and v not in in_frontier:
                queue.append(v)
                in_frontier.add(v)
                tree_edges.append((u, v))
                rec.record(f"Neighbour {v} is new → enqueue. Queue = {list(queue)}.",
                           {"adj": adj, "order": list(visited)},
                           {"current": u, "frontier": list(queue), "visited": list(visited),
                            "tree_edges": list(tree_edges)})
    rec.record(f"Queue empty. BFS complete. Order: {' → '.join(visited)}.",
               {"adj": adj, "order": list(visited)},
               {"visited": list(visited), "tree_edges": list(tree_edges)})
    return rec


def dfs(adj: Adjacency, start: str) -> StepRecorder:
    """Iterative depth-first search using an explicit LIFO stack.

    Using an explicit stack (rather than recursion) makes the frontier visible
    and mirrors how one would implement DFS in C with a manual stack.
    """
    rec = StepRecorder()
    if start not in adj:
        rec.record(f"Start node '{start}' is not in the graph.", {"adj": adj, "order": []})
        return rec

    visited: List[str] = []
    stack: List[str] = [start]
    tree_edges: List[Tuple[str, str]] = []
    parent: Dict[str, str] = {}

    rec.record(f"Push start node {start}. Stack = [{start}].",
               {"adj": adj, "order": []},
               {"frontier": [start], "visited": [], "tree_edges": []})

    while stack:
        u = stack.pop()
        if u in visited:
            continue
        visited.append(u)
        if u in parent:
            tree_edges.append((parent[u], u))
        rec.bump("nodes_visited")
        rec.record(f"Pop {u} → mark visited. Visit order: {' → '.join(visited)}.",
                   {"adj": adj, "order": list(visited)},
                   {"current": u, "frontier": list(stack), "visited": list(visited),
                    "tree_edges": list(tree_edges)})
        # push neighbours in reverse so the smallest is explored first
        for v in reversed(adj[u]):
            rec.bump("edges_examined")
            if v not in visited:
                stack.append(v)
                parent.setdefault(v, u)
                rec.record(f"Push unvisited neighbour {v}. Stack = {list(stack)}.",
                           {"adj": adj, "order": list(visited)},
                           {"current": u, "frontier": list(stack), "visited": list(visited),
                            "tree_edges": list(tree_edges)})
    rec.record(f"Stack empty. DFS complete. Order: {' → '.join(visited)}.",
               {"adj": adj, "order": list(visited)},
               {"visited": list(visited), "tree_edges": list(tree_edges)})
    return rec


ALGORITHMS = {"Breadth-First Search (BFS)": bfs, "Depth-First Search (DFS)": dfs}

SAMPLE_GRAPH = "A-B, A-C, B-D, B-E, C-F, E-F, D-G, F-G"
