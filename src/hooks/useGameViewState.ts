"use client";

import { useMemo } from "react";
import { useRoom } from "@/providers/RoomContext";
import { viewGameState } from "@/lib/privateState";

/**
 * Game state shaped for *this* client.
 *
 * - Host / TV: full secrets (needed to tick & present reveals)
 * - Phone: only that player's private slice (word, impostor flag, clue, …)
 */
export function useGameViewState<T = Record<string, unknown>>(): T | undefined {
  const { room, player, isHost } = useRoom();
  return useMemo(() => {
    if (!room) return undefined;
    const asHost = Boolean(isHost) || player?.role === "display";
    return viewGameState(room, player?.id, {
      asHost,
      hostSecrets: room.privateHost,
      myPrivate: player?.id ? room.private?.[player.id] : null,
    }) as T;
  }, [room, player?.id, player?.role, isHost]);
}
