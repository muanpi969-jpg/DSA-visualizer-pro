"""
dsa.sorting
===========

Classic comparison sorts, instrumented to emit a :class:`~core.state.Step`
stream so the UI can animate every comparison and swap.

Each public function has the same contract::

    def <algo>(data: Sequence[int]) -> StepRecorder

The returned recorder's snapshots use the key ``"array"`` and highlight one or
more of:

* ``compared``  – indices currently being compared
* ``swapped``   – indices whose values were just exchanged
* ``sorted``    – indices known to be in their final position
* ``pivot``     – the pivot index (quicksort)
* ``key``       – the "key" element being inserted (insertion sort)

Keeping the highlight vocabulary tiny lets a single renderer colour the bars for
*all* algorithms.
"""

from __future__ import annotations

from typing import List, Sequence

from core.state import StepRecorder


# ---------------------------------------------------------------------------
# Bubble sort
# ---------------------------------------------------------------------------
def bubble_sort(data: Sequence[int]) -> StepRecorder:
    """Repeatedly swap adjacent out-of-order elements; large values "bubble" up.

    Complexity: O(n²) comparisons, O(n²) swaps worst case, O(1) extra space.
    """
    a: List[int] = list(data)
    rec = StepRecorder()
    n = len(a)
    sorted_tail: List[int] = []

    rec.record("Initial array. Bubble sort compares adjacent pairs.",
               {"array": a}, {"sorted": []})

    for i in range(n):
        swapped_any = False
        for j in range(0, n - i - 1):
            rec.bump("comparisons")
            rec.record(f"Compare a[{j}]={a[j]} and a[{j+1}]={a[j+1]}.",
                       {"array": a}, {"compared": [j, j + 1], "sorted": list(sorted_tail)})
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                rec.bump("swaps")
                swapped_any = True
                rec.record(f"a[{j}] > a[{j+1}] → swap.",
                           {"array": a}, {"swapped": [j, j + 1], "sorted": list(sorted_tail)})
        sorted_tail.append(n - i - 1)
        if not swapped_any:
            rec.record("No swaps in this pass → array is sorted. Early exit.",
                       {"array": a}, {"sorted": list(range(n))})
            break

    rec.record("Sorted.", {"array": a}, {"sorted": list(range(n))})
    return rec


# ---------------------------------------------------------------------------
# Insertion sort
# ---------------------------------------------------------------------------
def insertion_sort(data: Sequence[int]) -> StepRecorder:
    """Grow a sorted prefix by inserting each new element into place.

    Complexity: O(n²) worst case but O(n) on nearly-sorted input — a great way
    to show *adaptivity*.
    """
    a: List[int] = list(data)
    rec = StepRecorder()
    n = len(a)
    rec.record("Initial array. The first element is a trivially sorted prefix.",
               {"array": a}, {"sorted": [0]})

    for i in range(1, n):
        key = a[i]
        j = i - 1
        rec.record(f"Take key = a[{i}] = {key}; insert it into the sorted prefix.",
                   {"array": a}, {"key": i, "sorted": list(range(i))})
        while j >= 0 and a[j] > key:
            rec.bump("comparisons")
            a[j + 1] = a[j]
            rec.bump("swaps")
            rec.record(f"a[{j}]={a[j]} > key={key}; shift it right.",
                       {"array": a}, {"compared": [j], "key": j + 1, "sorted": list(range(i + 1))})
            j -= 1
        a[j + 1] = key
        rec.record(f"Place key {key} at index {j + 1}.",
                   {"array": a}, {"swapped": [j + 1], "sorted": list(range(i + 1))})

    rec.record("Sorted.", {"array": a}, {"sorted": list(range(n))})
    return rec


# ---------------------------------------------------------------------------
# Selection sort
# ---------------------------------------------------------------------------
def selection_sort(data: Sequence[int]) -> StepRecorder:
    """Select the minimum of the unsorted suffix and swap it into place.

    Complexity: O(n²) comparisons but only O(n) swaps — minimal writes.
    """
    a: List[int] = list(data)
    rec = StepRecorder()
    n = len(a)
    rec.record("Initial array. Find the minimum and move it to the front.",
               {"array": a}, {"sorted": []})

    for i in range(n):
        min_idx = i
        for j in range(i + 1, n):
            rec.bump("comparisons")
            rec.record(f"Scan for minimum: compare a[{j}]={a[j]} to current min a[{min_idx}]={a[min_idx]}.",
                       {"array": a}, {"compared": [j, min_idx], "sorted": list(range(i))})
            if a[j] < a[min_idx]:
                min_idx = j
        if min_idx != i:
            a[i], a[min_idx] = a[min_idx], a[i]
            rec.bump("swaps")
        rec.record(f"Place minimum {a[i]} at index {i}.",
                   {"array": a}, {"swapped": [i, min_idx], "sorted": list(range(i + 1))})

    rec.record("Sorted.", {"array": a}, {"sorted": list(range(n))})
    return rec


# ---------------------------------------------------------------------------
# Quicksort (Lomuto partition) — showcases pivots and pointer partitioning
# ---------------------------------------------------------------------------
def quick_sort(data: Sequence[int]) -> StepRecorder:
    """In-place quicksort with the Lomuto partition scheme.

    The visualization emphasises the *pivot* and the partition boundary ``i``,
    which is exactly the kind of pointer bookkeeping students struggle with.
    Complexity: O(n log n) average, O(n²) worst case, O(log n) stack.
    """
    a: List[int] = list(data)
    rec = StepRecorder()
    final_sorted: set[int] = set()

    rec.record("Initial array. Quicksort partitions around a pivot, recursively.",
               {"array": a}, {})

    def partition(lo: int, hi: int) -> int:
        pivot = a[hi]
        i = lo - 1
        rec.record(f"Partition [{lo}..{hi}] around pivot a[{hi}]={pivot}.",
                   {"array": a}, {"pivot": hi, "compared": list(range(lo, hi)),
                                  "sorted": sorted(final_sorted)})
        for j in range(lo, hi):
            rec.bump("comparisons")
            rec.record(f"Is a[{j}]={a[j]} ≤ pivot {pivot}?",
                       {"array": a}, {"pivot": hi, "compared": [j, i + 1 if i + 1 < hi else j],
                                      "sorted": sorted(final_sorted)})
            if a[j] <= pivot:
                i += 1
                a[i], a[j] = a[j], a[i]
                rec.bump("swaps")
                rec.record(f"Yes → grow the ≤-region; swap a[{i}] and a[{j}].",
                           {"array": a}, {"pivot": hi, "swapped": [i, j],
                                          "sorted": sorted(final_sorted)})
        a[i + 1], a[hi] = a[hi], a[i + 1]
        rec.bump("swaps")
        final_sorted.add(i + 1)
        rec.record(f"Move pivot to its final position {i + 1}.",
                   {"array": a}, {"swapped": [i + 1, hi], "sorted": sorted(final_sorted)})
        return i + 1

    def qsort(lo: int, hi: int) -> None:
        if lo > hi:
            return
        if lo == hi:
            final_sorted.add(lo)
            return
        p = partition(lo, hi)
        qsort(lo, p - 1)
        qsort(p + 1, hi)

    qsort(0, len(a) - 1)
    rec.record("Sorted.", {"array": a}, {"sorted": list(range(len(a)))})
    return rec


# ---------------------------------------------------------------------------
# Merge sort — showcases divide & conquer and an auxiliary buffer
# ---------------------------------------------------------------------------
def merge_sort(data: Sequence[int]) -> StepRecorder:
    """Top-down merge sort recording each merge write.

    Complexity: O(n log n) guaranteed, O(n) extra space — a stable sort.
    """
    a: List[int] = list(data)
    rec = StepRecorder()
    rec.record("Initial array. Merge sort splits, then merges sorted halves.",
               {"array": a}, {})

    def merge(lo: int, mid: int, hi: int) -> None:
        left, right = a[lo:mid + 1], a[mid + 1:hi + 1]
        i = j = 0
        k = lo
        rec.record(f"Merge sorted halves [{lo}..{mid}] and [{mid+1}..{hi}].",
                   {"array": a}, {"compared": list(range(lo, hi + 1))})
        while i < len(left) and j < len(right):
            rec.bump("comparisons")
            if left[i] <= right[j]:
                a[k] = left[i]
                i += 1
            else:
                a[k] = right[j]
                j += 1
            rec.bump("writes")
            rec.record(f"Write {a[k]} into position {k}.",
                       {"array": a}, {"swapped": [k]})
            k += 1
        while i < len(left):
            a[k] = left[i]; i += 1; rec.bump("writes")
            rec.record(f"Drain left: write {a[k]} at {k}.", {"array": a}, {"swapped": [k]})
            k += 1
        while j < len(right):
            a[k] = right[j]; j += 1; rec.bump("writes")
            rec.record(f"Drain right: write {a[k]} at {k}.", {"array": a}, {"swapped": [k]})
            k += 1

    def msort(lo: int, hi: int) -> None:
        if lo >= hi:
            return
        mid = (lo + hi) // 2
        msort(lo, mid)
        msort(mid + 1, hi)
        merge(lo, mid, hi)

    msort(0, len(a) - 1)
    rec.record("Sorted.", {"array": a}, {"sorted": list(range(len(a)))})
    return rec


#: Registry consumed by the UI dropdown.  Keep keys human-readable.
ALGORITHMS = {
    "Bubble Sort": bubble_sort,
    "Insertion Sort": insertion_sort,
    "Selection Sort": selection_sort,
    "Quicksort (Lomuto)": quick_sort,
    "Merge Sort": merge_sort,
}

#: Big-O reference shown alongside each algorithm.
COMPLEXITY = {
    "Bubble Sort": "Time O(n²) · Space O(1) · stable · adaptive (early exit)",
    "Insertion Sort": "Time O(n²), O(n) nearly-sorted · Space O(1) · stable · adaptive",
    "Selection Sort": "Time O(n²) · Space O(1) · not stable · minimal writes O(n)",
    "Quicksort (Lomuto)": "Time O(n log n) avg / O(n²) worst · Space O(log n) · not stable",
    "Merge Sort": "Time O(n log n) · Space O(n) · stable",
}
