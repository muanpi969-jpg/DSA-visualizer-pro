# ML Visual Lab

An interactive, **dependency-free** machine-learning visualization tool that runs
entirely in the browser. Every algorithm — backpropagation, the Adam optimizer,
k-means, ridge regression — is implemented from scratch in plain JavaScript. No
TensorFlow, no NumPy, no build step, no network calls.

Open `index.html` and explore.

![tabs: Neural Network · Optimizers · Clustering · Regression](https://img.shields.io/badge/modules-4-e97a2f) ![no dependencies](https://img.shields.io/badge/dependencies-0-2bb673)

---

## The four modules

### ◉ Neural Network Playground
Train a multilayer perceptron on 2D datasets and watch its **decision boundary**
form in real time.

- **Datasets:** spiral, concentric circles, XOR, moons, gaussians — with adjustable label noise.
- **Editable architecture:** add/remove hidden layers and neurons with live `+ / −` controls.
- **Activations:** tanh, ReLU, sigmoid.
- **Optimizers:** SGD, Momentum, RMSprop, Adam.
- **Regularization:** adjustable L2 weight decay.
- **Live views:** decision-boundary heatmap, network diagram (edge thickness/colour = weight magnitude/sign), and a train-vs-test loss curve so you can *see* over- and under-fitting.

### ⛰ Optimizer Landscape
Race six gradient-descent optimizers down the **same loss surface** from the same
starting point and watch which ones get stuck.

- **Surfaces:** Rosenbrock (the banana valley), an ill-conditioned bowl, a saddle point, Beale, and Himmelblau (4 minima).
- **Optimizers:** SGD, Momentum, NAG, Adagrad, RMSprop, Adam — toggle any subset on/off.
- Live trails, per-optimizer current loss, and an adjustable learning-rate scale that lets you watch SGD diverge while Adam glides in.

### ⬡ K-Means Clustering
Watch **Lloyd's algorithm** discover structure in unlabeled data.

- Voronoi assignment regions, animated centroid migration with trails, and a per-iteration **inertia** curve.
- Choose `k`, point count, and spread; seed with **k-means++** (reliable) or **random** (watch it occasionally fall into a local optimum — a real k-means pitfall).

### ∿ Polynomial Regression
Fit polynomials and *see* the **bias / variance tradeoff**.

- Pick a true function (sine, cubic, step, gaussian bump), sample size, and noise.
- Slide the polynomial **degree** from 1 to 15 and watch under-fitting become over-fitting.
- Add **ridge (L2) regularization** to tame a wild high-degree fit.
- The "error vs degree" panel plots the classic **U-shaped test-error curve** with a marker on your current degree.

---

## Running it

It's a static site — any of these work:

```bash
# Option 1: just open the file
open index.html                       # macOS

# Option 2: serve it (recommended; avoids any file:// quirks)
npx http-server -p 8848 -c-1 .        # then visit http://localhost:8848
# or
python3 -m http.server 8848
```

No installation or internet connection required after you have the files.

### Keyboard shortcuts
`1`–`4` switch between the four modules.

---

## How it works (the from-scratch parts)

| Concept | Where | Notes |
|---|---|---|
| Forward / backward propagation | `js/nn.js` | Dense layers, per-activation derivatives, mini-batch gradient accumulation. |
| Optimizers | `js/nn.js`, `js/optimizers.js` | SGD, Momentum, NAG, Adagrad, RMSprop, Adam — with bias-corrected moments for Adam. |
| Loss functions | `js/nn.js` | Sigmoid + binary cross-entropy for classification; linear + MSE for regression. |
| Weight init | `js/nn.js` | He scaling for ReLU, Xavier-style otherwise. |
| k-means++ seeding & Lloyd's | `js/kmeans.js` | D²-weighted seeding and iterative reassignment. |
| Ridge least squares | `js/regression.js` | Builds `XᵀX + λI` and solves by Gaussian elimination with partial pivoting. |
| Gradients on test surfaces | `js/optimizers.js` | Numeric central differences, so new functions are trivial to add. |
| Deterministic RNG | `js/utils.js` | Mulberry32 + Box–Muller, so runs are reproducible. |

Sanity-checked: the network reaches ~96% on XOR and ~93% on the spiral in a couple
thousand mini-batch steps.

---

## Project layout

```
index.html              # shell + script tags (load order matters)
css/styles.css          # dark theme, responsive layout
js/
  utils.js              # RNG, colormaps, canvas/scale helpers
  datasets.js           # synthetic 2D datasets + train/test split
  nn.js                 # the MLP: layers, forward, backprop, optimizers
  ui.js                 # tiny control-builder helpers (sliders, selects…)
  playground.js         # ◉ Neural Network module
  optimizers.js         # ⛰ Optimizer Landscape module
  kmeans.js             # ⬡ Clustering module
  regression.js         # ∿ Regression module
  app.js                # tab navigation + lazy mounting
```

Everything attaches to a single global `ML` namespace; modules are loaded as
classic `<script>` tags (no bundler, no ES-module/`file://` friction).

## Extending it

- **New dataset:** add a generator to `js/datasets.js` returning `{points:[{x,y,label}], classes}` and list it in the playground's dataset select.
- **New loss surface:** add an entry to `FUNCS` in `js/optimizers.js` with `{f, domain, start, min, lr}`. The gradient is computed numerically, so you only supply `f`.
- **New optimizer:** add a case to `Network._step` in `js/nn.js` (and/or a row in `makeOptimizers` in `js/optimizers.js`).

---

*Built as a single self-contained artifact — view source on any module to see the
actual math doing the work.*
