# PARTYVERSE

One Room. 16 Games. Infinite Chaos.

多人派對遊戲平台：一支手機就能開局，不需要電視、投影機或電腦；有大螢幕的話也可以當主畫面。掃描 QR code 就能立即加入，免下載、免註冊。

## Quick Start

```bash
npm install
cp .env.example .env.local  # 填入 Firebase 設定
npm run dev
```

### Scripts

- `npm run dev` — 啟動開發伺服器
- `npm run build` — 正式環境編譯（靜態預渲染 + 類型驗證）
- `npm run lint` — ESLint 靜態檢查
- `npm run typecheck` — TypeScript 嚴格模式全專案類型檢查
- `npm run test` — Vitest 單元測試（遊戲引擎與工具函式）

## 手機主持（不需要大螢幕）

建立房間時選擇主持方式（預設「手機主持・我也玩」）：

| 模式 | 房主 | 畫面 |
| --- | --- | --- |
| 手機主持・我也玩 | 在自己的手機上主持，同時是玩家、計分 | 每支手機自己顯示「主畫面」 |
| 手機主持・只當主持人 | 不計分、不占名額，專心控場 | 同上 |
| 有大螢幕／電視 | 這台裝置當主畫面，不下場 | 大螢幕＋手機當手把（原本的玩法） |

- **主持人選單**（右下角皇冠）：邀請（代碼、QR、分享連結）、玩家名單、重新開始、結束並結算、關閉房間；大廳可切換「我也要下場玩」。
- **主畫面面板**：沒有大螢幕時，需要大家一起看的階段（揭曉、淘汰、煙火、搶椅子節拍、大亂鬥）會自動在手機上展開，也可以隨時手動開關。
- **你畫我猜**：猜題的人直接在手機上看到畫布，揭曉時看到答案；**臥底／密室逃脫**的答案顯示在結算頁。
- **穩定性**：手機房主會自動保持螢幕不休眠；房主離線或凍結時，下一位玩家會依固定順序自動接手主持並收到提示。
- 規劃與取捨見 [`docs/phone-host-plan.md`](docs/phone-host-plan.md)。

> 注意：房主的手機負責遊戲計時，並且在「我也玩」模式下技術上能讀到私密資料（例如臥底身分）。這是無伺服器架構的取捨；想要完全公平，請選「只當主持人」。

## Firebase Setup

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 建立新專案
3. 啟用 **Realtime Database**
4. 啟用 **Authentication** → **Anonymous（匿名登入）**
5. 將專案金鑰複製到 `.env.local`

## Database Rules

**Deployable rules live in [`database.rules.json`](database.rules.json).**  
See [docs/firebase-rules.md](docs/firebase-rules.md) for what they allow, how to deploy, and the remaining anti-cheat roadmap.

> Do **not** open the database to public read/write to “fix” join. If phones still get `PERMISSION_DENIED`, read [跨裝置加入修正與部署排錯](docs/firebase-join-fix.md) and confirm the deployed rules match the JSON in this repo.

## 隨機時段派對（3分鐘快閃 / 5分鐘正常 / 10分鐘最久）

不想挑遊戲時，選一個時間長度就好：系統會隨機抽出**塞得進這段時間**的遊戲清單，
每款附上「玩得完」的建議設定（大廳仍可自由調整），並盡量避開這台裝置最近玩過的遊戲。
每款玩完，結算畫面會自動接下一款，全場不用重新掃碼。

- 入口：首頁「隨機時段」、`/random`、`/create` 的模式卡、大廳與結算畫面的「抽一個隨機時段」
- 抽選邏輯：`src/lib/playlist.ts`；玩過什麼：`src/lib/playHistory.ts`
- 詳細說明：[docs/play-modes.md](docs/play-modes.md)

## Gameplay/mobile implementation update

See [the first-pass implementation and verification notes](docs/gameplay-implementation.md).

Latest: [2026-10-14 隨機時段派對](docs/play-modes.md) — three time-boxed draw modes (3/5/10 minutes) that pick a non-repeating playlist inside the budget, carry suggested settings into the room, and roll game to game from the results screen.

Previous: [2026-09-24 room re-entry fix](docs/room-reentry-fix.md) — creating a second room on the same device no longer dropped the host from the big-screen view into `/join/<code>` (the create and room segments mount different providers, and the room gate treated "still opening this room" as "not a member").

Previous: [2026-09-23 gameplay foundation](docs/gameplay-foundation.md) — all 15 games now have readiness-based briefings and in-game rules reminders; Poker and Word Chain have fairness/pacing fixes. Includes verification results and the remaining roadmap.

The default host device is now a display-only TV; every participant (including the host who wants to play) joins using a separate controller. **Local demo mode only shares rooms between ordinary tabs in the same browser** — use the lobby's “開新分頁當玩家” link. Physical phones and separate/incognito browser profiles require configured Firebase.

Browser regressions: `npx playwright install chromium && npm run test:e2e` (local/demo data only).
