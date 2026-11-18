import { expect, test, type Page } from "@playwright/test";

interface WorkerProbe {
  created: number;
  completed: number;
  terminated: number;
  active: number;
  holdMessages: boolean;
}
interface AudioProbe {
  supported: boolean;
  starts: number;
}
declare global {
  interface Window {
    __dsaWorkerProbe: WorkerProbe;
    __dsaAudioProbe: AudioProbe;
  }
}

// Observe the real browser services; no worker responses or algorithm results
// are mocked. Holding a genuine response makes pending navigation repeatable.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const probe: WorkerProbe = {
      created: 0,
      completed: 0,
      terminated: 0,
      active: 0,
      holdMessages: false,
    };
    window.__dsaWorkerProbe = probe;
    const NativeWorker = window.Worker;
    if (NativeWorker) {
      window.Worker = class extends NativeWorker {
        private live = true;
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options);
          probe.created++;
          probe.active++;
          this.addEventListener("message", (event) => {
            probe.completed++;
            if (probe.holdMessages) event.stopImmediatePropagation();
          });
        }
        override terminate() {
          if (this.live) {
            this.live = false;
            probe.active--;
            probe.terminated++;
          }
          super.terminate();
        }
      };
    }

    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    const audio: AudioProbe = { supported: Boolean(AudioCtor), starts: 0 };
    window.__dsaAudioProbe = audio;
    if (AudioCtor) {
      const create = AudioCtor.prototype.createOscillator;
      AudioCtor.prototype.createOscillator = function () {
        const oscillator = create.call(this);
        const start = oscillator.start;
        oscillator.start = function (when = 0) {
          audio.starts++;
          start.call(this, when);
        };
        return oscillator;
      };
    }
  });
});

const algorithms = [
  ["bubble-sort", "Bubble Sort"],
  ["selection-sort", "Selection Sort"],
  ["insertion-sort", "Insertion Sort"],
  ["merge-sort", "Merge Sort"],
  ["quick-sort", "Quick Sort"],
  ["heap-sort", "Heap Sort"],
  ["linear-search", "Linear Search"],
  ["binary-search", "Binary Search"],
  ["jump-search", "Jump Search"],
  ["interpolation-search", "Interpolation Search"],
  ["exponential-search", "Exponential Search"],
  ["ternary-search", "Ternary Search"],
  ["bfs", "Breadth-First Search"],
  ["dfs", "Depth-First Search"],
  ["linked-list-insert", "Linked List · Insert After"],
  ["linked-list-reverse", "Linked List · Reverse"],
  ["linked-list-middle", "Linked List · Find Middle"],
  ["edit-distance", "Edit Distance"],
  ["lcs", "Longest Common Subsequence"],
  ["knapsack", "0/1 Knapsack"],
] as const;

const stage = (page: Page) =>
  page.getByRole("region", { name: "Visualization", exact: true });
const timeline = (page: Page) => stage(page).getByRole("slider");

async function expectReady(page: Page) {
  await expect(
    page.getByRole("button", { name: "Next step", exact: true }),
  ).toBeEnabled();
  await expect(stage(page)).toHaveAttribute("aria-busy", "false");
  await expect
    .poll(() => page.evaluate(() => window.__dsaWorkerProbe.completed))
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => window.__dsaWorkerProbe.active))
    .toBe(0);
}

async function seekEnd(page: Page) {
  const slider = timeline(page);
  await slider.focus();
  await slider.press("End");
  await expect(slider).toHaveAttribute(
    "aria-valuenow",
    (await slider.getAttribute("aria-valuemax"))!,
  );
  await expect(
    page.getByRole("button", { name: "Next step", exact: true }),
  ).toBeDisabled();
}

async function openCatalog(page: Page) {
  // The visualizer breadcrumb stays available when desktop navigation collapses.
  await page
    .getByRole("link", { name: "Algorithm library", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Algorithm Visualizers", exact: true }),
  ).toBeVisible();
}

for (const [slug, title] of algorithms) {
  test(`${slug}: exported route loads a real worker trace`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(`/visualizers/${slug}/`);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expectReady(page);
    await expect(timeline(page)).toHaveAttribute("aria-valuenow", "0");
    expect(
      await page.evaluate(() => window.__dsaWorkerProbe.created),
    ).toBeGreaterThan(0);
    expect(errors, errors.join("\n")).toEqual([]);
  });
}

test("BFS visits its reachable component and leaves disconnected nodes unseen", async ({
  page,
}) => {
  await page.goto("/visualizers/bfs/");
  await expectReady(page);
  await seekEnd(page);
  await expect(
    stage(page).getByRole("img", {
      name: "Undirected graph; visited order: A, B, C, D, E",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    stage(page).getByText(
      "Traversal complete: A → B → C → D → E. Unreachable nodes remain unvisited.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("DFS follows a directed-cycle preset without revisiting nodes", async ({
  page,
}) => {
  await page.goto("/visualizers/dfs/");
  await expectReady(page);
  await page
    .getByLabel("Choose a module preset", { exact: true })
    .selectOption("directed-cycle");
  await expectReady(page);
  await seekEnd(page);
  await expect(
    stage(page).getByRole("img", {
      name: "Directed graph; visited order: A, B, C",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    stage(page).getByText("Visit order: A → B → C", { exact: true }),
  ).toBeVisible();
});

for (const scenario of [
  { slug: "linked-list-insert", result: "Inserted 25: 10 → 20 → 25 → 30 → 40" },
  { slug: "linked-list-reverse", result: "Reversed: 50 → 40 → 30 → 20 → 10" },
  {
    slug: "linked-list-middle",
    preset: "even",
    result: "Middle: index 2, value 30",
  },
] as const) {
  test(`${scenario.slug}: last frame exposes the pointer operation result`, async ({
    page,
  }) => {
    await page.goto(`/visualizers/${scenario.slug}/`);
    await expectReady(page);
    if ("preset" in scenario) {
      await page
        .getByLabel("Choose a module preset", { exact: true })
        .selectOption(scenario.preset);
      await expectReady(page);
    }
    await seekEnd(page);
    await expect(
      stage(page).getByRole("img", { name: /^Linked list\./ }),
    ).toBeVisible();
    await expect(
      stage(page).getByText(scenario.result, { exact: true }),
    ).toBeVisible();
  });
}

for (const scenario of [
  { slug: "edit-distance", result: "Edit distance: 3" },
  { slug: "lcs", result: "LCS length: 4 · sequence: BCBA" },
  { slug: "knapsack", result: "Optimal value: 12 · selected items: #2, #4" },
] as const) {
  test(`${scenario.slug}: table and reconstructed result agree at completion`, async ({
    page,
  }) => {
    await page.goto(`/visualizers/${scenario.slug}/`);
    await expectReady(page);
    await seekEnd(page);
    await expect(
      stage(page).getByRole("table", { name: "Dynamic programming table" }),
    ).toBeVisible();
    await expect(
      stage(page).getByText(scenario.result, { exact: true }),
    ).toBeVisible();
    await expect(
      stage(page)
        .getByRole("cell", { name: /reconstruction path/ })
        .first(),
    ).toBeVisible();
  });
}

test("a nested exported URL survives a direct refresh and rebuilds its initial timeline", async ({
  page,
}) => {
  await page.goto("/visualizers/edit-distance/");
  await expectReady(page);
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(timeline(page)).toHaveAttribute("aria-valuenow", "1");
  const response = await page.reload();
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/visualizers\/edit-distance\/$/);
  await expect(
    page.getByRole("heading", { name: "Edit Distance", exact: true }),
  ).toBeVisible();
  await expectReady(page);
  await expect(timeline(page)).toHaveAttribute("aria-valuenow", "0");
  await expect(
    page.getByRole("button", { name: "Previous step", exact: true }),
  ).toBeDisabled();
});

test("an unknown visualizer returns the static 404 page", async ({ page }) => {
  const response = await page.goto("/visualizers/not-an-algorithm/");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", {
      name: "This page could not be found.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to catalog", exact: true }),
  ).toBeVisible();
});

for (const width of [375, 834, 1440]) {
  test(`catalog and representative renderers stay within a ${width}px viewport`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 1000 });
    for (const slug of [
      "",
      "bubble-sort",
      "bfs",
      "linked-list-reverse",
      "knapsack",
    ]) {
      await page.goto(`/visualizers/${slug ? slug + "/" : ""}`);
      if (slug) {
        await expectReady(page);
        await expect(
          page.getByRole("button", { name: "Play", exact: true }),
        ).toBeVisible();
      } else {
        await expect(
          page.getByRole("heading", {
            name: "Algorithm Visualizers",
            exact: true,
          }),
        ).toBeVisible();
      }
      const dimensions = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
      }));
      expect(
        dimensions.document,
        `${slug || "catalog"} overflows at ${width}px`,
      ).toBeLessThanOrEqual(dimensions.viewport + 1);
    }
  });
}

test("navigation cancels a pending generation before another module becomes ready", async ({
  page,
}) => {
  await page.goto("/visualizers/bubble-sort/");
  await expectReady(page);
  await page.evaluate(() => {
    window.__dsaWorkerProbe.holdMessages = true;
  });
  await page
    .getByLabel("Array values", { exact: true })
    .fill("9, 8, 7, 6, 5, 4, 3, 2, 1");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(stage(page)).toHaveAttribute("aria-busy", "true");
  await expect
    .poll(() => page.evaluate(() => window.__dsaWorkerProbe.active))
    .toBeGreaterThan(0);
  const pending = await page.evaluate(() => ({ ...window.__dsaWorkerProbe }));
  await openCatalog(page);
  await expect
    .poll(() => page.evaluate(() => window.__dsaWorkerProbe.active))
    .toBe(0);
  // Require an in-app navigation, so a document reload cannot hide missing
  // cancellation by simply replacing the probe and its counters.
  expect(await page.evaluate(() => window.__dsaWorkerProbe.created)).toBe(
    pending.created,
  );
  expect(
    await page.evaluate(() => window.__dsaWorkerProbe.terminated),
  ).toBeGreaterThan(pending.terminated);
  await page.evaluate(() => {
    window.__dsaWorkerProbe.holdMessages = false;
  });
  await page
    .getByRole("link", { name: /Breadth-First Search/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/visualizers\/bfs\/?$/);
  await expectReady(page);
  await expect(timeline(page)).toHaveAttribute("aria-valuenow", "0");
  await expect(
    stage(page).getByRole("img", { name: /^Undirected graph;/ }),
  ).toBeVisible();
});

test("leaving autoplay and returning starts a stationary fresh timeline", async ({
  page,
}) => {
  await page.goto("/visualizers/bubble-sort/");
  await expectReady(page);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect
    .poll(() => timeline(page).getAttribute("aria-valuenow"))
    .not.toBe("0");
  await openCatalog(page);
  await page
    .getByRole("link", { name: /Bubble Sort/ })
    .first()
    .click();
  await expectReady(page);
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await expect(timeline(page)).toHaveAttribute("aria-valuenow", "0");
  // More than one default playback interval: a stale timer must not advance it.
  await page.waitForTimeout(1400);
  await expect(timeline(page)).toHaveAttribute("aria-valuenow", "0");
});

test("motion, audio, and transparency remain independent and persist across refresh", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/visualizers/bubble-sort/");
  await expectReady(page);
  await expect(
    page.getByRole("button", { name: "Unmute audio", exact: true }),
  ).toBeVisible();
  const motion = page.getByRole("button", {
    name: "Toggle reduced motion",
    exact: true,
  });
  await motion.click();
  await expect(motion).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Toggle reduced transparency", exact: true })
    .click();
  await expect(page.locator("html")).toHaveClass(/reduced-transparency/);
  await page.getByRole("button", { name: "Unmute audio", exact: true }).click();
  const soundToggle = page.getByRole("button", { name: "Mute audio", exact: true });
  await expect(soundToggle).toBeVisible();
  await expect(soundToggle).toBeEnabled();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__dsaAudioProbe.starts))
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(motion).toHaveAttribute("aria-pressed", "true");
  const preferences = await page.evaluate(
    () => JSON.parse(localStorage.getItem("dsa-visualizer-preferences")!).state,
  );
  expect(preferences).toMatchObject({
    isMuted: false,
    reducedMotion: true,
    reducedTransparency: true,
  });

  await page.reload();
  await expectReady(page);
  await expect(
    page.getByRole("button", { name: "Mute audio", exact: true }),
  ).toBeVisible();
  await expect(motion).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveClass(/reduced-transparency/);
  expect(await page.evaluate(() => window.__dsaAudioProbe.starts)).toBe(0);
  await page.getByRole("button", { name: "Mute audio", exact: true }).click();
  await page.reload();
  await expectReady(page);
  await expect(
    page.getByRole("button", { name: "Unmute audio", exact: true }),
  ).toBeVisible();
});
