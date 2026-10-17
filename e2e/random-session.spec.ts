import { expect, test } from "@playwright/test";

/**
 * The 隨機時段派對 flow: pick a time box, get a playlist that fits inside it,
 * open the room on the first game, then roll to the next one without anyone
 * re-scanning a QR code.
 *
 * Local/demo data only (no Firebase config), fresh browser profile per test, so
 * the draw starts from an empty play history and 3 分鐘 reliably fits two games.
 */
test("drawing a 3-minute playlist fills the budget and opens the room on its first game", async ({ page }) => {
  await page.goto("/random");
  await expect(page.getByRole("heading", { name: "時間有多少，就玩多少" })).toBeVisible();

  // The three advertised time boxes.
  for (const label of ["3分鐘快閃", "5分鐘正常", "10分鐘最久"]) {
    await expect(page.getByRole("radio", { name: new RegExp(label) })).toBeVisible();
  }

  /** Total minutes the drawn playlist advertises (the draw runs on the client). */
  const drawnTotal = async () => {
    const text = await page
      .getByText(/預估總計/)
      .first()
      .innerText()
      .catch(() => "");
    return Number(text.match(/預估總計\s*(\d+)\s*分/)?.[1] ?? NaN);
  };

  await page.getByRole("radio", { name: /3分鐘快閃/ }).click();
  await expect.poll(drawnTotal).toBeGreaterThan(0);
  expect(await drawnTotal()).toBeLessThanOrEqual(3);

  // Re-drawing stays inside the same budget.
  await page.getByRole("button", { name: "重新抽一次" }).click();
  await expect.poll(drawnTotal).toBeLessThanOrEqual(3);

  // Open the room on the first entry of the playlist.
  await page.getByRole("radio", { name: /有大螢幕/ }).click();
  await page.getByLabel("房主暱稱").fill("客廳電視");
  await page.getByRole("button", { name: /開始 3分鐘快閃/ }).click();
  await page.waitForURL(/\/room\/[^/]+\/host$/);
  await expect(page.getByRole("heading", { name: "遊戲大廳" })).toBeVisible();

  // The lobby shows the drawn session, not a bare single-game room.
  await expect(page.getByText(/3分鐘快閃/).first()).toBeVisible();
  await expect(page.getByText(/第 1 \/ \d+ 款/)).toBeVisible();
  await expect(page.getByText(/剩下 \d+ 分 \/ 上限 3 分/)).toBeVisible();

  // Skipping the current game promotes the next entry without leaving the room.
  const roomPath = new URL(page.url()).pathname;
  await page.getByRole("button", { name: /跳過這款/ }).click();
  await expect(page.getByText(/第 2 \/ \d+ 款/)).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(roomPath);
});
