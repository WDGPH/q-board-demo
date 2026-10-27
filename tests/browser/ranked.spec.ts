import { test, expect } from "@playwright/test";

test("ranked view supports direct links, live ranking, and readable phone/tablet layouts", async ({
  page,
}, testInfo) => {
  await page.route("**/event.config.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "export default {}",
    }),
  );
  await page.goto("/moderator");
  await page.getByRole("link", { name: "Open ranked view" }).click();
  await expect(page).toHaveURL(/\/moderator\/ranked$/);
  const cards = page.locator(".ranked-card");
  await expect(cards).toHaveCount(6);
  await expect(cards.nth(1)).toContainText("Where should we draw the line");
  await expect(cards.nth(2)).toContainText("meaningful community involvement");
  await page.reload();
  await expect(cards).toHaveCount(6);
  await cards.first().getByRole("button", { name: "Mark answered" }).click();
  await expect(cards).toHaveCount(5);
  await expect(cards.first()).toContainText("Where should we draw the line");
  await page.evaluate(() => {
    const questions = JSON.parse(localStorage.getItem("q-board-preview-v1")!);
    questions.find((q: { id: string }) => q.id === "demo-2").vote_count = 200;
    localStorage.setItem("q-board-preview-v1", JSON.stringify(questions));
    window.dispatchEvent(new Event("storage"));
  });
  await expect(cards.nth(1)).toContainText("How should we measure");
  const sizes =
    testInfo.project.name === "desktop"
      ? [
          { width: 768, height: 1024 },
          { width: 1024, height: 768 },
        ]
      : [{ width: 360, height: 800 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await cards
        .first()
        .locator("h2")
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(22);
    const button = await cards
      .first()
      .getByRole("button", { name: "Mark answered" })
      .boundingBox();
    expect(button!.height).toBeGreaterThanOrEqual(48);
    await page.screenshot({
      path: testInfo.outputPath(`ranked-${size.width}.png`),
      fullPage: true,
    });
  }
  await page.getByRole("link", { name: "Moderator panel" }).click();
  await expect(
    page.getByRole("link", { name: "Open ranked view" }),
  ).toBeVisible();
});
