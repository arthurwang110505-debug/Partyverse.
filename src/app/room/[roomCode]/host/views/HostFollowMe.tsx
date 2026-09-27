"use client";

import { useEffect, useRef } from "react";
import { useRoom } from "@/providers/RoomContext";
import { engineRoom } from "@/engine/participants";
import { FOLLOW_ACTIONS, type FollowGameState } from "@/engine/followMe";
import { HostGameControls } from "@/components/game/HostGameControls";
import { HostShell } from "@/components/game/HostShell";
import { PlayerChip } from "@/components/game/PlayerChip";
import { RoundTimer } from "@/components/game/RoundTimer";
import { Confetti } from "@/components/game/Confetti";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

const COMMAND_STYLES = [
  "from-cyan-400 to-sky-500 shadow-[0_0_80px_rgba(34,211,238,0.55)]",
  "from-pink-500 to-rose-500 shadow-[0_0_80px_rgba(236,72,153,0.55)]",
  "from-amber-400 to-orange-500 shadow-[0_0_80px_rgba(251,191,36,0.55)]",
  "from-emerald-400 to-teal-500 shadow-[0_0_80px_rgba(52,211,153,0.55)]",
];

export default function HostFollowMe() {
  const { room } = useRoom();
  const state = room?.gameState as FollowGameState | undefined;
  const players = room ? engineRoom(room).players : {};

  // A distinct shout per command so the room feels the beat without watching.
  const lastIndex = useRef<string>("");
  useEffect(() => {
    if (state?.phase !== "command") {
      lastIndex.current = "";
      return;
    }
    const key = `${state.currentRound}-${state.command}`;
    if (lastIndex.current !== key) {
      sfx.playTick(FOLLOW_ACTIONS[state.command]?.tone ?? 500, 0.18);
    }
    lastIndex.current = key;
  }, [state?.phase, state?.currentRound, state?.command]);

  useEffect(() => {
    if (state?.phase === "reveal") {
      if (state.fastestId) sfx.playSuccess();
      else sfx.playBuzzer();
    }
  }, [state?.phase, state?.fastestId]);

  useEffect(() => {
    if (state?.phase === "result" && state.winnerId) sfx.playFanfare();
  }, [state?.phase, state?.winnerId]);

  if (!state) return null;
  const ids = Object.keys(players);
  const command = FOLLOW_ACTIONS[state.command] ?? FOLLOW_ACTIONS[0];
  const answeredCount = Object.keys(state.answers).length;
  const wrongCount = Object.entries(state.roundPoints).filter(([, pts]) => pts < 0).length;

  return (
    <HostShell>
      {state.phase === "result" && state.winnerId && <Confetti />}
      <div className="mx-auto max-w-4xl text-center">
        <header className="mb-6">
          <p className="mb-2 text-sm font-semibold tracking-wider text-indigo-300">
            跟著做 ⚡ · 第 {state.currentRound} / {state.totalRounds} 題
          </p>
          {state.phase === "command" && (
            <h1 className="text-3xl font-black text-white md:text-4xl">一起做出動作，再搶按手機！</h1>
          )}
          {state.phase === "reveal" && (
            <h1 className="text-3xl font-black text-emerald-300 md:text-4xl">
              {state.fastestId ? `⚡ ${players[state.fastestId]?.nickname} 最快！` : "這題沒有人答對…"}
            </h1>
          )}
          {state.phase === "result" && state.winnerId && (
            <h1 className="text-4xl font-black text-yellow-300 md:text-6xl">
              👑 {players[state.winnerId]?.nickname} 是手感之王！
            </h1>
          )}
        </header>

        {state.phase !== "result" && (
          <div
            key={`${state.phase}-${state.currentRound}`}
            className={cn(
              "mx-auto mb-8 flex aspect-[2/1] w-full max-w-lg items-center justify-center gap-6 rounded-[2.5rem] bg-gradient-to-br text-white transition-transform",
              COMMAND_STYLES[state.command],
              state.phase === "command" ? "scale-100 animate-pulse" : "scale-95 opacity-70",
            )}
            aria-label={`指令：${command.label}`}
          >
            <span className="text-8xl md:text-9xl" aria-hidden="true">
              {command.emoji}
            </span>
            <span className="text-5xl font-black tracking-wider md:text-7xl">{command.label}</span>
          </div>
        )}

        {state.phase === "reveal" && (
          <p className="mb-6 text-lg font-bold text-white/80">
            答對 {answeredCount - wrongCount} 人 · 按錯 {wrongCount} 人
          </p>
        )}

        {state.phase === "command" && (
          <>
            <p className="mb-6 text-lg font-bold text-white/80">
              已按：{answeredCount} / {ids.filter((id) => players[id]?.isConnected !== false).length} 人
            </p>
            <div className="mx-auto mb-6 max-w-xs">
              <RoundTimer timeLeft={state.timeLeft} total={state.commandDuration} endLabel="這題結束" compact />
            </div>
          </>
        )}

        {state.phase === "result" && (
          <p className="mb-8 text-xl font-bold text-white/70">排名看這裡，手速與節奏的較量！</p>
        )}

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ids.map((id) => {
            const streak = state.streaks[id] ?? 0;
            const pts = state.roundPoints[id];
            return (
              <PlayerChip
                key={id}
                avatar={players[id].avatar}
                nickname={players[id].nickname}
                score={state.currentScores[id] ?? 0}
                out={!players[id].isConnected}
                status={
                  !players[id].isConnected
                    ? "離線"
                    : state.phase === "reveal"
                      ? pts === undefined
                        ? "沒按到…"
                        : pts < 0
                          ? `❌ ${pts}`
                          : `✅ +${pts}`
                      : streak >= 2
                        ? `🔥 x${streak}`
                        : state.phase === "command" && state.answers[id] !== undefined
                          ? "已按"
                          : "準備中"
                }
              />
            );
          })}
        </ul>
        <HostGameControls />
      </div>
    </HostShell>
  );
}
