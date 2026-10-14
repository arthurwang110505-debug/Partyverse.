# 隨機時段派對（3分鐘快閃 / 5分鐘正常 / 10分鐘最久）

三個「時間盒」模式：房主說得出還有多久，系統就抽一份玩得完的遊戲清單。

| 模式 | 上限 | 抽選結果（大約） |
|---|---|---|
| 3分鐘快閃 | 3 分鐘 | 1–2 款最短的遊戲（例如 跟著做 + 敲木頭） |
| 5分鐘正常 | 5 分鐘 | 通常 2 款接力 |
| 10分鐘最久 | 10 分鐘 | 2–4 款，連最長的遊戲也塞得進來 |

## 使用者流程

1. **首頁／遊戲列表 → 「隨機時段」**（`/random`，也可從 `/create` 的模式卡進入）。
2. 選長度 + 預計人數 → 系統抽出一份清單（可按「重新抽一次」），每款都附上「建議設定」。
3. 開始派對 → 建立房間、切到清單第一款的大廳，房主仍可自由調整秒數／回合數。
4. 每款玩完，結算畫面顯示「下一款：X」，**20 秒後自動回到大廳**接續；房主可「先停一下」或「立刻前往」。
5. 清單玩完 → 顯示時段總結與「再抽一個時段」。沒有時段的房間，也可以在結算畫面或大廳直接抽一個。

## 抽選邏輯（`src/lib/playlist.ts`，純函式）

1. **時間估算**：`estimatedMinutes(gameId, settings)` 以遊戲 `estimatedDuration` 的**最快端**為錨點，再依設定要求的「份量」（回合數 × 每回合秒數）縮放。所以縮短過的遊戲不會被算得比它自己標示的最快時間還長。
2. **建議設定**：`suggestedSettings(gameId, budget)` 依序嘗試「快速節奏 → 1 回合 → 最短秒數」，取第一個塞得進預算的組合。這只是建議值，大廳的設定面板照樣能改。
3. **裝箱**：只從「單款就塞得進上限」的遊戲中挑；同一份清單**不重複**同一款；優先挑「還能再塞一款」的選擇，避免 10 分鐘的時段被一款長遊戲吃掉。
4. **盡量不重複**：以 `lib/playHistory.ts`（localStorage，6 小時內的紀錄）排出「新鮮度」——沒玩過的分數最高，其次是最久沒玩的；只在同一層級中隨機抽 3 款取一。全部都玩過時會重複，但會優先讓最久沒玩的回來，並在 UI 標示「重複」。
5. **人數**：只抽該人數坐得下的遊戲；若沒有任何遊戲符合（極端人數），會放寬人數限制而不是抽空清單。
6. **保底**：預算比所有遊戲都短時，仍會給最短路的一款，不會回傳空清單。

## 房間狀態

```ts
sessionPlan?: {
  mode: "flash" | "standard" | "marathon";
  budgetMinutes: number;
  entries: { gameId; minutes; settings; repeated? }[]; // entries[0] = 目前這款
  played: string[];                                    // 已玩過的（依序）
  startedAt: number;
  completedAt?: number;                                // 時段結束時寫入
}
```

- `src/lib/gameSession.ts`
  - `startRoomSession(room, plan)`：載入清單第一款與其建議設定（回到大廳，不直接開玩）。
  - `advanceRoomSession(room, now)`：把目前這款移入 `played`、升上下一款；清單見底時保留在 RESULTS 並寫入 `completedAt`（回傳 `null` 代表沒有進行中的時段）。
  - `leaveRoomSession(room, gameId)`：房主手動換成別的遊戲時，離開隨機時段（清單不再有意義）。
- `src/providers/RoomContext.tsx`
  - `createRoom(gameId, nickname, settings?, sessionPlan?)`
  - `startSession(plan)`（大廳／結算畫面抽新的一份）、`advanceSession()`（換場，回傳 `null` 表示時段結束）。
- `database.rules.json` **不需修改**：房間節點只驗證已知欄位，`sessionPlan` 就和其他房主寫入的欄位走同一條授權。

## 驗證

- `src/lib/playlist.test.ts`：三種模式 × 60 組種子的預算／不重複／人數／保底與「全部都玩過」行為；`startRoomSession` / `advanceRoomSession` / `parseRoom`（含 RTDB 會刪掉空陣列的往返）。
- `src/providers/RoomContext.test.tsx`：在假的 Firebase 上跑真的 provider —— 抽籤開房、換到下一款（含建議設定）、重新載入電視後仍讀得到時段、時段結束、手動換遊戲時清單被清除。
