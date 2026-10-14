# Firebase Realtime Database rules

Source of truth for deployable rules: [`database.rules.json`](../database.rules.json).

> **These rules are an interim living-room baseline, not full anti-cheat.**  
> Game authority is still client-side: any authenticated room member can write `gameState`, so secrets (impostor ids, undercover words) are visible to every client. That is fine for friends on a couch; it is **not** fine for ranked/stranger play. See Phase A1 in `docs/improvement-plan-2026-09.md`.

## What these rules do

| Concern | Behavior |
|---|---|
| Unauthenticated access | Denied |
| Create room | Auth user may create a room root that does not yet exist |
| Read room | Members can read; non-members can probe existence for join |
| Join | Authenticated user may add **their own** `players/{uid}` node (nickname ≤ 16) |
| Host-only | `settings`, host migration, kick via host uid check |
| `sessionPlan` | Host-written room field (random party session). The room-level `.validate` lists required children only, so extra host-written fields such as `sessionPlan` need no rule change. |
| gameState | Any **member** may write (needed today because phones submit actions via whole-room transactions). **Secret fields are stripped** into `privateHost` / `private/{uid}` by the client session layer. |
| privateHost | **Host only** read/write — roles, words, passcodes for the engine clock |
| private/{uid} | That player (and host) may read; **host only** writes |
| Reactions | Members only |

## Deploy

```bash
# With Firebase CLI logged into the project that matches NEXT_PUBLIC_FIREBASE_*
firebase deploy --only database
```

Or paste `database.rules.json` into Firebase Console → Realtime Database → Rules.

## Join compatibility note

The app’s `joinRoomOnFirebase` uses `runTransaction` on the **room root** (see `src/lib/firebaseJoin.ts`). Rules must allow that transaction for a new member:

1. Authenticated
2. Room exists
3. Writer only introduces/updates `players/{auth.uid}` (and does not clobber foreign fields)

If production still rejects joins with **安全規則 / PERMISSION_DENIED**:

- Confirm the deployed rules match this file (not the outdated README snippet).
- Confirm both devices use the same `NEXT_PUBLIC_FIREBASE_DATABASE_URL` (region included) and the same deployed web build.
- Do **not** open the database to public read/write to “fix” join.

## Next hardening (not in this file yet)

1. Move admission to a callable Cloud Function; clients lose room-root write.
2. Split `private/{uid}` for roles/words; only that uid can `.read`.
3. Players write only to `actions/{uid}/{pushId}`; host (or Cloud tick) applies them into `gameState`.
4. TTL sweeper Function deletes rooms past `expiresAt`.

Until (2)–(3) land, treat online stranger lobbies as trust-the-table.
