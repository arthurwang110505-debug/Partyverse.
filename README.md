# PARTYVERSE

One Room. 16 Games. Infinite Chaos.

多人派對遊戲平台：電視當主畫面，手機就是控制器。掃描 QR code 就能立即加入，免下載、免註冊。

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

## Gameplay/mobile implementation update

See [the first-pass implementation and verification notes](docs/gameplay-implementation.md).

Latest: [2026-09-24 room re-entry fix](docs/room-reentry-fix.md) — creating a second room on the same device no longer dropped the host from the big-screen view into `/join/<code>` (the create and room segments mount different providers, and the room gate treated "still opening this room" as "not a member").

Previous: [2026-09-23 gameplay foundation](docs/gameplay-foundation.md) — all 15 games now have readiness-based briefings and in-game rules reminders; Poker and Word Chain have fairness/pacing fixes. Includes verification results and the remaining roadmap.

The default host device is now a display-only TV; every participant (including the host who wants to play) joins using a separate controller. **Local demo mode only shares rooms between ordinary tabs in the same browser** — use the lobby's “開新分頁當玩家” link. Physical phones and separate/incognito browser profiles require configured Firebase.

Browser regressions: `npx playwright install chromium && npm run test:e2e` (local/demo data only).
