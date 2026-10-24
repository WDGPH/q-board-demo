import { test, expect } from "@playwright/test";

test("kiosk fits 16:9 displays in full screen", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Projector layout uses a desktop browser.",
  );
  await page.route("**/event.config.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `export default ${JSON.stringify({ sessions: [{ id: "panel", title: "AI in public health: from promise to practice", description: "", starts_at: "2026-11-20T09:00:00Z" }] })}`,
    }),
  );
  await page.addInitScript(() =>
    localStorage.setItem(
      "q-board-preview-v1",
      JSON.stringify([
        {
          id: "projector",
          event_id: "demo",
          session_id: "panel",
          status: "approved",
          question_text:
            "How can public health teams work with communities to evaluate new AI tools, improve access to care, and ensure that decisions remain accountable? "
              .repeat(4)
              .slice(0, 500),
          created_at: "2026-11-20T09:00:00Z",
          vote_count: 10,
          has_voted: false,
          moderator_note: null,
        },
      ]),
    ),
  );
  await page.goto("/moderator");
  await page.getByRole("button", { name: "Open kiosk" }).click();
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport);
    await page
      .getByRole("button", { name: "Full screen", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
      .toBe(true);
    await expect
      .poll(() =>
        page
          .locator(".kiosk")
          .evaluate((el) => ({
            height: el.clientHeight,
            scrollHeight: el.scrollHeight,
          })),
      )
      .toEqual({ height: viewport.height, scrollHeight: viewport.height });
    // Content must fit without hiding the question, invitation, or operator controls.
    for (const selector of [
      ".kiosk-card-bottom",
      ".kiosk-invitation small",
      ".kiosk-controls",
    ]) {
      const box = await page.locator(selector).boundingBox();
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    }
    const card = await page.locator(".kiosk-question").boundingBox();
    const text = await page.locator(".kiosk-question > p").boundingBox();
    const bottom = await page.locator(".kiosk-card-bottom").boundingBox();
    expect(text!.y + text!.height).toBeLessThanOrEqual(bottom!.y);
    expect(bottom!.y + bottom!.height).toBeLessThanOrEqual(
      card!.y + card!.height,
    );
    await page.screenshot({
      path: testInfo.outputPath(`kiosk-${viewport.height}p.png`),
    });
    await page.evaluate(() => document.exitFullscreen());
  }
});
