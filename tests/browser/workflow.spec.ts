import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";

test("kiosk is launched by moderators and updates without a reload", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open kiosk" })).toHaveCount(0);
  await page.goto("/moderator");
  await page.getByRole("button", { name: "Open kiosk" }).click();
  await expect(page.locator(".kiosk-question")).toBeVisible();
  await expect(
    page.getByText("Invite perspectives from both research and practice."),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Pause rotation" }).click();
  await page.evaluate(() => {
    const all = JSON.parse(
      localStorage.getItem("q-board-preview-v1") || "null",
    );
    // Preview samples are seeded lazily; use a fresh public question as the full stored list.
    localStorage.setItem(
      "q-board-preview-v1",
      JSON.stringify([
        ...(all || []),
        {
          id: "live-kiosk",
          event_id: "demo",
          question_text: "A new question from the audience",
          status: "approved",
          created_at: new Date().toISOString(),
          vote_count: 100,
          has_voted: false,
          moderator_note: "Never project this",
        },
      ]),
    );
    window.dispatchEvent(new Event("storage"));
  });
  await expect(page.locator(".kiosk-question")).toContainText(
    "A new question from the audience",
  );
  await expect(page.getByText("Never project this")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (testInfo.project.name === "desktop") {
    await page.screenshot({
      path: testInfo.outputPath("kiosk-desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.screenshot({
      path: testInfo.outputPath("kiosk-tablet.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.querySelector(".kiosk")!.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "Exit kiosk" }).click();
  await expect(page.getByRole("button", { name: "Open kiosk" })).toBeVisible();
});

test.describe("local session times", () => {
  test.use({ timezoneId: "America/New_York", locale: "en-US" });

  test("formats dates using local calendar days in options and details", async ({
    page,
  }) => {
    const sessions = [
      {
        id: "same-day",
        title: "Evening",
        description: "",
        starts_at: "2026-11-20T23:00:00Z",
        ends_at: "2026-11-21T01:00:00Z",
      },
      {
        id: "overnight",
        title: "Overnight",
        description: "",
        starts_at: "2026-11-21T04:00:00Z",
        ends_at: "2026-11-21T06:00:00Z",
      },
      {
        id: "start-only",
        title: "Morning",
        description: "",
        starts_at: "2026-11-21T14:00:00Z",
      },
    ];
    await page.clock.setFixedTime(new Date("2026-11-20T08:00:00Z"));
    await page.route("**/event.config.ts*", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: `export default ${JSON.stringify({ sessions })}`,
      }),
    );
    await page.goto("/");
    await page.locator(".session-summary").click();
    const selector = page.getByRole("combobox", { name: /session/i });
    const cases = [
      ["same-day", "Nov 20, 6:00 PM – 8:00 PM"],
      ["overnight", "Nov 20, 11:00 PM – Nov 21, 1:00 AM"],
      ["start-only", "Nov 21, 9:00 AM"],
    ];
    for (const [id, expected] of cases) {
      await expect(selector.locator(`option[value="${id}"]`)).toContainText(
        expected,
      );
      await selector.selectOption(id);
      await expect(page.locator(".session-time")).toHaveText(expected);
    }
  });
});
// Exercise the default single-list flow independently of local event settings.
test.beforeEach(async ({ page }) => {
  await page.route("**/event.config.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "export default {}",
    }),
  );
});
test("attendee submission, moderation, voting, notes, export, and persistence", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Big ideas/ })).toBeVisible();
  await expect(page.getByRole("combobox", { name: /session/i })).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("attendee.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByLabel("Your question", { exact: true })
    .fill("How do we make implementation accountable to communities?");
  await page.getByRole("button", { name: "Submit question" }).click();
  await expect(page.getByRole("status")).toContainText("submitted for review");
  await expect(
    page.getByText("How do we make implementation accountable to communities?"),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Moderator access" }).click();
  let card = page.locator(".moderator-card").filter({
    hasText: "How do we make implementation accountable to communities?",
  });
  await card
    .getByLabel("Internal moderator note")
    .fill("Private note for our closing panel");
  await card.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("link", { name: "Question board", exact: true }).click();
  let publicCard = page.locator(".question-card").filter({
    hasText: "How do we make implementation accountable to communities?",
  });
  await expect(publicCard).toBeVisible();
  await expect(
    page.getByText("Private note for our closing panel"),
  ).toHaveCount(0);
  await publicCard.getByRole("button").click();
  await expect(publicCard.getByRole("button")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.reload();
  publicCard = page.locator(".question-card").filter({
    hasText: "How do we make implementation accountable to communities?",
  });
  await expect(publicCard.getByRole("button")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await publicCard.getByRole("button").click();
  await expect(publicCard.getByRole("button")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByRole("link", { name: "Moderator access" }).click();
  await page
    .locator(".status-tabs")
    .getByRole("button", { name: "Approved", exact: true })
    .click();
  card = page.locator(".moderator-card").filter({
    hasText: "How do we make implementation accountable to communities?",
  });
  await expect(card.getByLabel("Internal moderator note")).toHaveValue(
    "Private note for our closing panel",
  );
  await card.getByRole("button", { name: "Shortlist", exact: true }).click();
  await page
    .locator(".status-tabs")
    .getByRole("button", { name: "Shortlist", exact: true })
    .click();
  card = page.locator(".moderator-card").filter({
    hasText: "How do we make implementation accountable to communities?",
  });
  await card.getByRole("button", { name: "Mark answered" }).click();
  await page
    .locator(".status-tabs")
    .getByRole("button", { name: "Answered", exact: true })
    .click();
  await expect(
    page.locator(".moderator-card").filter({
      hasText: "How do we make implementation accountable to communities?",
    }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/questions-.*\.csv$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("event links resolve and unknown pages have recovery links", async ({
  page,
}) => {
  await page.goto("/e/public-health-ai-symposium");
  await expect(page.getByRole("heading", { name: /Big ideas/ })).toBeVisible();
  await page.goto("/missing");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Return to the question board" })
    .click();
  await expect(page.getByRole("heading", { name: /Big ideas/ })).toBeVisible();
});

test("sessions isolate submission, moderation, counts, voting, and exports", async ({
  page,
}, testInfo) => {
  await page.clock.setFixedTime(new Date("2026-11-20T08:00:00Z"));
  const sessions = [
    {
      id: "opening",
      title: "Opening panel",
      description: "Discuss our opening ideas.",
      starts_at: "2026-11-20T09:00:00Z",
      ends_at: "2026-11-20T10:00:00Z",
    },
    {
      id: "closing",
      title: "Closing panel",
      description: "Reflections and next steps.",
      starts_at: "2026-11-20T16:00:00Z",
    },
  ];
  await page.route("**/event.config.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `export default ${JSON.stringify({ sessions })}`,
    }),
  );
  await page.goto("/");
  const picker = page.locator(".session-selector");
  const summary = picker.locator("summary");
  await expect(summary).toContainText("Opening panel");
  await expect(picker).not.toHaveAttribute("open");
  await expect(page.getByText("Discuss our opening ideas.")).toBeHidden();
  // The collapsed picker stays compact and opens with the keyboard.
  expect((await picker.boundingBox())!.height).toBeLessThan(100);
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(picker).toHaveAttribute("open", "");
  const selector = page.getByRole("combobox", { name: /session/i });
  await expect(selector).toHaveValue("opening");
  await expect(page.getByText("Discuss our opening ideas.")).toBeVisible();
  await expect(page.locator(".session-time")).not.toContainText("UTC");
  await page
    .getByLabel("Your question", { exact: true })
    .fill("Question for opening speakers");
  await page.getByRole("button", { name: "Submit question" }).click();
  await expect(page.getByRole("status")).toContainText("submitted for review");
  await selector.selectOption("closing");
  await summary.click();
  await expect(summary).toContainText("Closing panel");
  await expect(selector).toBeHidden();
  await summary.focus();
  await page.keyboard.press("Space");
  await expect(selector).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveValue("");
  await expect(page.getByRole("status")).toHaveCount(0);
  await page
    .getByLabel("Your question", { exact: true })
    .fill("Question for closing speakers");
  await page.getByRole("button", { name: "Submit question" }).click();
  await expect(page.getByRole("status")).toContainText("submitted for review");
  await page.getByRole("link", { name: "Moderator access" }).click();
  await expect(page.getByText("Question for opening speakers")).toBeVisible();
  await expect(page.getByText("Question for closing speakers")).toHaveCount(0);
  if ((await picker.getAttribute("open")) === null) await summary.click();
  await expect(
    page.locator(".summary-grid").getByRole("button", { name: "Pending 1" }),
  ).toBeVisible();
  await selector.selectOption("");
  await expect(page.locator(".moderator-card")).toHaveCount(2);
  await selector.selectOption("opening");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await selector.selectOption("closing");
  await expect(page.getByText("Question for closing speakers")).toBeVisible();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const csv = await readFile((await (await downloaded).path())!, "utf8");
  expect(csv).toContain('"session_id","session_title"');
  expect(csv).toContain('"closing","Closing panel"');
  expect(csv).not.toContain("Question for opening speakers");
  await page.getByRole("link", { name: "Question board", exact: true }).click();
  await expect(page.getByText("Question for opening speakers")).toBeVisible();
  await expect(page.getByText("Question for closing speakers")).toHaveCount(0);
  if ((await picker.getAttribute("open")) === null) await summary.click();
  await selector.selectOption("closing");
  await expect(page.getByText("Question for closing speakers")).toBeVisible();
  await expect(page.getByText("Question for opening speakers")).toHaveCount(0);
  await page.locator(".question-card").getByRole("button").click();
  await expect(
    page.locator(".question-card").getByRole("button"),
  ).toHaveAttribute("aria-pressed", "true");
  await summary.click();
  await expect(summary).toContainText("Closing panel");
  await page.screenshot({
    path: testInfo.outputPath("sessions.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await summary.click();
  await selector.selectOption("closing");
  await expect(
    page.locator(".question-card").getByRole("button"),
  ).toHaveAttribute("aria-pressed", "true");
});

test("session defaults follow the clock and ended sessions remain selectable", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-20T11:30:00Z") });
  const sessions = [
    {
      id: "past",
      title: "Morning panel",
      description: "Morning discussion",
      starts_at: "2026-11-20T09:00:00Z",
      ends_at: "2026-11-20T10:00:00Z",
    },
    {
      id: "current",
      title: "Midday panel",
      description: "Midday discussion",
      starts_at: "2026-11-20T11:00:00Z",
      ends_at: "2026-11-20T12:00:00Z",
    },
    {
      id: "next",
      title: "Evening panel",
      description: "Evening discussion",
      starts_at: "2026-11-20T16:00:00Z",
      ends_at: "2026-11-20T17:00:00Z",
    },
  ];
  await page.route("**/event.config.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `export default ${JSON.stringify({ sessions })}`,
    }),
  );
  await page.goto("/");
  const picker = page.locator(".session-selector");
  const summary = picker.locator("summary");
  await expect(summary).toContainText("Midday panel");
  await summary.click();
  const selector = page.getByRole("combobox", { name: /session/i });
  await expect(selector.locator('option[value="past"]')).toContainText("Ended");
  await selector.selectOption("past");
  await expect(picker).toHaveClass(/session-ended/);
  await summary.click();
  await expect(summary).toContainText("Morning panel · Ended");
  // Passing a boundary updates the status without moving a user's selection.
  await summary.click();
  await selector.selectOption("current");
  await page.clock.fastForward(31 * 60 * 1000);
  await expect(selector).toHaveValue("current");
  await expect(summary).toContainText("Midday panel · Ended");
  await page.reload();
  await expect(summary).toContainText("Evening panel");
});
