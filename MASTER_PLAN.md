# MASTER_PLAN — Unified DSA Visualizer

Approved direction: extend Next.js/TypeScript into a static, browser-only DSA learner workspace; active code in apps/web, original projects in legacy. Deliver on GitHub with root-level Vercel configuration. Hosting publication requires a separate deployment action.

## Audit inventory

| Original project              | Stack / state                                                                | Content / disposition                                                                |
| ----------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| DSA visualizer                | Next 14, React 18, TS, Zustand snapshots, Tailwind, Radix, Motion, Web Audio | 6 sorts + 6 searches; chosen foundation                                              |
| DSA                           | Streamlit, Plotly, NumPy/SciPy, session-state index                          | insertion, BFS, list insert, knapsack, educational attention; port unique DSA        |
| codex cs_visualizer           | Same                                                                         | Authored files identical to DSA; preserve provenance                                 |
| Claude Code root              | Vanilla JS, Canvas, mutable simulation loops                                 | NN, optimizers, K-means, regression; archive ML                                      |
| Claude Code/dsa_ml_visualizer | Streamlit/Plotly, deep-copy recorder                                         | 5 sorts, BFS/DFS, list reverse/middle, edit distance/LCS, attention; port unique DSA |
| Generated/unrelated           | Python environments, caches, launch settings, audio-to-tab CLI               | Preserve locally; exclude from active application/deployment                         |

Original baseline: web 173 tests + lint/typecheck passed; duplicate Python suite 6 passed; Claude attention suite 18 passed. There were no actual tree or weighted pathfinding implementations. Orphan npm lockfile, duplicate entire Python project, duplicate bubble helper logic, stale absolute paths, missing CLAUDE.md references, and outdated dependencies were identified.

## Phase 1 — Cleanup, architecture, ports

- Snapshot/checksum authored sources before moving; establish Git baseline; retain originals under legacy; exclude generated environments and unrelated runtime dependencies.
- Use one npm workspace/root lockfile, apps/web; supported Next16/React19, Node24; direct ESLint flat config. Retain Tailwind3, Radix, Zustand and Motion with compatible dependencies.
- Retain pure AlgorithmDefinition generator contract and typed array/graph/list/matrix states. Steps include stable IDs, serializable independent state, highlights, narration, metrics, source trace, semantic operations.
- Generate in a module Worker with run identity. Terminate superseded workers; ignore stale results/errors. Keep only active run, cap 10,000 frames / 16 MiB UTF-8 JSON; show explicit truncation without successful completion.
- Store transition intent for load, autoplay, forward/backward, seek, reset, replay, cancel. Rewind selects snapshots. Reset reuses frames; new input creates a new run. Pause on hidden document; cancel on unmount.
- Standardize speed40–2000ms/step, default600. Limits: arrays40, graph30nodes/60edges, list12nodes, strings12codepoints, knapsack12items/capacity40.
- Preserve six sorts/six searches; add BFS/DFS, list insert/reverse/middle, edit distance/LCS/knapsack: twenty modules. Graphs use stable ordering, directed edges, consistent discovery/visit/parents; even lists return second middle. Reject invalid values instead of silently coercing knapsack inputs.
- Correct nonfinite/interpolation arithmetic, insertion metrics/source mismatch, ordered-prefix semantics, list pointer overlays and directed graph rendering.

## Phase 2 — Shell and Liquid Glass

- Working dashboard at /, searchable/category catalog at /visualizers, existing algorithm URLs preserved. Desktop sidebar + visualizer + code inspector; tablet collapsible regions; mobile single column with bounded matrix scrolling.
- Shared light/dark glass tokens: translucent white/slate surfaces,24px blur, refractive white0.15 border in dark, specular inner highlights, soft depth shadows,18–24px radii, ambient violet/mint/peach mesh and system typography.
- Glass navigation/tools/panels with readable data. System theme default; persist theme, reduced motion and reduced transparency. Opaque fallback and html.reduced-transparency. Stop ambient movement under reduced motion.
- Motion160–240ms, shortened for fast playback. Stable ID animations, keyboard controls, text alternatives, visible focus and semantic labels beyond color. Audio independent of motion.

## Phase 3 — Audio

- Extend native zero-dependency oscillator engine with gesture-only lazy startup, persisted mute(default)/volume, gain envelopes, filtering, compression, and node cleanup.
- Compare25–40ms pitch tick; swap/write50–90ms glass pluck; graph visits harmonic depth chimes; edges paired notes; pointer/DP variants; original major completion chord.
- Maximum8 oscillator voices,20regularcues/sec, completion priority. Cue autoplay/forward only; rewind/seek/load/reset silent. Deduplicate by run and transition. Reset/navigation/mute/hidden cancel voices. No chord for truncation or errors. Failures never stop visualization.

## Phase 4 — Verification and delivery

- Preserve regression suite; add numeric extremes, empty/duplicate inputs, stable IDs, independent snapshots, metrics/source mappings and exact intermediate invariants.
- Test graph cycles/disconnection/direction/parents; linked insertion boundaries/pointers/even-middle; DP base cases/answers/reconstruction.
- Test Worker failure/stale results/cancellation/limits and playback transitions. Test audio mappings/gesture/persistence/budgets/cancellation/priority; listen manually.
- Use static export with pre-generated routes, dynamicParams=false, trailingSlash; await route params and metadata params. Serve out for browser tests; bundle Worker/Monaco same-origin.
- Check direct nested refresh, unknown404, actual Worker assets, Chromium/Firefox/WebKit/mobile, light/dark, reduced motion/transparency, keyboard/focus, overflow and glass contrast.
- CI: lint, types, unit/components, static build, production audit, actual-export browser checks. Deliver verified source/static output, Vercel configuration, documentation and provenance.

## Risks and mitigation

| Risk                                      | Mitigation                                                        |
| ----------------------------------------- | ----------------------------------------------------------------- |
| Different algorithm conventions           | Typed steps, normalized operations, intermediate-state tests      |
| Correct answer but misleading explanation | Source-map, pointer, parent, metric and reconstruction assertions |
| Trace memory/main-thread stalls           | Worker, bounded inputs/frames/bytes, no global cache              |
| Framework migration/static routing        | Separate upgrade verification and actual-export browser checks    |
| Glass performance/readability             | Bounded blur, opacity fallback, contrast/responsive checks        |
| Stale or duplicated sound                 | Intent/run identity, bounded voice scheduling and cancellation    |
| Loss of provenance                        | Source manifest, unchanged archives, baseline Git commit          |

## Confirmed decisions

Next.js; apps/web plus legacy; existing DSA scope; learner audience; static browser deployment. ML, trees, weighted pathfinding and new backend features are out of this release. User subsequently requested Vercel deployability and GitHub publication.

## Subsequent user refinements

- Supply actual C implementations alongside JavaScript/Python for all twenty visualizers; compile/run C references and verify source line maps.
- Make comparison sounds clearly audible (85ms with an audible body), add visible Sound on/off and Test sound controls, play a preview on enable, show volume/startup feedback, and test real synthesized PCM output. Keep muted-by-default startup and user-gesture requirements.
