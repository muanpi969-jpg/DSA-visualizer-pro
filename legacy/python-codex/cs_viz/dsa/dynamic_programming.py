"""Dynamic-programming traces."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class KnapsackItem:
    """Input item for the 0/1 knapsack problem."""

    weight: int
    value: int


@dataclass(frozen=True)
class DPStep:
    """A single cell update in a dynamic-programming table."""

    table: np.ndarray
    row: int
    column: int
    action: str
    explanation: str
    pseudocode_line: str
    include_value: int | None = None
    exclude_value: int | None = None


def knapsack_steps(items: list[KnapsackItem], capacity: int) -> list[DPStep]:
    """Return the state changes for a 0/1 knapsack DP table.

    ``dp[i][w]`` is the best value achievable using the first ``i`` items and a
    knapsack capacity of ``w``.
    """

    capacity = max(0, capacity)
    table = np.zeros((len(items) + 1, capacity + 1), dtype=int)
    steps: list[DPStep] = [
        DPStep(
            table=table.copy(),
            row=0,
            column=0,
            action="Initialize table",
            explanation="Base cases are zero: no items or zero capacity produces value 0.",
            pseudocode_line="dp = zeros((n + 1, capacity + 1))",
        )
    ]

    for row, item in enumerate(items, start=1):
        for column in range(capacity + 1):
            exclude = int(table[row - 1, column])
            include = None
            if item.weight <= column:
                include = int(item.value + table[row - 1, column - item.weight])
                table[row, column] = max(exclude, include)
                action = "Choose max(include, exclude)"
                explanation = (
                    f"Item {row} fits at capacity {column}. "
                    f"include={include}, exclude={exclude}, choose {table[row, column]}."
                )
                pseudocode = "dp[i][w] = max(value[i] + dp[i - 1][w - weight[i]], dp[i - 1][w])"
            else:
                table[row, column] = exclude
                action = "Carry previous value"
                explanation = (
                    f"Item {row} has weight {item.weight}, which exceeds capacity {column}; "
                    f"carry dp[{row - 1}][{column}] = {exclude}."
                )
                pseudocode = "dp[i][w] = dp[i - 1][w]"

            steps.append(
                DPStep(
                    table=table.copy(),
                    row=row,
                    column=column,
                    action=action,
                    explanation=explanation,
                    pseudocode_line=pseudocode,
                    include_value=include,
                    exclude_value=exclude,
                )
            )

    return steps
