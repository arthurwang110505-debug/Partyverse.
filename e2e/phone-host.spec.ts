import { expect, test, type Page } from "@playwright/test";
import type { Room } from "../src/types";

/**
 * The whole point of phone hosting: nobody has a TV. One phone creates the room,
 * three more join by code, and the party runs on the phones alone.
 */

async function readRoom(page: Page, code: string): Promise<Room> {
  return page.evaluate((code) => JSON.parse(localStorage.getItem(`partyverse_room_${code}`)!), code);
}

async function joinAndReady(page: Page, code: string, nickname: string) {
  await page.goto(`/join/${code}`);
  await page.getByLabel("你的暱稱").fill(nickname);
  await page.getByRole("button", { name: "加入派對" }).click();
  await page.waitForURL(new RegExp(`/room/${code}/play$`));
  await page.getByRole("button", { name: /點擊確認準備就緒/ }).click();
  await expect(page.getByRole("button", { name: /已就緒/ })).toBeVisible();
}

test("a phone hosts and plays a whole game with no big screen", async ({ page: host, context }) => {
  const errors: string[] = [];
  host.on("pageerror", (error) => errors.push(error.message));

  await host.goto("/create/everybodyknows");
  await expect(host.getByRole("radio", { name: /手機主持・我也玩/ })).toHaveAttribute("aria-checked", "true");
  await host.getByLabel("房主暱稱").fill("房主小明");
  await host.getByLabel("回合數", { exact: true }).selectOption("1");
  await host.getByRole("button", { name: "建立房間", exact: true }).click();
  await host.waitForURL(/\/room\/[^/]+\/host$/);
  const code = host.url().split("/").at(-2)!;

  // The lobby is built for a phone: invite sharing, and no mention of a TV.
  await expect(host.getByRole("button", { name: /分享邀請給朋友/ })).toBeVisible();
  await expect(host.getByRole("switch", { name: "我也要下場玩" })).toBeChecked();
  await expect(host.getByText("請看電視大螢幕")).toHaveCount(0);

  const friends = await Promise.all(Array.from({ length: 3 }, () => context.newPage()));
  await Promise.all(friends.map((friend, i) => joinAndReady(friend, code, `好友${i + 1}`)));
  // A waiting friend sees who is here, not an instruction to look at a TV.
  await expect(friends[0].getByText("等房主開始遊戲")).toBeVisible();
  await expect(friends[0].getByLabel("房內玩家").getByText("房主小明")).toBeVisible();

  const room = await readRoom(host, code);
  expect(room.screenMode).toBe("phones");
  expect(room.players[room.hostPlayerId]).toMatchObject({ role: "player", isHost: true });

  await host.getByRole("button", { name: "全員就緒！立刻開始" }).click();
  await expect.poll(async () => (await readRoom(host, code)).status).toBe("PLAYING");
  // The host is one of the four players.
  expect((await readRoom(host, code)).participantIds).toHaveLength(4);

  // Everybody (the host included) gets the rules on their own phone.
  for (const phone of [host, ...friends]) {
    await phone.getByRole("button", { name: "我看懂了，準備好了", exact: true }).click();
  }
  // Everyone votes for 好友1.
  for (const phone of [host, ...friends]) {
    await phone.getByRole("button", { name: /好友1/ }).click();
  }
  await expect.poll(async () => (await readRoom(host, code)).gameState.phase).toBe("reveal");

  // With no TV, the reveal is shown on the phones themselves.
  await expect(friends[1].getByRole("region", { name: "主畫面" })).toBeVisible();

  // The match ends on the shared results page, with the host's controls there.
  await host.waitForURL(new RegExp(`/room/${code}/results$`));
  await friends[0].waitForURL(new RegExp(`/room/${code}/results$`));
  await expect(host.getByText("好友1", { exact: false }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("the host menu invites, lists the room and ends the match from the host's own phone", async ({
  page: host,
  context,
}) => {
  await host.goto("/create/everybodyknows");
  await host.getByLabel("房主暱稱").fill("房主小明");
  await host.getByRole("button", { name: "建立房間", exact: true }).click();
  await host.waitForURL(/\/room\/[^/]+\/host$/);
  const code = host.url().split("/").at(-2)!;
  const friends = await Promise.all(Array.from({ length: 3 }, () => context.newPage()));
  await Promise.all(friends.map((friend, i) => joinAndReady(friend, code, `好友${i + 1}`)));
  await host.getByRole("button", { name: "全員就緒！立刻開始" }).click();
  await expect.poll(async () => (await readRoom(host, code)).status).toBe("PLAYING");

  await host.getByRole("button", { name: "主持人選單" }).click();
  const menu = host.getByRole("dialog");
  await expect(menu.getByText(code, { exact: false }).first()).toBeVisible();
  await expect(menu.getByLabel("房內玩家")).toContainText("好友2");
  await menu.getByRole("button", { name: "結束並結算", exact: true }).click();
  await menu.getByRole("alertdialog").getByRole("button", { name: "確認", exact: true }).click();
  await host.waitForURL(new RegExp(`/room/${code}/results$`));
  await friends[2].waitForURL(new RegExp(`/room/${code}/results$`));
});

test("when the host's phone drops, the next phone takes over automatically", async ({ page: host, context }) => {
  await host.goto("/create/everybodyknows");
  await host.getByLabel("房主暱稱").fill("房主小明");
  await host.getByRole("button", { name: "建立房間", exact: true }).click();
  await host.waitForURL(/\/room\/[^/]+\/host$/);
  const code = host.url().split("/").at(-2)!;
  const friends = await Promise.all(Array.from({ length: 2 }, () => context.newPage()));
  await Promise.all(friends.map((friend, i) => joinAndReady(friend, code, `好友${i + 1}`)));
  const before = (await readRoom(friends[0], code)).hostPlayerId;

  // The host's phone dies. Demo mode has no server to notice, so say it the way the
  // presence layer would: the host is marked offline.
  await friends[0].evaluate((code) => {
    const key = `partyverse_room_${code}`;
    const room = JSON.parse(localStorage.getItem(key)!);
    room.players[room.hostPlayerId].isConnected = false;
    localStorage.setItem(key, JSON.stringify(room));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  }, code);

  await expect
    .poll(async () => (await readRoom(friends[0], code)).hostPlayerId, { timeout: 30000 })
    .not.toBe(before);
  const after = await readRoom(friends[0], code);
  expect(after.players[after.hostPlayerId].isHost).toBe(true);
  expect(Object.values(after.players).filter((p) => p.isHost)).toHaveLength(1);
});
