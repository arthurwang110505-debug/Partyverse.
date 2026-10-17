"use client";

import { useRef } from "react";
import { Gamepad2, Monitor, Smartphone } from "lucide-react";
import type { HostMode } from "@/types";
import { cn } from "@/lib/utils";

export const HOST_MODES: Array<{
  id: HostMode;
  icon: typeof Smartphone;
  title: string;
  detail: string;
}> = [
  { id: "play", icon: Gamepad2, title: "手機主持・我也玩", detail: "只要這支手機。你主持，也一起下場得分。" },
  { id: "referee", icon: Smartphone, title: "手機主持・只當主持人", detail: "只要這支手機。你不計分，專心控場。" },
  { id: "tv", icon: Monitor, title: "有大螢幕／電視", detail: "這台裝置當主畫面，不占玩家名額。" },
];

/**
 * How will this room be hosted? Defaults to the phone, because that is the only
 * thing everybody is guaranteed to have in their pocket.
 */
export function HostModePicker({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: HostMode;
  onChange: (mode: HostMode) => void;
  disabled?: boolean;
  className?: string;
}) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLButtonElement>) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + HOST_MODES.length) % HOST_MODES.length;
    onChange(HOST_MODES[next].id);
    buttons.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label="主持方式" className={cn("grid grid-cols-1 gap-2", className)}>
      {HOST_MODES.map((mode, index) => {
        const selected = mode.id === value;
        const Icon = mode.icon;
        return (
          <button
            key={mode.id}
            ref={(el) => {
              buttons.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(mode.id)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            className={cn(
              "flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all active:scale-[0.99] disabled:opacity-50",
              selected
                ? "border-violet-400/60 bg-violet-500/15 ring-2 ring-violet-400/30"
                : "border-white/10 bg-white/5 hover:bg-white/10",
            )}
          >
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                selected ? "bg-violet-500/30 text-violet-100" : "bg-white/10 text-white/60",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-white">{mode.title}</span>
              <span className="block text-xs leading-relaxed text-white/55">{mode.detail}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The one-line explanation shown under the picker for the chosen mode. */
export function hostModeNote(mode: HostMode): string {
  switch (mode) {
    case "play":
      return "朋友用自己的手機掃碼加入。遊戲畫面會直接顯示在每個人的手機上，不需要電視或投影。";
    case "referee":
      return "你不下場、不計分。朋友用自己的手機加入，遊戲畫面會直接顯示在每個人的手機上。";
    case "tv":
      return "此裝置作為電視主畫面，不占玩家名額。房主想參賽，也請用手機掃碼加入。";
  }
}
