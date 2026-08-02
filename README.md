# DSA Visualizer

An interactive, step-by-step Data Structures & Algorithms visualizer. Every
algorithm run is understandable at three levels: **visual state** (what changed),
**code state** (which line caused it), and **conceptual state** (metrics &
invariants explaining why).

Built with Next.js (App Router) · TypeScript · Tailwind · Radix (shadcn-style) ·
Zustand · Framer Motion · Monaco · Web Audio.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000  (redirects to /visualizers)
```

## Scripts

| Command             | Purpose                                  |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Start the dev server                     |
| `npm run build`     | Production build                         |
| `npm run typecheck` | `tsc --noEmit`                           |
| `npm run lint`      | ESLint (next/core-web-vitals)            |
| `npm run test`      | Vitest unit + component tests            |
| `npm run e2e`       | Playwright end-to-end smoke tests        |

## Architecture

The whole app is built around a single **step model**. Algorithm generators emit
`VisualizationStep` objects; the playback store selects the active step;
renderers animate toward it. Renderers never compute algorithm results.

```
lib/algorithms/     types, registry, and per-algorithm generators/definitions
lib/playback/       memoized step building + timing helpers
lib/stores/         Zustand playback (timeline) + preferences (audio/motion)
lib/audio/          Web Audio engine + cue helpers
components/renderers renderers keyed by VisualizerKind (ArrayRenderer, …)
components/visualizer shell, toolbar, viewport, code trace, metrics, legend
```

Key contracts live in [`lib/algorithms/types.ts`](lib/algorithms/types.ts):
`VisualizationStep`, `AlgorithmDefinition`, `RendererProps`.

## Adding a new algorithm

1. Create `lib/algorithms/<category>/<slug>/`.
2. Add `types.ts` (input, state, highlights), `generator.ts` (a **pure**
   `function*` yielding `VisualizationStep`s), and `definition.ts` (metadata,
   `validateInput`, presets, multi-language `code`).
3. Register it in [`lib/algorithms/registry.ts`](lib/algorithms/registry.ts).
   It now appears in the catalog, routing, and shell automatically.
4. Reuse an existing renderer via the step's `kind` when possible.
5. Add unit tests: final correctness + `validateSteps()` schema checks.
6. Verify light/dark, mobile, reduced motion, and keyboard controls.

### Step-generator rules

- Yield an atomic step **before/after** meaningful mutations (compares, swaps,
  pointer moves, writes).
- Keep `state` serializable; give moving elements a stable `id`.
- Cumulative metrics (comparisons/swaps/writes) must be **monotonic**.
- Map `code.activeLines` to the `primaryLanguage` source lines.
- The final step must clearly communicate the result.

## Accessibility & preferences

- Full keyboard control: `Space` play/pause, `←`/`→` step, `R` reset, `M` mute,
  `F` fullscreen (shortcuts never hijack typing).
- `aria-live` step notes, visible focus states, and text summaries for renderers.
- Respects `prefers-reduced-motion` (plus a manual override).
- Audio is **off by default** and only starts after a user gesture.

## Status

Phase 1 (Foundation) and Phase 2 (Array & Search Engine) are complete —
12 interactive visualizers, all sharing the same shell and `ArrayRenderer`:

- **Sorting:** Bubble, Selection, Insertion, Merge, Quick, Heap
- **Searching:** Linear, Binary, Jump, Interpolation, Exponential, Ternary
  (with target inputs and validated sorted-array preconditions)

Next: Phase 3 (Graph Engine — shared graph model, GraphRenderer, BFS/DFS/
Dijkstra, then the remaining graph algorithms). See `CLAUDE.md` for the roadmap.
