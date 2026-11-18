"""
dsa.linked_list
===============

Pointer-manipulation visualizations — the closest thing to "C-level logic" in
this app.  We model a singly linked list as an array of node values plus a
``next`` array of indices (``-1`` meaning ``NULL``), which is exactly how a
linked list looks in memory and makes the pointers explicit and drawable.

Snapshots use:

* ``"values"`` – node payloads, indexed by node id (position is *stable*; we
  never move a node, we only rewire ``next`` — just like real pointers)
* ``"next"``   – ``next[i]`` is the id of the successor of node ``i`` (or -1)
* ``"head"``   – id of the current head node

Highlights name the conceptual pointers (``prev``, ``curr``, ``next``,
``slow``, ``fast``) so the renderer can label them above the nodes.
"""

from __future__ import annotations

from typing import List, Sequence

from core.state import StepRecorder


def _snapshot(values, nxt, head):
    return {"values": list(values), "next": list(nxt), "head": head}


def reverse_list(values: Sequence[int]) -> StepRecorder:
    """Iteratively reverse a singly linked list with the classic three-pointer dance.

    The invariant being maintained::

        prev -> (already reversed prefix)
        curr -> head of the not-yet-reversed suffix
        nxt  -> curr.next, stashed before we clobber the link

    This is the canonical interview problem and a perfect demonstration of why
    you must save ``curr.next`` *before* rewiring it.
    """
    n = len(values)
    nxt = [i + 1 if i + 1 < n else -1 for i in range(n)]  # 0->1->2->...->NULL
    rec = StepRecorder()
    head = 0 if n else -1

    prev, curr = -1, head
    rec.record("Start: prev = NULL, curr = head. We rewire links one node at a time.",
               _snapshot(values, nxt, head),
               {"prev": prev, "curr": curr, "next": -1})

    while curr != -1:
        nxt_node = nxt[curr]
        rec.record(f"Save next = node({nxt_node}) before we overwrite curr.next.",
                   _snapshot(values, nxt, head),
                   {"prev": prev, "curr": curr, "next": nxt_node})
        nxt[curr] = prev          # reverse the pointer
        rec.bump("pointer_writes")
        rec.record(f"Rewire: curr.next ← prev (node {prev}). The link now points backward.",
                   _snapshot(values, nxt, head),
                   {"prev": prev, "curr": curr, "next": nxt_node})
        prev, curr = curr, nxt_node   # advance both pointers
        rec.record("Advance: prev ← curr, curr ← next.",
                   _snapshot(values, nxt, head),
                   {"prev": prev, "curr": curr, "next": nxt[prev] if prev != -1 else -1})

    head = prev
    rec.record(f"curr is NULL → done. New head is node {head}.",
               _snapshot(values, nxt, head),
               {"prev": prev, "curr": -1, "next": -1})
    return rec


def find_middle(values: Sequence[int]) -> StepRecorder:
    """Find the middle node with Floyd's tortoise-and-hare two-pointer technique.

    ``slow`` advances one node per step while ``fast`` advances two.  When
    ``fast`` falls off the end, ``slow`` sits on the middle — all in a single
    pass with O(1) memory, no length precomputation.
    """
    n = len(values)
    nxt = [i + 1 if i + 1 < n else -1 for i in range(n)]
    rec = StepRecorder()
    head = 0 if n else -1

    slow = fast = head
    rec.record("Initialise slow and fast at the head.",
               _snapshot(values, nxt, head), {"slow": slow, "fast": fast})

    while fast != -1 and nxt[fast] != -1:
        slow = nxt[slow]
        fast = nxt[nxt[fast]]
        rec.bump("steps")
        rec.record("slow += 1 node, fast += 2 nodes.",
                   _snapshot(values, nxt, head), {"slow": slow, "fast": fast})

    rec.record(f"fast reached the end → the middle is node {slow} (value {values[slow] if slow!=-1 else 'NULL'}).",
               _snapshot(values, nxt, head), {"slow": slow, "fast": fast, "middle": slow})
    return rec


ALGORITHMS = {
    "Reverse a Linked List (3 pointers)": reverse_list,
    "Find Middle (fast/slow pointers)": find_middle,
}
