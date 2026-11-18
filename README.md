# DSA Studio

A unified algorithm learning workspace with Liquid Glass surfaces, reversible playback, source-code tracing in C, JavaScript, and Python, metrics, and optional synthesized sound. Twenty visualizers run entirely in your browser; deployment needs no Python service, database, or environment variables.

## Run locally

Use Node.js 24 and npm 11 (`nvm use` if you use nvm).

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For the production site:

```sh
npm run build
npm run preview
```

Preview serves http://127.0.0.1:3100 from `apps/web/out`.

## Deploy on Vercel

Import [muanpi969-jpg/DSA-visualizer-pro](https://github.com/muanpi969-jpg/DSA-visualizer-pro) into Vercel. Keep **Root Directory at the repository root** and **Framework Preset: Other**. The root `vercel.json` supplies everything:

| Setting               | Value           |
| --------------------- | --------------- |
| Install               | `npm ci`        |
| Build                 | `npm run build` |
| Output                | `apps/web/out`  |
| Node.js               | 24.x            |
| Environment variables | None            |

The app is a Next.js static export. Vercel serves HTML, CSS, JavaScript, the algorithm Worker, and local Monaco assets. Keep trailing slashes enabled. Do not configure `next start` or an SPA catch-all rewrite: every algorithm route has its own HTML file, and unknown routes should return 404.

For an existing Vercel project that previously used the old root-level Next app, change its root/framework settings to the values above before redeploying. After connecting the repository, Vercel creates deployments automatically for Git pushes.

Alternatively, from an authenticated Vercel CLI session run `vercel` at the repository root, then `vercel --prod` when ready to publish.

## Algorithms

- **Sorting:** Bubble, Selection, Insertion, Merge, Quick, Heap.
- **Searching:** Linear, Binary, Jump, Interpolation, Exponential, Ternary.
- **Graphs:** BFS and DFS, including directed and disconnected inputs.
- **Linked lists:** Insert-after, Reverse, Middle (second middle for even lengths).
- **Dynamic programming:** Edit Distance, Longest Common Subsequence, 0/1 Knapsack.

Graphs visualize the component reachable from the selected start node. Tree visualizers, weighted shortest paths, and ML demos remain future work.

## Controls

Play/pause, forward/backward stepping, timeline seeking, reset, input presets, editable inputs, speed, fullscreen, theme, reduced motion, reduced transparency, mute, and volume. Keyboard shortcuts: Space play/pause; arrows step; R reset; M mute; F fullscreen. Shortcuts leave text inputs and code editing alone.

Audio starts only after a user gesture and is muted by default. Click **Sound off** to enable it and hear a short preview, or use **Test sound**. The volume percentage is visible; enabling/testing restores a zero-volume preference to 60%. Browser audio startup errors appear inline. Rewind and seeking are silent. Preferences persist locally. Reduced motion and audio are independent.

## Architecture

```text
apps/web/                  active Next.js / TypeScript application
  lib/algorithms/           pure generators, metadata, validation, source maps
  lib/playback/             bounded Worker generation and serializable protocol
  lib/stores/               timeline and persisted preferences
  lib/audio/                zero-dependency Web Audio synthesis and cue policy
  components/renderers/     arrays, graphs, linked lists, DP matrices
legacy/                    unchanged reference source from all four projects
scripts/                   static preview and optional Monaco asset packaging
MASTER_PLAN.md             approved roadmap and architectural decisions
VERIFICATION.md            implementation checks and remaining limits
```

The UI sends a Worker `{runId, slug, input}`; generators emit immutable-by-convention, independently owned state snapshots. Only the current run remains in memory. A maximum of 10,000 frames or 16 MiB of UTF-8 serialized trace data bounds generation. Serialized byte size is not heap size; Workers and structured cloning temporarily add memory overhead. Truncation is explicit and never reported as successful completion.

The playback store records transition intent so audio follows forward actions rather than arbitrary state changes. Renderers present snapshots and never compute algorithm results.

## Checks

```sh
npm run lint
npm run typecheck
npm test                          # C source tests use an available cc compiler
npm run test:c                     # optional: Python 3 + clang/cc, checks 12 C references
npm run build
npx playwright install chromium firefox webkit   # first browser-test setup
npm run e2e
npm audit --omit=dev
```

CI runs those checks against the actual static export. For one browser use `npm run e2e -- --project=chromium`.

## Add a module

1. Implement a pure generator, bounded input validation, metadata/presets, and source snippets in `apps/web/lib/algorithms`.
2. Emit independent serializable snapshots with stable IDs, cumulative metrics, explanatory notes, and semantic operations. Use a matching renderer kind.
3. Register the definition in `lib/algorithms/registry.ts` and supply typed input controls where required.
4. Test final results, intermediate invariants, snapshot independence, source mappings, and boundary inputs.
5. Build and test the exported route, including Worker loading, responsive layout, and keyboard operation.

## Provenance

`legacy/SOURCE_MANIFEST.json` records the original path, archive path, and SHA-256 checksum for every preserved authored source. `legacy/python-dsa` and `legacy/python-codex` contain identical authored projects. Their original environments remain local and ignored; they are not part of the website or its dependencies. The Git history preserves the initial workspace baseline.
