import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  chromium,
  expect,
  test,
  type BrowserContext,
  type Page,
} from "@playwright/test";

const extensionPath = path.join(process.cwd(), "extension-dist");

test("injects, observes SPA navigation, and synchronizes supported tabs", async () => {
  const userDataDir = await mkdtemp(path.join(tmpdir(), "shepherd-lens-e2e-"));
  const extensionErrors: string[] = [];
  let context: BrowserContext | undefined;

  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        "--no-first-run",
      ],
    });

    const page = context.pages()[0] ?? await context.newPage();
    monitorExtensionErrors(page, extensionErrors);
    await openYouTube(page);
    await expectSidebar(page);
    await dismissConsent(page);

    await page.goto("https://www.youtube.com/results?search_query=observability&hl=en", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectSidebar(page);
    await page.locator("ytd-video-renderer, yt-lockup-view-model").first().waitFor({
      state: "attached",
    });
    await expect(sidebar(page)).toContainText(/[1-9]\d* items?/);
    await sidebar(page).getByText("Feed diversity", { exact: true }).click();
    await expect(sidebar(page)).not.toContainText("No visible recommendations detected yet.");
    await sidebar(page).getByText("Observation quality", { exact: true }).click();
    await expect(sidebar(page)).toContainText("Interpretation boundary");
    await expect(sidebar(page)).toContainText("Visible sample");
    await expect(sidebar(page)).toContainText("search results");
    await expect(sidebar(page)).toContainText("Extraction freshness");

    await navigateAsYouTubeSpa(page, "/watch?v=shepherd-lens-e2e");
    await expect(page).toHaveURL(/\/watch\?v=shepherd-lens-e2e/);
    await expect(page.locator("#shepherd-lens-sidebar-root")).toHaveCount(1);

    await navigateAsYouTubeSpa(page, "/shorts/shepherd-lens-e2e");
    await expect(page).toHaveURL(/\/shorts\/shepherd-lens-e2e/);
    await expect(page.locator("#shepherd-lens-sidebar-root")).toHaveCount(1);

    const secondPage = await context.newPage();
    monitorExtensionErrors(secondPage, extensionErrors);
    await openYouTube(secondPage);
    await expectSidebar(secondPage);
    await sidebar(secondPage).getByText("Observation quality", { exact: true }).click();

    const worker =
      context.serviceWorkers()[0] ??
      await context.waitForEvent("serviceworker", { timeout: 15_000 });
    await expect.poll(() => snapshotCount(worker)).toBeGreaterThan(0);
    const beforeCount = await snapshotCount(worker);
    await appendHistorySnapshot(worker);

    await expect
      .poll(() => snapshotCountInSidebar(secondPage))
      .toBe(beforeCount + 1);
    expect(extensionErrors).toEqual([]);
  } finally {
    await context?.close();
    await rm(userDataDir, { force: true, recursive: true });
  }
});

async function openYouTube(page: Page) {
  await page.goto("https://www.youtube.com/", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
}

async function expectSidebar(page: Page) {
  await expect(page.locator("#shepherd-lens-sidebar-root")).toHaveCount(1);
  await expect(sidebar(page)).toContainText("Shepherd Lens");
}

async function dismissConsent(page: Page) {
  const rejectButton = page.getByRole("button", {
    name: /Reject the use of cookies|Reject all/i,
  });

  if (await rejectButton.isVisible().catch(() => false)) {
    await rejectButton.click();
    await expect(rejectButton).toBeHidden();
  }
}

function sidebar(page: Page) {
  return page.locator("#shepherd-lens-sidebar-root");
}

function monitorExtensionErrors(page: Page, errors: string[]) {
  page.on("console", (message) => {
    if (
      ["error", "warning"].includes(message.type()) &&
      message.text().includes("[Shepherd Lens]")
    ) {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    if (error.message === "Illegal invocation") {
      errors.push(error.message);
    }
  });
}

async function navigateAsYouTubeSpa(page: Page, route: string) {
  await page.evaluate((nextRoute) => {
    window.history.pushState({}, "", nextRoute);
    window.dispatchEvent(new Event("yt-navigate-finish"));
  }, route);
}

async function snapshotCount(worker: import("@playwright/test").Worker) {
  return worker.evaluate(async () => {
    const stored = await chrome.storage.local.get("shepherdLensHistory");
    const value = stored.shepherdLensHistory as
      | { snapshots?: unknown[] }
      | undefined;

    return Array.isArray(value?.snapshots) ? value.snapshots.length : 0;
  });
}

async function appendHistorySnapshot(worker: import("@playwright/test").Worker) {
  await worker.evaluate(async () => {
    const key = "shepherdLensHistory";
    const stored = await chrome.storage.local.get(key);
    const current = stored[key] as
      | { version?: number; snapshots?: Array<Record<string, unknown>> }
      | undefined;
    const snapshots = Array.isArray(current?.snapshots) ? current.snapshots : [];
    const latest = snapshots.at(-1);

    if (!latest) {
      throw new Error("Expected the first tab to persist a history snapshot.");
    }

    await chrome.storage.local.set({
      [key]: {
        version: 1,
        snapshots: [
          ...snapshots,
          {
            ...latest,
            id: `e2e-cross-tab-${Date.now()}`,
            timestamp: new Date().toISOString(),
          },
        ],
      },
    });
  });
}

async function snapshotCountInSidebar(page: Page) {
  return page.evaluate(() => {
    const host = document.querySelector("#shepherd-lens-sidebar-root");
    const labels = [
      ...(host?.shadowRoot?.querySelectorAll("span") ?? []),
    ].filter((element) => element.textContent?.trim() === "Snapshots");
    const rowText = labels.at(-1)?.parentElement?.textContent ?? "";
    const match = rowText.match(/Snapshots\s*(\d+)/i);

    return match ? Number(match[1]) : -1;
  });
}
