import type { Achievement, GameEngine, GameSummary, Room } from "@/types";
import { topScorers } from "./scoring";
import { serverNow } from "./clock";

export const FOLLOW_GAME_ID = "followme";

export interface FollowActionDef {
  id: "clap" | "stomp" | "hands" | "shout";
  emoji: string;
  label: string;
  /** Distinct tick frequency so the TV sounds different for each command. */
  tone: number;
}

/** The four commands the TV shouts out. Phones mirror them as tap buttons. */
export const FOLLOW_ACTIONS: FollowActionDef[] = [
  { id: "clap", emoji: "👏", label: "拍手", tone: 880 },
  { id: "stomp", emoji: "👣", label: "跺腳", tone: 330 },
  { id: "hands", emoji: "🙌", label: "舉手", tone: 660 },
  { id: "shout", emoji: "📣", label: "喊派對！", tone: 520 },
];

export type FollowPhase = "command" | "reveal" | "result";

export interface FollowGameState {
  phase: FollowPhase;
  timeLeft: number;
  currentRound: number;
  totalRounds: number;
  /** Index into FOLLOW_ACTIONS for the command currently on screen. */
  command: number;
  /** Seconds given for the current command (ramps down as the match goes on). */
  commandDuration: number;
  commandStartedAt: number;
  /** playerId -> FOLLOW_ACTIONS index they tapped. */
  answers: Record<string, number>;
  roundPoints: Record<string, number>;
  streaks: Record<string, number>;
  /** First correct tapper of the current command (crown on the reveal). */
  fastestId: string | null;
  currentScores: Record<string, number>;
  winnerId: string | null;
  winnerIds: string[];
}

export interface FollowActAction {
  type: "act";
  choice: number;
}

export type FollowAction = FollowActAction;

const REVEAL_SECONDS = 2;
const WRONG_PENALTY = 5;
const STREAK_FROM = 3;
const STREAK_BONUS = 5;
/** The pace-up: every 5 commands shave a second off, down to this floor. */
const MIN_COMMAND_SECONDS = 2;

export function commandSeconds(baseTimer: number, round: number): number {
  return Math.max(MIN_COMMAND_SECONDS, Math.min(6, baseTimer) - Math.floor((round - 1) / 5));
}

function initialScores(players: Room["players"]): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const id of Object.keys(players)) scores[id] = 0;
  return scores;
}

/** Random command; never the same one twice in a row so taps stay honest. */
function pickCommand(prev: number): number {
  let c = Math.floor(Math.random() * FOLLOW_ACTIONS.length);
  if (c === prev) c = (c + 1 + Math.floor(Math.random() * (FOLLOW_ACTIONS.length - 1))) % FOLLOW_ACTIONS.length;
  return c;
}

function commandState(
  state: Omit<FollowGameState, "answers" | "roundPoints" | "fastestId">,
  round: number,
  room: Room<FollowGameState>,
): FollowGameState {
  const duration = commandSeconds(room.settings?.timer ?? 4, round);
  return {
    ...state,
    phase: "command",
    currentRound: round,
    timeLeft: duration,
    command: pickCommand(state.command),
    commandDuration: duration,
    commandStartedAt: serverNow(),
    answers: {},
    roundPoints: {},
    fastestId: null,
  };
}

function reveal(state: FollowGameState): FollowGameState {
  return { ...state, phase: "reveal", timeLeft: REVEAL_SECONDS };
}

export const FollowMeEngine: GameEngine<FollowGameState> = {
  createGame(room) {
    const rounds = room.settings?.rounds ?? 24;
    const base = {
      phase: "command" as const,
      currentRound: 1,
      totalRounds: Math.max(4, Math.min(40, rounds)),
      command: Math.floor(Math.random() * FOLLOW_ACTIONS.length),
      commandDuration: commandSeconds(room.settings?.timer ?? 4, 1),
      commandStartedAt: serverNow(),
      streaks: {},
      fastestId: null,
      currentScores: initialScores(room.players),
      winnerId: null,
      winnerIds: [],
    };
    return { ...base, timeLeft: base.commandDuration, answers: {}, roundPoints: {} };
  },

  startGame(room) {
    return this.createGame(room);
  },

  handlePlayerAction(room, playerId, action) {
    const state = room.gameState;
    if (!state || state.phase !== "command") return state;
    const act = action as FollowAction;
    if (act?.type !== "act") return state;
    if (typeof act.choice !== "number" || !Number.isInteger(act.choice) || act.choice < 0 || act.choice >= FOLLOW_ACTIONS.length) {
      return state;
    }
    if (state.answers[playerId] !== undefined) return state;

    const answers = { ...state.answers, [playerId]: act.choice };
    const roundPoints = { ...state.roundPoints };
    const scores = { ...state.currentScores };
    const streaks = { ...state.streaks };
    let fastestId = state.fastestId;

    if (act.choice === state.command) {
      const total = state.commandDuration * 1000;
      const elapsed = Math.max(0, serverNow() - state.commandStartedAt);
      const speed = Math.max(0, Math.round(10 * (1 - elapsed / total)));
      const streak = (streaks[playerId] ?? 0) + 1;
      const bonus = streak >= STREAK_FROM ? STREAK_BONUS : 0;
      roundPoints[playerId] = 10 + speed + bonus;
      scores[playerId] = (scores[playerId] ?? 0) + roundPoints[playerId];
      streaks[playerId] = streak;
      if (!fastestId) fastestId = playerId;
    } else {
      roundPoints[playerId] = -WRONG_PENALTY;
      // Wrong taps never drag a total below zero; this is a party, not a debt.
      scores[playerId] = Math.max(0, (scores[playerId] ?? 0) - WRONG_PENALTY);
      streaks[playerId] = 0;
    }

    const next: FollowGameState = { ...state, answers, roundPoints, streaks, fastestId, currentScores: scores };
    const online = Object.keys(room.players).filter((id) => room.players[id]?.isConnected !== false);
    return online.every((id) => answers[id] !== undefined) ? reveal(next) : next;
  },

  updateGameState(room) {
    const state = room.gameState;
    if (!state) return state;

    if (state.phase === "command") {
      if (state.timeLeft > 1) return { ...state, timeLeft: state.timeLeft - 1 };
      return reveal(state);
    }

    if (state.phase === "reveal") {
      if (state.timeLeft > 1) return { ...state, timeLeft: state.timeLeft - 1 };
      if (state.currentRound >= state.totalRounds) {
        const winnerIds = topScorers(state.currentScores);
        return { ...state, phase: "result", timeLeft: 0, winnerId: winnerIds[0] ?? null, winnerIds };
      }
      return commandState(state, state.currentRound + 1, room);
    }

    return state;
  },

  endRound(room) {
    return this.createGame(room);
  },

  endGame(room): GameSummary {
    const state = room.gameState;
    const scores = state?.currentScores ?? {};
    const winnerIds = topScorers(scores);
    const winnerId = state?.winnerId ?? winnerIds[0] ?? "";

    const achievements: Achievement[] = [];
    if (winnerIds.length === 1 && winnerId) {
      achievements.push({
        id: "follow_champion",
        name: "閃電手感",
        icon: "⚡",
        description: "全場跟得最快、最準的人",
        playerId: winnerId,
      });
    }

    return { scores, achievements, winnerId, winnerIds };
  },

  calculateScores(room) {
    return room.gameState?.currentScores ?? {};
  },
};
