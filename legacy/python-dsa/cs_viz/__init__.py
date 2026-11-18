"""Interactive Computer Science visualization engine.

The package is intentionally split into small, testable modules:

* :mod:`cs_viz.dsa` contains deterministic execution traces for classic
  algorithms and data-structure operations.
* :mod:`cs_viz.ai` contains pedagogical Transformer mechanics backed by real
  NumPy/SciPy linear algebra.
* :mod:`cs_viz.ui` contains Streamlit rendering code.
"""

__all__ = ["ai", "dsa", "ui"]
