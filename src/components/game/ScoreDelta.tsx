"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

interface Floater {
  id: number;
  delta: number;
}

/**
 * Watches a live score and pops a short `+N` / `−N` floater when it changes.
 * Used on the phone dock so every game shares the same "I scored!" moment.
 */
export function ScoreDelta({ score }: { score: number }) {
  const reduce = useReducedMotion();
  const prev = useRef(score);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const delta = score - prev.current;
    prev.current = score;
    if (delta === 0) return;
    if (delta > 0) sfx.playPop();
    if (reduce) return;
    const id = ++nextId.current;
    setFloaters((list) => [...list.slice(-2), { id, delta }]);
    const t = window.setTimeout(() => {
      setFloaters((list) => list.filter((f) => f.id !== id));
    }, 1400);
    return () => window.clearTimeout(t);
  }, [score, reduce]);

  if (floaters.length === 0) return null;

  return (
    <div className="pointer-events-none absolute -top-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1" aria-hidden="true">
      {floaters.map((f) => (
        <span
          key={f.id}
          className={cn(
            "animate-score-float text-lg font-black tabular-nums drop-shadow-lg",
            f.delta > 0 ? "text-emerald-300" : "text-red-300",
          )}
        >
          {f.delta > 0 ? `+${f.delta}` : f.delta}
        </span>
      ))}
    </div>
  );
}
