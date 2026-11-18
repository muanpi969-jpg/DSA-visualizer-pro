"""
core.state
==========

The heart of the *step-through* experience.

Every algorithm in this application is written as a normal Python routine that,
instead of (or in addition to) returning a result, **records a sequence of
immutable snapshots** of its own internal state.  The UI layer then replays those
snapshots with a slider, giving the user a frame-by-frame "debugger" view of the
execution loop without the algorithm code knowing anything about Streamlit or
Plotly.

This clean separation of concerns means:

* algorithmic logic (``dsa/`` and ``ai/``) is pure, testable Python;
* the UI layer (``ui/``) only ever consumes a ``List[Step]``;
* a single replay/animation control works for *every* algorithm.

Design note
-----------
Algorithms frequently mutate their working data **in place** (swapping array
elements, advancing pointers, filling a DP table).  If we stored a reference to
that mutable object, every recorded frame would end up showing the *final*
state.  ``StepRecorder.record`` therefore deep-copies the snapshot at capture
time so each ``Step`` is a faithful, frozen moment in history.
"""

from __future__ import annotations

import copy
from dataclasses import dataclass, field
from typing import Any, Dict, Iterator, List, Optional


@dataclass(frozen=True)
class Step:
    """A single, immutable frame in an algorithm's execution.

    Attributes
    ----------
    index:
        Zero-based position of this step within the run.
    description:
        Human-readable explanation of *what just happened* — rendered verbatim
        in the UI so the student can follow the narrative.
    snapshot:
        Algorithm-specific state at this instant (e.g. the array being sorted,
        the DP table, the visited set).  Already deep-copied by the recorder.
    highlights:
        A small dictionary describing *what to emphasise* visually, e.g.
        ``{"compared": [3, 4], "swapped": []}`` for sorting or
        ``{"current": "B", "frontier": ["C", "D"]}`` for graph search.  The UI
        decides how to colour these; the algorithm only states intent.
    metrics:
        Running counters worth surfacing (comparisons, swaps, cells filled,
        FLOPs, …).  Always cumulative up to and including this step.
    """

    index: int
    description: str
    snapshot: Dict[str, Any]
    highlights: Dict[str, Any] = field(default_factory=dict)
    metrics: Dict[str, Any] = field(default_factory=dict)


class StepRecorder:
    """Collects :class:`Step` frames as an algorithm runs.

    Usage
    -----
    >>> rec = StepRecorder()
    >>> data = [3, 1, 2]
    >>> rec.record("start", {"array": data})
    >>> data[0], data[1] = data[1], data[0]
    >>> rec.record("swapped 0 and 1", {"array": data},
    ...            highlights={"swapped": [0, 1]})
    >>> len(rec)
    2
    >>> rec[0].snapshot["array"]      # frozen — unaffected by the later swap
    [3, 1, 2]
    """

    def __init__(self) -> None:
        self._steps: List[Step] = []
        self._counters: Dict[str, int] = {}

    # -- counter helpers ---------------------------------------------------
    def bump(self, name: str, by: int = 1) -> None:
        """Increment a named running counter (e.g. ``"comparisons"``)."""
        self._counters[name] = self._counters.get(name, 0) + by

    @property
    def counters(self) -> Dict[str, int]:
        return dict(self._counters)

    # -- recording ---------------------------------------------------------
    def record(
        self,
        description: str,
        snapshot: Dict[str, Any],
        highlights: Optional[Dict[str, Any]] = None,
        metrics: Optional[Dict[str, Any]] = None,
    ) -> Step:
        """Capture a frozen snapshot of the current state.

        ``snapshot`` and ``highlights`` are deep-copied so that subsequent
        in-place mutations by the algorithm cannot corrupt this frame.  The
        current counter values are merged into ``metrics`` automatically.
        """
        merged_metrics: Dict[str, Any] = dict(self._counters)
        if metrics:
            merged_metrics.update(metrics)

        step = Step(
            index=len(self._steps),
            description=description,
            snapshot=copy.deepcopy(snapshot),
            highlights=copy.deepcopy(highlights) if highlights else {},
            metrics=merged_metrics,
        )
        self._steps.append(step)
        return step

    # -- sequence protocol -------------------------------------------------
    @property
    def steps(self) -> List[Step]:
        return self._steps

    def __len__(self) -> int:
        return len(self._steps)

    def __getitem__(self, i: int) -> Step:
        return self._steps[i]

    def __iter__(self) -> Iterator[Step]:
        return iter(self._steps)
