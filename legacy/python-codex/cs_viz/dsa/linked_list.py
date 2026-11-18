"""Pointer-style linked-list operation traces."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Pointer:
    """Named pointer for diagrams and C-like narration."""

    name: str
    node_id: str | None


@dataclass(frozen=True)
class LinkedListStep:
    """A visible state while inserting into a singly linked list."""

    node_ids: tuple[str, ...]
    values: dict[str, int]
    links: tuple[tuple[str, str], ...]
    pointers: tuple[Pointer, ...]
    action: str
    explanation: str
    pseudocode_line: str
    highlight_nodes: tuple[str, ...] = field(default_factory=tuple)
    transient_links: tuple[tuple[str, str], ...] = field(default_factory=tuple)


def _links_for_order(order: list[str]) -> tuple[tuple[str, str], ...]:
    return tuple((order[index], order[index + 1]) for index in range(len(order) - 1))


def linked_list_insert_after_steps(
    values: list[int] | tuple[int, ...],
    target_index: int,
    new_value: int,
) -> list[LinkedListStep]:
    """Trace ``insert_after(target, new_value)`` on a singly linked list.

    The trace mirrors the pointer assignments students would write in C:

    ``new_node->next = current->next``
    ``current->next = new_node``
    """

    if not values:
        values = [new_value]
        return [
            LinkedListStep(
                node_ids=("N0",),
                values={"N0": new_value},
                links=tuple(),
                pointers=(Pointer("head", "N0"), Pointer("new", "N0")),
                action="Create head",
                explanation="The list was empty, so the allocated node becomes the head.",
                pseudocode_line="head = new_node",
                highlight_nodes=("N0",),
            )
        ]

    target_index = max(0, min(target_index, len(values) - 1))
    node_ids = [f"N{index}" for index in range(len(values))]
    node_values = {node_id: value for node_id, value in zip(node_ids, values)}
    links = _links_for_order(node_ids)
    steps: list[LinkedListStep] = [
        LinkedListStep(
            node_ids=tuple(node_ids),
            values=dict(node_values),
            links=links,
            pointers=(Pointer("head", "N0"), Pointer("current", "N0")),
            action="Start at head",
            explanation="Initialize current to head before walking the next pointers.",
            pseudocode_line="current = head",
            highlight_nodes=("N0",),
        )
    ]

    for index in range(target_index):
        current = node_ids[index + 1]
        previous = node_ids[index]
        steps.append(
            LinkedListStep(
                node_ids=tuple(node_ids),
                values=dict(node_values),
                links=links,
                pointers=(Pointer("head", "N0"), Pointer("current", current)),
                action="Advance pointer",
                explanation=f"Follow {previous}->next to move current to {current}.",
                pseudocode_line="current = current->next",
                highlight_nodes=(current,),
            )
        )

    target = node_ids[target_index]
    new_node = f"N{len(values)}"
    node_values[new_node] = new_value
    allocated_order = node_ids + [new_node]

    steps.append(
        LinkedListStep(
            node_ids=tuple(allocated_order),
            values=dict(node_values),
            links=links,
            pointers=(Pointer("head", "N0"), Pointer("current", target), Pointer("new", new_node)),
            action="Allocate node",
            explanation=f"Allocate a new node containing {new_value}; it is not linked into the list yet.",
            pseudocode_line="new_node = malloc(sizeof(Node))",
            highlight_nodes=(target, new_node),
        )
    )

    next_node = node_ids[target_index + 1] if target_index + 1 < len(node_ids) else None
    transient = ((new_node, next_node),) if next_node is not None else tuple()
    steps.append(
        LinkedListStep(
            node_ids=tuple(allocated_order),
            values=dict(node_values),
            links=links,
            pointers=(Pointer("head", "N0"), Pointer("current", target), Pointer("new", new_node)),
            action="Wire new->next",
            explanation=(
                f"Copy current->next into new->next"
                + (f", so new points to {next_node}." if next_node else "; new becomes the tail.")
            ),
            pseudocode_line="new_node->next = current->next",
            highlight_nodes=(target, new_node) + ((next_node,) if next_node else tuple()),
            transient_links=transient,
        )
    )

    final_order = node_ids[: target_index + 1] + [new_node] + node_ids[target_index + 1 :]
    final_links = _links_for_order(final_order)
    steps.append(
        LinkedListStep(
            node_ids=tuple(final_order),
            values=dict(node_values),
            links=final_links,
            pointers=(Pointer("head", "N0"), Pointer("current", target), Pointer("new", new_node)),
            action="Wire current->next",
            explanation=f"Redirect {target}->next to the new node. The insertion is complete.",
            pseudocode_line="current->next = new_node",
            highlight_nodes=(target, new_node),
        )
    )

    return steps
