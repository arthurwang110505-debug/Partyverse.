"use client";

import { useMemo } from "react";
import { useRoom } from "@/providers/RoomContext";
import { viewGameState } from "@/lib/privateState";

/**
 * Game state shaped for *this* client.
 *
 * - Display seat (TV, or a host who only referees): full secrets
 * - Everyone who plays — including a host who plays on their phone — only their own
 *   private slice (word, impostor flag, clue, …). The host's clock does not need
 *   hydrated views: ticks run on the raw room inside a transaction.
 */
export function useGameViewState<T = Record<string, unknown>>(): T | undefined {
  const { room, player } = useRoom();
  return useMemo(() => {
    if (!room) return undefined;
    const asHost = player?.role === "display";
    return viewGameState(room, player?.id, {
      asHost,
      hostSecrets: room.privateHost,
      myPrivate: player?.id ? room.private?.[player.id] : null,
    }) as T;
  }, [room, player?.id, player?.role]);
}
