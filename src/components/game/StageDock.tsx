"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, Tv } from "lucide-react";
import { useRoom } from "@/providers/RoomContext";
import { stageAvailable, stageOpensAutomatically } from "@/lib/stagePolicy";
import { usesBigScreen } from "@/lib/stage";
import { cn } from "@/lib/utils";

// Lazy: it pulls in every TV view, and a cycle (shell → stage → TV views → shell)
// is easier to reason about when the edge is a dynamic import.
const StageMirror = dynamic(() => import("./StageMirror"), {
  ssr: false,
  loading: () => <div className="h-24 animate-pulse rounded-2xl bg-white/5" aria-hidden="true" />,
});

/**
 * "Stage" panel for rooms without a big screen.
 *
 * Sits at the top of every phone's game screen. It opens by itself while the
 * group is meant to watch something together (reveals, the arena, the beat) and
 * can be opened or folded by hand the rest of the time.
 */
export function StageDock() {
  const { room, player } = useRoom();
  const state = room?.gameState as { phase?: string; currentRound?: number } | undefined;
  const phase = state?.phase;
  const key = `${room?.startedAt}-${phase}-${state?.currentRound}`;
  const [override, setOverride] = useState<{ key: string; open: boolean } | null>(null);

  if (!room || !player || usesBigScreen(room) || player.role === "display") return null;
  const info = { gameId: room.gameId, phase };
  if (!stageAvailable(info)) return null;

  const auto = stageOpensAutomatically(info);
  const open = override && override.key === key ? override.open : auto;

  return (
    <section aria-label="主畫面" className="mb-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOverride({ key, open: !open })}
        className={cn(
          "glass flex w-full items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-semibold transition-colors",
          open ? "border-cyan-400/40 text-cyan-200" : "border-white/10 text-white/70",
        )}
      >
        <span className="flex items-center gap-2">
          <Tv className="h-4 w-4" aria-hidden="true" />
          主畫面
          {!open && <span className="text-xs font-normal text-white/40">點開看大家的畫面</span>}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div
          data-testid="stage-mirror"
          className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-3"
        >
          <StageMirror />
        </div>
      )}
    </section>
  );
}
