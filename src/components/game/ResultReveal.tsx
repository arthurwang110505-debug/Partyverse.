"use client";

import type { Room } from "@/types";

interface UndercoverReveal {
  civilianWord?: string;
  undercoverWord?: string;
  undercoverPlayerId?: string;
  winnerTeam?: string | null;
}
interface MysteryReveal {
  correctCode?: string;
  isUnlocked?: boolean;
}

/**
 * The "and the answer was…" moment for games whose secret only becomes
 * public when the match ends (who the spy was, the escape-room code).
 *
 * It used to exist only on the TV's result phase, which the room skips as soon
 * as the match is scored, so nobody ever saw it. Rendered on the shared results
 * screen, every phone gets it.
 */
export function ResultReveal({ room }: { room: Room }) {
  if (room.gameId === "whoisundercoveragent") {
    const s = room.gameState as UndercoverReveal;
    if (!s.civilianWord || !s.undercoverWord) return null;
    const spy = s.undercoverPlayerId ? room.players[s.undercoverPlayerId] : undefined;
    return (
      <section
        aria-label="答案揭曉"
        className="mb-6 rounded-2xl border border-purple-400/30 bg-purple-950/40 p-4 text-center"
      >
        <p className="mb-1 text-xs font-bold tracking-widest text-purple-200">🕵️ 答案揭曉</p>
        {s.winnerTeam && (
          <p className="mb-3 text-sm font-semibold text-yellow-200">
            {s.winnerTeam === "undercover" ? "臥底瞞天過海，大獲全勝！" : "平民成功揪出臥底！"}
          </p>
        )}
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-3 rounded-xl bg-white/5 px-3 py-2">
            <dt className="text-white/60">平民詞</dt>
            <dd className="font-bold text-white">{s.civilianWord}</dd>
          </div>
          <div className="flex justify-between gap-3 rounded-xl bg-white/5 px-3 py-2">
            <dt className="text-white/60">臥底詞</dt>
            <dd className="font-bold text-pink-300">{s.undercoverWord}</dd>
          </div>
          <div className="flex justify-between gap-3 rounded-xl bg-white/5 px-3 py-2">
            <dt className="text-white/60">臥底是</dt>
            <dd className="font-bold text-white">
              {spy ? `${spy.avatar} ${spy.nickname}` : "未知"}
            </dd>
          </div>
        </dl>
      </section>
    );
  }

  if (room.gameId === "mysteryroom") {
    const s = room.gameState as MysteryReveal;
    if (!s.correctCode) return null;
    return (
      <section
        aria-label="答案揭曉"
        className="mb-6 rounded-2xl border border-indigo-400/30 bg-indigo-950/40 p-4 text-center"
      >
        <p className="mb-1 text-xs font-bold tracking-widest text-indigo-200">
          {s.isUnlocked ? "🔓 密碼" : "🔒 正確密碼是"}
        </p>
        <p className="font-mono text-3xl font-black tracking-[0.3em] text-indigo-200">{s.correctCode}</p>
      </section>
    );
  }

  return null;
}
