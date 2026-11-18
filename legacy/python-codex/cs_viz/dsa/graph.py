"""Graph traversal traces."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from math import cos, pi, sin


Graph = dict[str, list[str]]


@dataclass(frozen=True)
class GraphStep:
    """A single visible BFS state."""

    nodes: tuple[str, ...]
    edges: tuple[tuple[str, str], ...]
    status: dict[str, str]
    queue: tuple[str, ...]
    action: str
    explanation: str
    pseudocode_line: str
    current_node: str | None = None
    active_edge: tuple[str, str] | None = None


def parse_edge_list(raw_edges: str, directed: bool = False) -> Graph:
    """Parse a forgiving edge-list format into an adjacency dictionary.

    Accepted separators are ``-``, ``->``, ``,`` and whitespace. Blank lines and
    comment lines beginning with ``#`` are ignored.
    """

    adjacency: dict[str, set[str]] = {}
    for line in raw_edges.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        normalized = stripped.replace("->", " ").replace("-", " ").replace(",", " ")
        parts = [part.strip() for part in normalized.split() if part.strip()]
        if len(parts) < 2:
            adjacency.setdefault(parts[0], set())
            continue

        source, target = parts[0], parts[1]
        adjacency.setdefault(source, set()).add(target)
        adjacency.setdefault(target, set())
        if not directed:
            adjacency[target].add(source)

    return {node: sorted(neighbors) for node, neighbors in sorted(adjacency.items())}


def graph_edges(adjacency: Graph, directed: bool = False) -> tuple[tuple[str, str], ...]:
    """Return a stable edge list for rendering."""

    edges: set[tuple[str, str]] = set()
    for source, neighbors in adjacency.items():
        for target in neighbors:
            edge = (source, target) if directed or source <= target else (target, source)
            edges.add(edge)
    return tuple(sorted(edges))


def circular_layout(nodes: tuple[str, ...]) -> dict[str, tuple[float, float]]:
    """Place graph nodes on a circle without requiring NetworkX."""

    if not nodes:
        return {}
    if len(nodes) == 1:
        return {nodes[0]: (0.0, 0.0)}

    return {
        node: (cos((2 * pi * index) / len(nodes)), sin((2 * pi * index) / len(nodes)))
        for index, node in enumerate(nodes)
    }


def bfs_steps(adjacency: Graph, start: str) -> list[GraphStep]:
    """Return an execution trace for breadth-first search."""

    nodes = tuple(sorted(adjacency))
    edges = graph_edges(adjacency)
    if not nodes:
        return [
            GraphStep(
                nodes=tuple(),
                edges=tuple(),
                status={},
                queue=tuple(),
                action="Empty graph",
                explanation="The graph has no nodes to traverse.",
                pseudocode_line="return",
            )
        ]

    if start not in adjacency:
        start = nodes[0]

    status = {node: "undiscovered" for node in nodes}
    queue: deque[str] = deque([start])
    status[start] = "frontier"

    steps: list[GraphStep] = [
        GraphStep(
            nodes=nodes,
            edges=edges,
            status=dict(status),
            queue=tuple(queue),
            action="Initialize frontier",
            explanation=f"Start at {start}; enqueue it as the first frontier node.",
            pseudocode_line="queue.enqueue(start)",
        )
    ]

    while queue:
        current = queue.popleft()
        status[current] = "current"
        steps.append(
            GraphStep(
                nodes=nodes,
                edges=edges,
                status=dict(status),
                queue=tuple(queue),
                action="Dequeue",
                explanation=f"Remove {current} from the queue and inspect its adjacency list.",
                pseudocode_line="current = queue.dequeue()",
                current_node=current,
            )
        )

        for neighbor in adjacency[current]:
            steps.append(
                GraphStep(
                    nodes=nodes,
                    edges=edges,
                    status=dict(status),
                    queue=tuple(queue),
                    action="Inspect edge",
                    explanation=f"Inspect edge {current} -> {neighbor}.",
                    pseudocode_line="for neighbor in graph[current]",
                    current_node=current,
                    active_edge=(current, neighbor),
                )
            )
            if status[neighbor] == "undiscovered":
                status[neighbor] = "frontier"
                queue.append(neighbor)
                steps.append(
                    GraphStep(
                        nodes=nodes,
                        edges=edges,
                        status=dict(status),
                        queue=tuple(queue),
                        action="Discover neighbor",
                        explanation=f"{neighbor} was undiscovered, so mark it frontier and enqueue it.",
                        pseudocode_line="if not visited[neighbor]: queue.enqueue(neighbor)",
                        current_node=current,
                        active_edge=(current, neighbor),
                    )
                )

        status[current] = "visited"
        steps.append(
            GraphStep(
                nodes=nodes,
                edges=edges,
                status=dict(status),
                queue=tuple(queue),
                action="Finish node",
                explanation=f"All neighbors of {current} have been checked; mark it visited.",
                pseudocode_line="visited[current] = true",
                current_node=current,
            )
        )

    return steps
