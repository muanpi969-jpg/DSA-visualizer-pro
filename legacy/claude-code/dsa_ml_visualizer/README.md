# 🧠 ML & DSA Visual Lab

An interactive, dependency-light **Streamlit** application that visualizes, step
by step, both **Data Structures & Algorithms** and the **linear algebra inside a
Transformer** (the engine behind encoder–decoder models like **BART** and
**T5**).

Built for CS students who learn best by *watching the execution loop run* — every
comparison, pointer rewire, DP-table update, and attention weight is rendered
live and recomputed from your own inputs.

Everything is implemented **from scratch in NumPy/SciPy** — no pre-trained
weights, no GPU, no `transformers` download. The attention math is independently
**verified** against standard ML principles, both live in the UI and in CI.

---

## ✨ What's inside

### 📦 DSA Module — step through the execution loop
| Family | Algorithms | What you see |
|---|---|---|
| **Sorting** | Bubble, Insertion, Selection, Quicksort (Lomuto), Merge | bars coloured by *compared / swapped / sorted / pivot / key*, with live comparison & swap counters |
| **Graph Traversal** | BFS, DFS | a force-directed graph with the *current* node, the *frontier* (queue/stack), *visited* set, and the traversal tree highlighted |
| **Linked List (pointers)** | Reverse (3-pointer), Find Middle (fast/slow) | nodes keep their memory slot while the `next` arrows are rewired — `prev/curr/next/slow/fast` labelled on each node |
| **Dynamic Programming** | Edit Distance (Levenshtein), Longest Common Subsequence | the DP table fills cell-by-cell, highlighting each cell's *dependencies*, then back-tracks the optimal path |

Use **⏮ ◀ ▶ ⏭** or the slider to move through every frame.

### 🤖 AI/ML Module — Transformer attention, unpacked
A five-tab walkthrough of a self-attention block:

1. **Tokenize** — text → tokens → ids → embeddings (subword `##` splitting, `<s>/</s>` boundaries, BART vs T5 conventions).
2. **Embeddings** — the input matrix `X = token_embedding + sinusoidal positional_encoding`.
3. **Q · K · V** — the three learned linear projections, per head.
4. **Attention** — `A = softmax(QKᵀ / √d_head)` then `output = A·V`, with the iconic attention heatmap and a per-query-token drill-down.
5. **Verify** — runs the verification suite live.

Tunable: input text, number of heads, dim/head, BART/T5 boundaries, subword
splitting, and a **causal mask** toggle (the difference between a bidirectional
*encoder* and a masked *decoder*).

---

## 🔬 Verification (the math is provably correct)

`core/verification.py` re-derives every quantity independently and asserts the
invariants any correct attention implementation must satisfy:

1. softmax rows are a probability distribution (≥ 0, sum to 1);
2. the hand-rolled softmax equals `scipy.special.softmax`;
3. scores use the `1/√d_head` scaling;
4. `output == weights · V`;
5. the causal mask blocks all attention to the future;
6. multi-head split/concat preserves shapes;
7. attention is permutation-equivariant (a defining property, pre-positional).

These run **live** in the dashboard's *⑤ Verify* tab **and** as `pytest`:

```text
$ pytest -q
.................. 18 passed
```

---

## 🚀 Running it

```bash
# from the project root
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

streamlit run app.py          # opens http://localhost:8501
pytest -q                     # run the verification suite
python -m core.verification   # print the AI checks to the console
```

> Requires Python 3.10+. Tested on Python 3.14 with Streamlit 1.58.

---

## 🏗️ Architecture & directory structure

The codebase has a strict separation of concerns: **pure algorithm logic never
imports Streamlit**, so it stays unit-testable, and a single step-replay control
works for every algorithm.

```
dsa_ml_visualizer/
├── app.py                       # Streamlit entry — navigation shell only
├── requirements.txt
├── README.md
│
├── core/                        # framework-agnostic plumbing
│   ├── state.py                 #   Step + StepRecorder (the replay engine)
│   └── verification.py          #   independent checks of the AI matrix math
│
├── dsa/                         # pure algorithm logic → emits Step streams
│   ├── sorting.py
│   ├── graph_traversal.py       #   BFS/DFS + a NumPy spring layout
│   ├── linked_list.py           #   pointer manipulation (array-of-next model)
│   └── dynamic_programming.py   #   Edit Distance, LCS
│
├── ai/                          # the AI mechanics, from scratch
│   ├── tokenizer.py             #   text → tokens → ids (deterministic)
│   └── attention.py             #   embeddings + multi-head self-attention (NumPy)
│
├── ui/                          # Streamlit pages + Plotly figure builders
│   ├── components.py            #   shared step navigator, metrics, palette
│   ├── dsa_pages.py
│   └── ai_pages.py
│
└── tests/
    └── test_attention.py        # pytest enforcement of the AI math
```

### How the step-through works
Each algorithm is plain Python that records **frozen snapshots** of its own state
via `StepRecorder.record(...)`. The snapshots use a tiny shared *highlight
vocabulary* (`compared`, `swapped`, `current`, `frontier`, `dependencies`, …) so
one renderer can colour the visuals for *every* algorithm. The UI never sees the
algorithm — only a `List[Step]` it replays with a slider.

```python
rec = StepRecorder()
rec.record("Compare a[0] and a[1]", {"array": a}, highlights={"compared": [0, 1]})
# ... the UI later draws rec[i] for the slider position i
```

---

## 🧩 Extending it

- **New sorting algorithm:** write a function that returns a `StepRecorder` using
  the shared highlight keys, then add it to `sorting.ALGORITHMS`.
- **New AI view:** every intermediate matrix (`X, Q, K, V, scores, weights,
  output`) is exposed on `AttentionResult` — add a tab in `ui/ai_pages.py`.
- **New verification:** add a `check_*()` to `core/verification.py` and list it in
  `ALL_CHECKS`; it is then enforced by both the UI and `pytest` automatically.

---

*Pure NumPy/SciPy. Every number on screen is one you could compute by hand — and
the Verify tab proves it.*
