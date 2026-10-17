"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRoom } from "@/providers/RoomContext";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import type { BattleGameState } from "@/engine/realBattle";
import { PlayShell } from "@/components/game/PlayShell";
import { vibrate } from "@/lib/sound";

/** How often we flush coalesced hold-steps to the room (cuts RTDB writes under hold). */
const FLUSH_MS = 180;

export default function PlayRealBattle() {
  const { room, player } = useRoom();
  const submit = useSubmitAction();
  const state = room?.gameState as BattleGameState | undefined;
  const repeatTimer = useRef<number | null>(null);
  const pending = useRef<{ dx: number; dy: number; steps: number } | null>(null);
  const flushing = useRef(false);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    const batch = pending.current;
    if (!batch || batch.steps <= 0) return;
    pending.current = null;
    flushing.current = true;
    vibrate(8);
    await submit(
      { type: "move", dx: batch.dx, dy: batch.dy, steps: Math.min(4, batch.steps) },
      { failMessage: "操作沒有送出，檢查連線", throttleMs: 5000 },
    );
    flushing.current = false;
  }, [submit]);

  const stopRepeating = useCallback(() => {
    if (repeatTimer.current !== null) {
      window.clearInterval(repeatTimer.current);
      repeatTimer.current = null;
    }
    void flush();
  }, [flush]);
  useEffect(() => stopRepeating, [stopRepeating]);
  useEffect(() => {
    if (state?.phase !== "battle") stopRepeating();
  }, [state?.phase, stopRepeating]);
  if (!state || !player) return null;

  const queueMove = (dx: number, dy: number) => {
    const cur = pending.current;
    if (cur && cur.dx === dx && cur.dy === dy) {
      cur.steps = Math.min(4, cur.steps + 1);
    } else {
      pending.current = { dx, dy, steps: 1 };
    }
  };

  /** Press-and-hold: coalesce steps, flush on an interval to cut RTDB writes. */
  const startRepeating = (dx: number, dy: number) => {
    if (state.phase !== "battle") return;
    stopRepeating();
    queueMove(dx, dy);
    void flush();
    repeatTimer.current = window.setInterval(() => {
      queueMove(dx, dy);
      void flush();
    }, FLUSH_MS);
  };

  const padButtons: Array<{ dx: number; dy: number; glyph: string; label: string }> = [
    { dx: 0, dy: -1, glyph: "▲", label: "向上移動" },
    { dx: -1, dy: 0, glyph: "◀", label: "向左移動" },
    { dx: 1, dy: 0, glyph: "▶", label: "向右移動" },
    { dx: 0, dy: 1, glyph: "▼", label: "向下移動" },
  ];

  const padButtonClass =
    "flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-cyan-400/40 bg-cyan-950/40 text-3xl " +
    "font-black text-cyan-200 shadow-lg shadow-cyan-500/20 transition-all active:scale-95 active:bg-cyan-500 active:text-black select-none cursor-pointer";

  const padHandlers = (dx: number, dy: number) => ({
    disabled: state.phase !== "battle",
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
      // Keyboard / accessibility activation (pointer path uses onPointerDown).
      if (e.detail === 0) {
        queueMove(dx, dy);
        void flush();
      }
    },
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      startRepeating(dx, dy);
    },
    onPointerUp: stopRepeating,
    onPointerLeave: stopRepeating,
    onPointerCancel: stopRepeating,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  return (
    <PlayShell>
      <div className="text-center">
        <header className="mb-4 mt-2">
          <span className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-rose-400/50 bg-rose-950/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-rose-300 shadow-sm shadow-rose-500/20">
            ⚔️ 實體手機手把 · 大亂鬥
          </span>
          <p className="mt-2 text-sm text-white/70">按住方向鍵操控角色，搶奪星星與金幣！撞開對手更快搶到！</p>
        </header>

        {/* touch-none: swiping across the pad shouldn't scroll the page */}
        <div className="flex touch-none flex-col items-center justify-center gap-3 py-6">
          <button
            type="button"
            aria-label={padButtons[0].label}
            className={padButtonClass}
            {...padHandlers(padButtons[0].dx, padButtons[0].dy)}
          >
            <span aria-hidden="true">{padButtons[0].glyph}</span>
          </button>
          <div className="flex gap-4">
            <button
              type="button"
              aria-label={padButtons[1].label}
              className={padButtonClass}
              {...padHandlers(padButtons[1].dx, padButtons[1].dy)}
            >
              <span aria-hidden="true">{padButtons[1].glyph}</span>
            </button>
            <div
              className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-rose-500/40 bg-rose-950/40 text-xs font-black tracking-widest text-rose-400 shadow-md shadow-rose-500/20"
              aria-hidden="true"
            >
              JOY
            </div>
            <button
              type="button"
              aria-label={padButtons[2].label}
              className={padButtonClass}
              {...padHandlers(padButtons[2].dx, padButtons[2].dy)}
            >
              <span aria-hidden="true">{padButtons[2].glyph}</span>
            </button>
          </div>
          <button
            type="button"
            aria-label={padButtons[3].label}
            className={padButtonClass}
            {...padHandlers(padButtons[3].dx, padButtons[3].dy)}
          >
            <span aria-hidden="true">{padButtons[3].glyph}</span>
          </button>
        </div>

        <p className="font-mono text-sm font-bold text-cyan-300">
          {state.phase === "battle" ? `⏳ 剩餘 ${state.timeLeft} 秒` : "等房主開戰…"}
        </p>
      </div>
    </PlayShell>
  );
}
