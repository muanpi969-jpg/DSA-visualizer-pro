import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";

/** Collect console errors so we can fail the build on unexpected ones. */
function trackConsoleErrors(errors: string[]) {
  return (msg: ConsoleMessage) => {
    if (msg.type() === "error") errors.push(msg.text());
  };
}

const stage = (page: Page) => page.getByRole("region", { name: "Visualization", exact: true });
const timeline = (page: Page) => stage(page).getByRole("slider");

async function waitForReady(page: Page) {
  await expect(stage(page)).toHaveAttribute("aria-busy", "false");
  await expect(page.getByRole("button", { name: "Next step", exact: true })).toBeEnabled();
}

async function useFastPlayback(page: Page) {
  const speed = page.getByRole("combobox", { name: "Playback speed", exact: true });
  await speed.click();
  await page.getByRole("option", { name: "5×", exact: true }).click();
  await expect(speed).toHaveText("5×");
}

test("catalog lists Bubble Sort and links to it", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", trackConsoleErrors(errors));
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("/visualizers");
  await expect(
    page.getByRole("heading", { name: "Algorithm Visualizers" }),
  ).toBeVisible();

  const card = page.getByRole("link", { name: /Bubble Sort/i });
  await expect(card.first()).toBeVisible();
  await card.first().click();

  await expect(page).toHaveURL(/\/visualizers\/bubble-sort/);
  await expect(page.getByRole("heading", { name: "Bubble Sort" })).toBeVisible();
  await waitForReady(page);

  expect(errors, errors.join("\n")).toEqual([]);
});

test("bubble sort plays to a sorted result", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", trackConsoleErrors(errors));
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("/visualizers/bubble-sort/");
  await waitForReady(page);

  // Use a small array so full playback finishes quickly and deterministically.
  await page.getByLabel("Array values").fill("3, 1, 2");
  await expect(page.getByLabel("Array values")).toHaveValue("3, 1, 2");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await waitForReady(page);
  await expect(page.getByLabel("Array values")).toHaveValue("3, 1, 2");
  await expect(stage(page).getByText(/Start Bubble Sort on 3 elements/)).toBeVisible();
  await useFastPlayback(page);

  // Step forward manually first.
  await page.getByLabel("Next step").click();
  await expect(timeline(page)).toHaveAttribute("aria-valuenow", "1");
  await page.getByLabel("Previous step").click();
  await expect(timeline(page)).toHaveAttribute("aria-valuenow", "0");

  // Play through to completion.
  await page.getByLabel("Play", { exact: true }).click();

  // The final note announces the sorted result.
  await expect(stage(page).getByText(/the array is sorted/i)).toBeVisible({
    timeout: 10_000,
  });

  // Reset returns to the start.
  await page.getByLabel("Reset", { exact: true }).click();
  await expect(page.getByText(/Start Bubble Sort/i)).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("binary search found and not-found flows", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", trackConsoleErrors(errors));
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("/visualizers/binary-search/");
  await waitForReady(page);

  // Found flow.
  await page.getByLabel("Array values").fill("1, 3, 5, 7, 9");
  await page.getByLabel("Target value").fill("7");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await waitForReady(page);
  await expect(page.getByLabel("Array values")).toHaveValue("1, 3, 5, 7, 9");
  await expect(page.getByLabel("Target value")).toHaveValue("7");
  await expect(stage(page).getByText(/Search for 7\./)).toBeVisible();
  await useFastPlayback(page);
  await page.getByLabel("Play", { exact: true }).click();
  await expect(page.getByText(/Found target 7 at index 3/i)).toBeVisible({
    timeout: 10_000,
  });

  // Not-found flow.
  await page.getByLabel("Target value").fill("4");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await waitForReady(page);
  await expect(page.getByLabel("Array values")).toHaveValue("1, 3, 5, 7, 9");
  await expect(page.getByLabel("Target value")).toHaveValue("4");
  await expect(stage(page).getByText(/Search for 4\./)).toBeVisible();
  await page.getByLabel("Play", { exact: true }).click();
  await expect(page.getByText(/not in the array/i)).toBeVisible({
    timeout: 10_000,
  });

  // Sorted precondition is validated, not silently fixed. (Filter because
  // Next's route announcer is also role="alert".)
  await page.getByLabel("Array values").fill("5, 1, 3");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: /sorted/i }),
  ).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("dark mode toggle works", async ({ page }) => {
  await page.goto("/visualizers/bubble-sort");
  await waitForReady(page);
  const html = page.locator("html");
  const initiallyDark = await html.evaluate((el) =>
    el.classList.contains("dark"),
  );
  await page.getByRole("button", { name: /Switch to (light|dark) mode/i }).click();
  const nowDark = await html.evaluate((el) => el.classList.contains("dark"));
  expect(nowDark).not.toBe(initiallyDark);
});

test("mobile viewport keeps controls usable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/visualizers/bubble-sort");
  await waitForReady(page);
  await expect(page.getByLabel("Play", { exact: true })).toBeVisible();
  await page.getByLabel("Next step").click();
  // No horizontal overflow of the document body.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 2,
  );
  expect(overflow).toBe(true);
});
