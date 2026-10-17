import type { PlayModeId } from "@/types";

/**
 * A time-boxed way to start a party.
 *
 * The host picks how long the group has ("3分鐘快閃" / "5分鐘正常" / "10分鐘最久"),
 * and `lib/playlist.ts` randomly draws a list of games whose (shortened)
 * durations add up to that budget. The budget is wall-clock for the whole
 * session, so it decides both *which* games are eligible and *how* they are
 * configured.
 */
export interface PlayMode {
  id: PlayModeId;
  /** Product label, exactly as it is offered in the UI. */
  label: string;
  /** One-word name for chips and badges. */
  short: string;
  icon: string;
  /** Total wall-clock budget the drawn playlist must fit inside, in minutes. */
  budgetMinutes: number;
  tagline: string;
  hint: string;
  color: string;
  gradient: string;
}

export const PLAY_MODES: readonly PlayMode[] = [
  {
    id: "flash",
    label: "3分鐘快閃",
    short: "快閃",
    icon: "⚡",
    budgetMinutes: 3,
    tagline: "等外送、廣告時間、開場熱身",
    hint: "只抽最短的 1–2 款，三分鐘內一定收得掉。",
    color: "#22d3ee",
    gradient: "linear-gradient(135deg, #22d3ee, #6366f1)",
  },
  {
    id: "standard",
    label: "5分鐘正常",
    short: "正常",
    icon: "🎯",
    budgetMinutes: 5,
    tagline: "一般聚會的分量，玩兩款換換口味",
    hint: "回合數縮到剛好，通常 2 款接力。",
    color: "#a855f7",
    gradient: "linear-gradient(135deg, #a855f7, #ec4899)",
  },
  {
    id: "marathon",
    label: "10分鐘最久",
    short: "最久",
    icon: "🔥",
    budgetMinutes: 10,
    tagline: "玩好玩滿，連最長的一款也塞得進來",
    hint: "2–4 款遊戲接力，時間到就收攤。",
    color: "#ff2d95",
    gradient: "linear-gradient(135deg, #ff2d95, #ff6b00)",
  },
];

export function isPlayModeId(value: unknown): value is PlayModeId {
  return PLAY_MODES.some((mode) => mode.id === value);
}

export function playModeById(id: string | null | undefined): PlayMode | null {
  if (!id) return null;
  return PLAY_MODES.find((mode) => mode.id === id) ?? null;
}

/** Falls back to the middle mode so callers never deal with `null`. */
export function playModeOrDefault(id: string | null | undefined): PlayMode {
  return playModeById(id) ?? PLAY_MODES[1];
}
