# CS Visualization Engine

Interactive Streamlit dashboard for DSA execution traces and Transformer mechanics.

## Directory Structure

```text
cs_visualizer/
├── app.py
├── requirements.txt
├── cs_viz/
│   ├── ai/
│   │   ├── tokenization.py
│   │   ├── transformer.py
│   │   └── visualizations.py
│   ├── dsa/
│   │   ├── dynamic_programming.py
│   │   ├── graph.py
│   │   ├── linked_list.py
│   │   ├── sorting.py
│   │   └── visualizations.py
│   └── ui/
│       ├── ai_page.py
│       ├── common.py
│       └── dsa_page.py
└── tests/
    ├── test_dsa_traces.py
    └── test_transformer_math.py
```

## Run

```bash
cd /Users/muanpi/Documents/Codex/cs_visualizer
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```

## Verify

```bash
cd /Users/muanpi/Documents/Codex/cs_visualizer
pytest -q
```

The Transformer verification checks three properties:

1. Vectorized scaled dot-product attention matches a slow loop reference.
2. Softmax attention rows sum to 1.
3. Analytic Q/K/V gradients match central finite differences.
