"""
dsa.dynamic_programming
=======================

Tabular (bottom-up) dynamic programming, visualized cell-by-cell.  DP is where
students most need to *see the state change*: every cell's value is a function
of a few neighbours, and the visualization draws exactly which neighbours were
consulted to compute the current cell.

Snapshots use:

* ``"table"`` – the 2-D DP table (list of lists)
* ``"rows"``  – row header labels (characters of string A, with a leading "")
* ``"cols"``  – column header labels (characters of string B, with a leading "")

Highlights use:

* ``current``      – ``[r, c]`` cell just computed
* ``dependencies`` – list of ``[r, c]`` cells that fed into it
* ``path``         – cells on the reconstructed optimal path (final steps)
"""

from __future__ import annotations

from typing import List

from core.state import StepRecorder


def edit_distance(a: str, b: str) -> StepRecorder:
    """Levenshtein edit distance via the Wagner–Fischer DP.

    ``dp[i][j]`` = minimum single-character edits (insert / delete / substitute)
    to turn ``a[:i]`` into ``b[:j]``.  Recurrence::

        dp[i][j] = dp[i-1][j-1]                      if a[i-1] == b[j-1]
                 = 1 + min(dp[i-1][j],   # delete from a
                           dp[i][j-1],   # insert into a
                           dp[i-1][j-1]) # substitute
                                                     otherwise

    Complexity: O(|a|·|b|) time and space.
    """
    n, m = len(a), len(b)
    dp: List[List[int]] = [[0] * (m + 1) for _ in range(n + 1)]
    rows = [""] + list(a)
    cols = [""] + list(b)
    rec = StepRecorder()

    snap = lambda: {"table": [row[:] for row in dp], "rows": rows, "cols": cols}

    # base cases: transforming to/from the empty string
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    rec.record("Base cases: edit distance to/from the empty string is just its length.",
               snap(), {"path": [[i, 0] for i in range(n + 1)] + [[0, j] for j in range(m + 1)]})

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
                deps = [[i - 1, j - 1]]
                why = f"'{a[i-1]}' == '{b[j-1]}' → free match, copy the diagonal ({dp[i][j]})."
            else:
                best = min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
                dp[i][j] = 1 + best
                deps = [[i - 1, j], [i, j - 1], [i - 1, j - 1]]
                why = (f"'{a[i-1]}' ≠ '{b[j-1]}' → 1 + min(delete {dp[i-1][j]}, "
                       f"insert {dp[i][j-1]}, substitute {dp[i-1][j-1]}) = {dp[i][j]}.")
            rec.bump("cells_filled")
            rec.record(f"dp[{i}][{j}]: {why}", snap(),
                       {"current": [i, j], "dependencies": deps})

    # reconstruct one optimal alignment path by walking back from the corner
    path = []
    i, j = n, m
    while i > 0 or j > 0:
        path.append([i, j])
        if i > 0 and j > 0 and a[i - 1] == b[j - 1] and dp[i][j] == dp[i - 1][j - 1]:
            i, j = i - 1, j - 1
        elif i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            i -= 1
        elif j > 0 and dp[i][j] == dp[i][j - 1] + 1:
            j -= 1
        else:
            i, j = i - 1, j - 1
    path.append([0, 0])
    rec.record(f"Answer: {dp[n][m]} edits. Backtrack from the corner to recover an optimal alignment.",
               snap(), {"path": path, "current": [n, m]})
    return rec


def longest_common_subsequence(a: str, b: str) -> StepRecorder:
    """Longest Common Subsequence length via DP.

    ``dp[i][j]`` = length of the LCS of ``a[:i]`` and ``b[:j]``.  Recurrence::

        dp[i][j] = dp[i-1][j-1] + 1            if a[i-1] == b[j-1]
                 = max(dp[i-1][j], dp[i][j-1]) otherwise

    Complexity: O(|a|·|b|).
    """
    n, m = len(a), len(b)
    dp: List[List[int]] = [[0] * (m + 1) for _ in range(n + 1)]
    rows = [""] + list(a)
    cols = [""] + list(b)
    rec = StepRecorder()
    snap = lambda: {"table": [row[:] for row in dp], "rows": rows, "cols": cols}

    rec.record("Base case: LCS with an empty string is 0 (whole first row/column).",
               snap(), {"path": [[i, 0] for i in range(n + 1)] + [[0, j] for j in range(m + 1)]})

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
                deps = [[i - 1, j - 1]]
                why = f"'{a[i-1]}' == '{b[j-1]}' → extend diagonal: {dp[i-1][j-1]} + 1 = {dp[i][j]}."
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
                deps = [[i - 1, j], [i, j - 1]]
                why = f"mismatch → carry the better of up({dp[i-1][j]}) / left({dp[i][j-1]}) = {dp[i][j]}."
            rec.bump("cells_filled")
            rec.record(f"dp[{i}][{j}]: {why}", snap(),
                       {"current": [i, j], "dependencies": deps})

    # backtrack the actual subsequence
    path, seq = [], []
    i, j = n, m
    while i > 0 and j > 0:
        path.append([i, j])
        if a[i - 1] == b[j - 1]:
            seq.append(a[i - 1]); i, j = i - 1, j - 1
        elif dp[i - 1][j] >= dp[i][j - 1]:
            i -= 1
        else:
            j -= 1
    rec.record(f"LCS length = {dp[n][m]}; one such subsequence is '{''.join(reversed(seq))}'.",
               snap(), {"path": path, "current": [n, m]})
    return rec


ALGORITHMS = {
    "Edit Distance (Levenshtein)": edit_distance,
    "Longest Common Subsequence": longest_common_subsequence,
}
