"""Step-by-step traces for array algorithms.

The Streamlit UI consumes these immutable trace objects instead of running the
algorithm directly in callbacks. That keeps rendering concerns away from the
algorithm and makes the execution loop easy to test.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class SortStep:
    """A single observable state in insertion sort.

    Attributes:
        array: Snapshot of the array after the current action.
        action: Short label for the operation being performed.
        explanation: Student-facing explanation of the state transition.
        pseudocode_line: The pseudocode line represented by this state.
        i: Outer-loop index.
        j: Inner-loop index.
        key_index: Index currently holding the key value, if it is visible in
            the array.
        compare_indices: Indices being compared in this step.
        sorted_until: Inclusive right boundary of the sorted prefix.
    """

    array: tuple[int, ...]
    action: str
    explanation: str
    pseudocode_line: str
    i: int | None = None
    j: int | None = None
    key_value: int | None = None
    key_index: int | None = None
    compare_indices: tuple[int, int] | tuple[()] = field(default_factory=tuple)
    sorted_until: int = 0


def insertion_sort_steps(values: list[int] | tuple[int, ...]) -> list[SortStep]:
    """Return a deterministic execution trace for insertion sort.

    Insertion sort is intentionally chosen because it exposes the mechanics of
    an in-place array algorithm: a key is temporarily saved, larger values shift
    right, and the key is written into the gap. Those are the same mutation
    patterns students later see in lower-level memory diagrams.
    """

    array = list(values)
    if not array:
        return [
            SortStep(
                array=tuple(),
                action="Empty input",
                explanation="No values were supplied, so the algorithm has no work to do.",
                pseudocode_line="return",
                sorted_until=-1,
            )
        ]

    steps: list[SortStep] = [
        SortStep(
            array=tuple(array),
            action="Initialize sorted prefix",
            explanation="The first element is trivially sorted.",
            pseudocode_line="for i = 1 to n - 1",
            sorted_until=0,
        )
    ]

    for i in range(1, len(array)):
        key = array[i]
        j = i - 1
        steps.append(
            SortStep(
                array=tuple(array),
                action="Store key",
                explanation=f"Save array[{i}] = {key}; values larger than the key shift right.",
                pseudocode_line="key = array[i]",
                i=i,
                j=j,
                key_value=key,
                key_index=i,
                sorted_until=i - 1,
            )
        )

        while j >= 0:
            steps.append(
                SortStep(
                    array=tuple(array),
                    action="Compare",
                    explanation=f"Compare array[{j}] = {array[j]} with key = {key}.",
                    pseudocode_line="while j >= 0 and array[j] > key",
                    i=i,
                    j=j,
                    key_value=key,
                    key_index=j + 1,
                    compare_indices=(j, j + 1),
                    sorted_until=i - 1,
                )
            )

            if array[j] > key:
                array[j + 1] = array[j]
                steps.append(
                    SortStep(
                        array=tuple(array),
                        action="Shift right",
                        explanation=f"array[{j}] is larger than {key}, so it moves to array[{j + 1}].",
                        pseudocode_line="array[j + 1] = array[j]; j = j - 1",
                        i=i,
                        j=j,
                        key_value=key,
                        key_index=j,
                        compare_indices=(j, j + 1),
                        sorted_until=i - 1,
                    )
                )
                j -= 1
            else:
                steps.append(
                    SortStep(
                        array=tuple(array),
                        action="Stop shifting",
                        explanation=f"array[{j}] <= {key}, so the gap after index {j} is the insertion point.",
                        pseudocode_line="break",
                        i=i,
                        j=j,
                        key_value=key,
                        key_index=j + 1,
                        sorted_until=i - 1,
                    )
                )
                break

        array[j + 1] = key
        steps.append(
            SortStep(
                array=tuple(array),
                action="Insert key",
                explanation=f"Write key = {key} into array[{j + 1}].",
                pseudocode_line="array[j + 1] = key",
                i=i,
                j=j,
                key_value=key,
                key_index=j + 1,
                sorted_until=i,
            )
        )

    steps.append(
        SortStep(
            array=tuple(array),
            action="Sorted",
            explanation="Every prefix expansion is complete; the full array is sorted.",
            pseudocode_line="done",
            sorted_until=len(array) - 1,
        )
    )
    return steps
