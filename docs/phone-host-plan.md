# Phone-hosted parties (no big screen needed)

Goal: a host with only a regular phone can create a room, run the whole party and
(optionally) play in it. Every friend joins with their own phone. A TV / projector
stays supported but is no longer assumed.

## What the audit found

The app was built as "TV = stage, phone = controller":

| Area | TV-only assumption |
|---|---|
| Room creation | host seat is always `role: "display"` and does not count as a player |
| Lobby (phones) | "請看電視大螢幕", roster only on the TV |
| In-game | 16 phone views, ~30 strings say "看大螢幕"; reveal/result phases of most games exist **only** on the TV view (AI 瞎扯王, 人人都知道, 臥底, …) |
| Draw & Guess | guessers' phones show **no canvas** (they must look at the TV) |
| Real Battle | arena/map only on the TV, phones only have a joystick |
| Musical Chairs / Follow Me | the audio cue is only produced by the TV view |
| Host duties | tick loop runs on the host device, nothing keeps a phone awake, a host phone that locks stalls the game until somebody manually clicks "take over" |
| Secrets | `useGameViewState` hands *all* secrets to anyone who is host, so a host who also plays would see everyone's word/role |

## Design

1. **Host modes** chosen at creation (default = phone):
   * 📱 *Host & play* – host seat is a normal player plus host powers.
   * 📱 *Host only* – referee seat (`role: "display"`) on a phone; sees the stage view.
   * 📺 *Big screen* – the previous behaviour, unchanged.
   Stored on the room as `screenMode: "phones" | "tv"` (legacy rooms without it are
   treated as `tv` when a display seat exists).
2. **Stage on every phone.** All TV views are public by design, so phones can embed
   them: `StageMirror` renders the host view inside the phone shell
   (`StageContext` strips the TV chrome/controls). `StageDock` decides when it shows:
   automatically in reveal/result phases and for games that need a shared picture
   (arena, canvas, beat), plus a manual "📺 舞台" toggle at any time.
3. **Self-contained phone screens**: Draw & Guess guessers get the live canvas inline;
   all "look at the TV" copy becomes mode-aware.
4. **Host that is a player**: `useGameViewState` only grants secrets to the display
   seat; players (including a playing host) get their own private slice.
5. **Host controls on a phone**: floating host menu (invite/share, players + kick,
   restart, end & score, close room, host-plays toggle), Web Share invite in the lobby.
6. **Reliability of a phone host**: screen wake lock for everyone in a phone room;
   automatic, ranked host hand-off when the host drops (lobby, game and results),
   replacing the manual-only "take over" button.
7. **Polish**: mode-aware landing/create/join copy, PWA manifest so it can be added to
   the home screen.

## Verification

* Unit tests: stage policy, successor election, host-mode room creation, secrets view,
  room parsing.
* `npm run typecheck && npm run lint && npm test && npm run build`.
* Headless-browser run with several phone-sized contexts in local-demo mode: host
  creates a room as "host & play", friends join, a game is played, stage/reveal shows
  on a non-host phone, host drops and another phone takes over.

## Known limits

* Cross-phone play still needs the Firebase env vars (`.env.local`); without them the
  app only shares rooms between tabs of one browser (existing behaviour).
* iOS Safari < 16.4 has no wake-lock API: the host is told to keep the screen on.
* A host who also plays can technically read other players' secrets from the
  database (Firebase rules cannot hide data from the host who runs the clock). The UI
  never shows them.
