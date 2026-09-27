# PartyVerse — Improvement Plan (2026-09-26)

**Status of prior plans:** The 2026-09-19 engineering and UI/UX plans (`improvement-plan.md`, `ui-ux-improvement-plan.md`) are **historical**. Most of their P0/P1 items have shipped. This document is the current roadmap, audited against branch `arena/01a0dae9-partyverse`.

**Product in one line:** TV-as-display + phones-as-controllers party platform. Scan QR → play. No download, no account.

---

## 0. Current state — measured today

| Check | Result |
|---|---|
| Games defined | **16** in `src/constants/games.ts` |
| Playable engines | **16/16** (`playableGameIds()`) |
| Unit tests | **197 passed** (`npm test`, 17 files) |
| Full-match playthroughs | **All 16 games** reach `RESULTS` (incl. 3 Among Us win paths) |
| Typecheck | **Clean** (`tsc --noEmit`) |
| Shared chrome | `PlayShell` / `HostShell` on **all 16** host + play views |
| Mute, confetti, rules tour, recent rooms, invite-link copy | **Shipped** |
| CI (`.github/`) | **Missing** |
| Silent `catch {}` in room views | **23** (failed taps still look like success) |
| Firebase security rules in repo | **None** (README example is outdated / unsafe for current join) |
| Game authority | **Client-side** — secrets (roles, words) live in the shared room payload |
| npm audit | **20** findings (12 moderate, 6 high, 2 critical) |
| Playwright e2e | Specs exist; browser install is fragile in constrained envs |

**What this means:** the *game loop works*. The remaining work is production-hardening, polish that multiplies fun, content depth, and growth infrastructure — not “make it start.”

---

## Guiding principles

1. **Phone + TV first.** 100% of playtime is in-room. Marketing pages matter for SEO/conversion; the room is the product.
2. **One improvement, sixteen games.** Prefer shell / session / feedback changes over per-game one-offs.
3. **Honest multiplayer.** Client-authoritative engines are fine for casual living-room play; they are *not* fine once strangers share rooms online.
4. **Ship slices that are playable end-to-end**, with tests that prove a full match still finishes.

---

## Phase A — Production readiness (do first) · ~1–1.5 weeks

Without this, every other improvement is demo-only.

### A1. Firebase security rules + trusted join  · 2–3 d

**Problem (verified in `docs/firebase-join-fix.md`):** the current join path writes the whole room via `runTransaction`. The README’s legacy rules grant room-root writes only to *existing* members, so a fresh phone can be rejected even when the room exists. Child-only `players/$playerId` grants do not authorize the ancestor transaction.

**Do:**

1. Check real rules into the repo (`database.rules.json` + deploy docs). Never “open write to fix join.”
2. Design join authorization deliberately:
   - **Preferred:** Cloud Function / callable that validates capacity, nickname, and writes the player node under admin privileges; clients only write their own action channel.
   - **Interim:** rules that allow a *constrained* create-player transaction (new uid, nickname length, no overwrite of foreign fields, room not full, status `LOBBY`).
3. Split room data:
   - **Public:** roster, scores, phase, timers, non-secret prompts.
   - **Private per player:** roles, secret words, impostor id, hand cards — under `private/{uid}/…` readable only by that uid (and host display if needed via Function).
4. Restrict `gameState` mutations: only the current host (or a Cloud tick) may advance phase/time; players may only append to an `actions/{uid}` queue the host consumes.

**Exit:** a physical second phone joins a production room; rules reject a stranger rewriting another player’s score or reading impostor ids.

### A2. Host clock reliability + reconnect  · 1–2 d

Today the host browser is the clock (`advanceRoomGame`). If the TV sleeps or the tab backgrounds, timers freeze.

- Publish `lastTickAt`; if stale > N seconds, any connected controller with host rights (or the recovery flow already present) can claim tick duty.
- Keep `onDisconnect` + host-recovery (already started) covered by e2e on Firebase emulator, not only local demo tabs.
- Cap room TTL (Cloud Function sweeper on `createdAt` / `lastTickAt`) so abandoned rooms don’t grow forever.

**Exit:** kill the TV tab mid-round → within ~10s a phone can recover host and the match continues; rooms older than 24h idle are gone.

### A3. Kill silent failures  · 0.5–1 d

**23** empty `catch {}` blocks remain across play views. A failed Firebase write looks identical to success → double-taps, “game froze” reports.

- Route every `submitAction` through one helper that surfaces `GameplayFeedback` / toast:「送出失敗，請再試一次」.
- Ban empty catches in lint (`no-empty` or a custom rule on `src/app/room/**`).
- Add a tiny offline/reconnect banner on `PlayShell` when `navigator.onLine` flips or RTDB connection state drops.

**Exit:** yank network mid-vote → every phone shows a retryable error; zero empty catches under `src/app/room`.

### A4. CI + quality gates  · 0.5 d

No `.github/` today. Add:

```
lint → typecheck → vitest → build
```

on every PR. Optionally a scheduled Playwright job against Firebase emulator + local demo mode.

Pin Node, cache npm, fail on type errors (already clean).

**Exit:** a broken engine playthrough fails the PR before merge.

### A5. Dependency & Next hygiene  · 0.5–1 d

- Triage the **20** `npm audit` findings; upgrade Next 14.2.x patch line and transitive highs where non-breaking.
- Confirm self-hosted fonts still avoid build-time Google Fonts fetches (already moved once — keep it that way in CI).
- Document “local demo = same browser profile only; real phones need Firebase” in the lobby UI itself (not only README).

---

## Phase B — In-room delight & consistency · ~1 week

Shells exist; the *moments* still vary in quality between games.

### B1. Feedback density (the Jackbox loop)  · 2 d

| Moment | Today | Target |
|---|---|---|
| Player joins lobby | Often quiet | Join chime + seat slide-in on TV |
| Action accepted | Mixed | Soft tick + brief “已送出 ✓” on every controller |
| Timer critical (≤5s) | Some games | Shared `RoundTimer` pulse + optional haptic |
| Reveal / elimination | Confetti on some hosts | Confetti + stinger SFX on all result phases |
| Score change | Static pill | `+N` floater on phone dock (respect `prefers-reduced-motion`) |

Centralize in `HostShell` / `PlayShell` + `lib/sound.ts` so games opt in with phase flags, not copy-paste.

### B2. Results screen as a shareable moment  · 1 d

- Score count-up on podium; confetti already exists — make it default for all games’ final `RESULTS`.
- **Round recap strip:** biggest single-round gain, clutch reverse, first blood — data is mostly in `currentScores` / per-round maps; expose a small `getRecap(state)` per engine or a generic diff.
- Non-host copy:「等待房主決定下一局…」with live pulse until rematch/switch (hosts already get 再玩一次).
- One-tap **「複製戰報」** (text summary for LINE/IG).

### B3. Lobby conversion (TV at 2–3 m)  · 1 d

Already has invite-link copy and recent rooms. Raise the floor:

- Default QR ≥ 240px (scale with viewport); always show human URL `…/join/ABCDE` next to it.
- Start readiness: visual `●●○○ 2/4` on the primary CTA, not only helper text.
- Empty lobby journey: “掃碼 → 進房 → 準備 → 開始” three-step hint under QR.
- Settings presets: **快速 / 標準 / 輕鬆** mapping to rounds + timer (called out as remaining in `gameplay-foundation.md`).

### B4. Mobile controller ergonomics pass  · 1 d

Partially done (`100dvh`, safe-area dock, mute). Finish:

- `overscroll-behavior: contain` on player shell (no pull-to-refresh mid-round).
- Confirm back-swipe / Android back asks before `leaveRoom()`.
- Real Battle: press-and-hold repeat + clearer `aria-label`s (D-pad still the weakest controller).
- Large tap targets audit (min 44×44) on vote grids and Simon pads.

### B5. Accessibility sweep  · 1 d

Baseline is much better (242 `aria-*` hits) but game views still need:

- Decorative emoji `aria-hidden`; icon-only controls named.
- Timer: don’t `aria-live` every second — announce at 10s / 5s / phase change only.
- Contrast floor: body copy ≥ `white/50` on `#050508`.
- One VoiceOver + keyboard pass of lobby → rules → play → results.

**Exit (Phase B):** two strangers can join from the TV QR without coaching; every game shares join/reveal/score feedback; results feel worth screenshotting.

---

## Phase C — Game depth & fairness · ~1.5–2 weeks

All 16 *finish*; not all *feel deep* or *fair* under real latency.

### C1. Content correctness & decks  · 2–3 d

| Game | Risk | Work |
|---|---|---|
| 三秒猜歌 | Wrong metadata / unguessable lines | Audit song bank; tag difficulty; drop duds |
| 密室推理 | Clues must uniquely solve | Solver test: only one passcode fits distributed clues |
| 腦筋急轉彎 / AI 瞎扯 | Stale or culturally narrow prompts | Expand ZH-TW deck; mark ageMode filters |
| 文字接龍 | Dictionary / objection quality | Seed list + clearer objection UX |
| 煙火 / 你畫我猜 | Word packs thin after N rounds | Category packs + “avoid recent” |

Add a `content/*.ts` lint or unit test that every prompt has required fields and unique ids.

### C2. Flagship depth (pick 2–3, don’t boil the ocean)  · 3–5 d

Suggested order by party impact:

1. **臥底是誰** — better word-pair difficulty tiers, spectator ghost view, cleaner accusation UX.
2. **你畫我猜** — stroke compression, lag indicators, word difficulty, drawer tips.
3. **太空內鬼** — task variety, emergency meeting clarity, better ghost UX (already the largest play view).
4. **炸彈倒數** — category packs, sudden-death finale presentation.

Each flagship gets: content expansion, one unique delight animation, and 3+ targeted tests beyond the generic playthrough.

### C3. Real Battle transport  · 2 d

Movement is applied in the engine from player actions (step ~6%). High-frequency taps + RTDB full-state writes will hurt at 8+ players.

- Debounce / coalesce moves client-side; host ticks apply a short input buffer.
- Consider writing only `{dx,dy,t}` to `actions/` instead of full positions every tap.
- Load-test script: 10 simulated players, 10 Hz moves, assert RTDB payload size and tick duration.

### C4. Practice / how-to-play without a full party  · 1 d

- “練習模式” : solo or 1 phone + TV bots for Simon / Whack / Bomb / Brain Teaser.
- Shortens the “first time we need 4 friends” barrier.

### C5. Party playlist & next-game vote  · 1–2 d

- Host queues 3 games; auto-advance lobby → next after results.
- Or players vote next game on results screen (reuses Everybody Knows voting UX).

**Exit (Phase C):** song/mystery content has automated sanity checks; 2 flagships feel distinctly better; Real Battle holds 8 players without visible desync; a solo visitor can practice one reaction game.

---

## Phase D — Growth, SEO, analytics · ~1 week

### D1. Marketing truth & SEO  · 1 d

- README / hero still echo older “Ten Games” framing in places — align copy to **16** and the real tagline.
- Per-game landing pages already exist; ensure `generateMetadata` + OG image per game show playable status and player counts.
- Add a short “how a party night works” diagram above the fold (TV / QR / phones).
- Internal links: Navbar “開始遊戲” → `/games` with playable filter deep-link.

### D2. Funnel analytics  · 1 d

Privacy-light events (no PII):

`landing_view → create_open → room_created → player_join → rules_ready → game_start → game_finish → rematch`

Track `gameId`, player count, mode (`local`|`firebase`), duration. Product decisions need this more than more games.

### D3. Error observability  · 0.5–1 d

- Sentry (or equivalent) on room flows: join failures, tick recovery, rule denials.
- Correlate with `roomCode` hash, not raw nicknames.

### D4. Share & discoverability  · 1 d

- Dynamic OG for `/join/[code]` (“你被邀請進 PartyVerse 房間 ABCDE”).
- QR poster mode (fullscreen black + huge code) for living-room ambient.
- Optional English UI toggle later; today commit to `zh-Hant` honestly (`lang`, copy, content).

---

## Phase E — Platform / stretch (only after A–C) · ongoing

| Idea | Why wait |
|---|---|
| Accounts & friend rooms | Anon auth is a feature for parties; accounts add recovery but also friction |
| Persistent season rankings | Needs anti-cheat (Phase A1) first or the board is meaningless |
| Native wrapper (PWA / TWA) | “Add to home screen” PWA is enough until store distribution matters |
| User-generated packs | Moderation + injection risk |
| More games beyond 16 | Diminishing returns vs. deepening the best 5 |
| Full i18n | Finish ZH-TW content quality first |

---

## Sequenced roadmap (summary)

| Phase | Focus | Effort | Exit criterion |
|---|---|---|---|
| **A1–A2** | Secure join + private secrets + host clock / TTL | ~3–5 d | Real phone joins under strict rules; host tab death recovers |
| **A3–A5** | No silent catches, CI, audit triage | ~1.5 d | PR gate green; failed submits visible |
| **B** | Delight, results, lobby, mobile, a11y | ~5–6 d | Coach-free join; shared feedback language |
| **C** | Content QA, 2–3 flagships, Real Battle load, practice, playlist | ~8–12 d | Deeper nights, fairer online play |
| **D** | SEO truth, funnel analytics, Sentry, share OG | ~3–4 d | Know where nights drop off |
| **E** | Accounts, rankings, PWA, more games | later | Only with A’s trust model |

**Do first:** **A1 (rules + private player data)** and **A3 (no silent catches)**.  
Everything fun in B/C is hollow if joins fail in production or taps silently no-op.  
Everything competitive in E is hollow while scores and roles are client-writable.

---

## Explicit non-goals (this quarter)

- Rewriting the engine architecture for its own sake — the `GameEngine` + `gameSession` playthrough harness is a strength (197 tests).
- Replacing Framer Motion / Tailwind.
- Pixel-perfect redesign of the marketing site before in-room production hardening.
- Re-litigating games that already full-match pass unless content is wrong.

---

## How we’ll know it’s better

1. **Night test:** 6 real phones + 1 TV, Firebase production rules, complete 3 different games without a refresh ritual.
2. **CI:** main stays green (`lint`/`typecheck`/`test`/`build`).
3. **Funnel:** >50% of created rooms reach `game_start`; >70% of started games reach `RESULTS`.
4. **Support:** “送出沒反應” and “手機進不了房” stop being the top two reports.

---

## Appendix — already shipped (do not re-plan)

From prior plans / foundation docs, verified present in tree:

- 16 engines + playthrough tests  
- `PlayShell` / `HostShell` / `RoundTimer` / `PlayerChip` / `MuteToggle` / `Confetti` / `RulesTour` / `GameplayFeedback`  
- Readiness-based briefings for all games  
- Recent rooms + 複製邀請連結  
- Self-hosted fonts, OG/sitemap/robots, custom error/404  
- Join transaction fix (code-side)  
- Host recovery notice, connection badge, floating reactions  

### Shipped 2026-09-26 (session 1 — Phase A slice)

- `useSubmitAction` — single action path with toast + throttle (high-frequency games)  
- Remaining silent catches fixed: Musical Chairs, Simon Says, Whack-a-Mole, King Tonight tap-mash, Real Battle  
- `LeaveGuard` on `PlayShell` (back / refresh confirm mid-match)  
- Connection badge on phone chrome; `.player-shell` overscroll contain  
- GitHub Actions CI: lint → typecheck → test → build  
- `database.rules.json` + `docs/firebase-rules.md` (interim living-room baseline)  
- Marketing copy aligned to **16 games**

### Shipped 2026-09-26 (session 2 — Phase B + C)

**Phase B — delight**
- Score `+N` floater on phone dock (`ScoreDelta`) + pop SFX  
- Host result phase uses fanfare; timer critical pulse + optional phone haptic  
- Lobby: larger QR (280px), clearer join URL, empty-state ①②③ journey, dual ●●○○ meters (count + ready)  
- Settings: **快速 / 標準 / 輕鬆** pace presets  
- Results: always confetti, **本場花絮** recap strip, **複製戰報**, next-game straw poll + host “聽從投票”

**Phase C — depth**
- Content expansion: songs 34→54, riddles 32→45, draw prompts 18→36, undercover pairs + difficulty tiers, Among Us tasks 4→8  
- `contentBanks.test.ts` — unique ids, option integrity, mystery codes don’t leak  
- Real Battle: coalesce hold-steps (`steps` 1–4) to cut RTDB writes  
- Undercover: `pickWordPair(difficulty)` + settings difficulty enabled  

### Shipped 2026-09-27 (session 3 — A1 secrets + flagship UX)

**No.1 Server-authority foundation (client-side secret split)**
- `privateState.ts`: split / hydrate / view helpers for undercover, among us, draw, mystery  
- `gameSession` publishes `gameState` without secrets; stores `privateHost` + `private/{uid}`  
- RESULTS still reveals words / impostor for the podium  
- `useGameViewState` so phones only see their slice; host/TV hydrates full state  
- Firebase rules for `privateHost` (host-only) and `private/$playerId` (self + host)  
- 5 unit tests for the split/view contract  

> Still not full anti-cheat: members can write `gameState` via whole-room transactions. Next step is an action queue + Cloud Function admission.

**No.2 Flagship UX**
- **Undercover**: two-tap accusation confirm, live vote tallies after you vote, discussion roster + timer, hold-to-peek word  
- **Draw & Guess**: stroke point decimation + longer stream interval, drawer tip chips, secret prompt only on drawer private  
- **Among Us**: 4 new mini-tasks (scan / sample / card / asteroids), role peek uses private impostor flag  
- **Mystery**: clue via private; passcode never on phone wire; hint digits published as unlocks  

### Still open

**Phase A remainder**
- Callable join / action queue (true server authority)  
- TTL sweeper Cloud Function  
- npm audit triage  
- Physical two-device validation against deployed rules  

**Phase B/C remainder**
- Full VoiceOver pass; practice/solo mode  
- Party playlist auto-queue (votes are a straw poll only)  
- Real Battle load-test script at 10 players  

Older docs remain useful as archaeology; **this file is the working plan.**
