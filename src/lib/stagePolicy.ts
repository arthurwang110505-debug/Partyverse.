/**
 * When should a phone show the shared "stage" on its own screen?
 *
 * With a big screen the answer is never: everyone looks at the TV. Without one,
 * the phone has to show whatever the TV would have shown. The phone views already
 * carry each player's own controls, so the stage is added *above* them in the
 * phases where the group is meant to look at something together.
 */

/** Phases that exist to be watched together (reveals, eliminations, fireworks…). */
const WATCH_PHASES = new Set(["reveal", "round_reveal", "eliminated", "exploded", "show"]);

/**
 * Games whose live phases need a shared picture or beat, not just a reveal.
 * - Real Battle: the arena only exists on the stage; phones are joysticks.
 * - Musical Chairs: the accelerating beat is produced by the stage view.
 */
const LIVE_PHASES: Record<string, string[]> = {
  realbattle: ["countdown", "battle"],
  musicalchairs: ["music"],
};

export interface StageContextInfo {
  gameId: string;
  /** `gameState.phase` of the running game (may be undefined before it starts). */
  phase: string | undefined;
}

/** Should the stage open by itself right now? (The player can always toggle it.) */
export function stageOpensAutomatically({ gameId, phase }: StageContextInfo): boolean {
  if (!phase || phase === "rules" || phase === "result") return false;
  if (WATCH_PHASES.has(phase)) return true;
  return LIVE_PHASES[gameId]?.includes(phase) ?? false;
}

/** The stage is meaningless during the rules briefing (nothing has started). */
export function stageAvailable({ phase }: StageContextInfo): boolean {
  return Boolean(phase) && phase !== "rules";
}
