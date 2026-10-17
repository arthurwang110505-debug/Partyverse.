import type { RoomSettings } from "@/types";
import { gameSettingsProfile } from "@/constants/gameSettings";

export type PaceId = "quick" | "standard" | "relaxed";

export interface PacePreset {
  id: PaceId;
  label: string;
  hint: string;
  /** Multipliers applied to the game's default timer / rounds. */
  timerScale: number;
  roundsScale: number;
}

export const PACE_PRESETS: PacePreset[] = [
  { id: "quick", label: "快速", hint: "回合少、節奏快，適合熱場", timerScale: 0.75, roundsScale: 0.6 },
  { id: "standard", label: "標準", hint: "預設節奏，大多數派對剛好", timerScale: 1, roundsScale: 1 },
  { id: "relaxed", label: "輕鬆", hint: "多一點時間，適合第一次玩", timerScale: 1.35, roundsScale: 1.25 },
];

/** Map a pace preset onto a game's legal timer/rounds range. */
export function settingsForPace(gameId: string, pace: PaceId, base?: RoomSettings): Partial<RoomSettings> {
  const profile = gameSettingsProfile(gameId);
  const preset = PACE_PRESETS.find((p) => p.id === pace) ?? PACE_PRESETS[1];
  const defaultTimer = base?.timer ?? profile.defaultTimer;
  const defaultRounds = base?.rounds ?? profile.defaultRounds;

  const timer = profile.hasTimer
    ? clamp(
        Math.round(defaultTimer * preset.timerScale),
        profile.timerMin,
        profile.timerMax,
      )
    : defaultTimer;

  const rounds =
    profile.maxRounds <= 1
      ? 1
      : clamp(Math.round(defaultRounds * preset.roundsScale), 1, profile.maxRounds);

  return {
    ...(profile.hasTimer ? { timer } : {}),
    rounds,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Best-effort reverse map so the UI can highlight the active preset. */
export function detectPace(gameId: string, settings: RoomSettings): PaceId | null {
  for (const pace of PACE_PRESETS) {
    const target = settingsForPace(gameId, pace.id);
    const timerOk = !("timer" in target) || target.timer === settings.timer;
    const roundsOk = target.rounds === settings.rounds;
    if (timerOk && roundsOk) return pace.id;
  }
  return null;
}
