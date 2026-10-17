"use client";

import { useEffect, useRef } from "react";
import { useRoom } from "@/providers/RoomContext";
import { useToast } from "@/providers/ToastProvider";
import { useWakeLock } from "@/hooks/useWakeLock";
import { HANDOFF_GRACE_MS, HANDOFF_STEP_MS } from "@/constants/room";
import { hostIsGone, successorRank } from "@/lib/gameSession";
import { usesBigScreen } from "@/lib/stage";
import { serverNow } from "@/engine/clock";

/**
 * Keeps a phone-hosted party alive. Renders nothing.
 *
 * 1. Screen wake lock, for everyone in a phone room (the host's matters most).
 * 2. Automatic host hand-off. When the host drops out, the players line up by a
 *    shared, deterministic order; each waits its turn and then claims the room
 *    (the claim is a compare-and-swap, so two phones can never both win).
 * 3. Tells people when the host changed.
 *
 * A room with a big screen keeps its TV as host: handing the clock to a phone
 * would leave the TV with nothing to show.
 */
export function RoomPresence() {
  const { room, user, claimHost } = useRoom();
  const { toast } = useToast();

  const roomId = room?.id;
  const uid = user?.uid;
  const phoneRoom = Boolean(room) && !usesBigScreen(room);

  useWakeLock(Boolean(roomId) && phoneRoom);

  // --- auto hand-off ---------------------------------------------------------
  const roomRef = useRef(room);
  roomRef.current = room;
  const claimRef = useRef(claimHost);
  claimRef.current = claimHost;

  useEffect(() => {
    if (!roomId || !uid) return;
    let goneSince: number | null = null;
    let claiming = false;
    const timer = setInterval(() => {
      const current = roomRef.current;
      if (!current || current.hostPlayerId === uid || usesBigScreen(current)) {
        goneSince = null;
        return;
      }
      // The host's heartbeat is written in server time, so compare it on that clock.
      if (!hostIsGone(current, serverNow())) {
        goneSince = null;
        return;
      }
      const rank = successorRank(current, uid);
      if (rank < 0 || claiming) return;
      goneSince ??= Date.now();
      if (Date.now() - goneSince < HANDOFF_GRACE_MS + rank * HANDOFF_STEP_MS) return;
      claiming = true;
      void claimRef
        .current()
        .catch(() => undefined)
        .finally(() => {
          claiming = false;
          goneSince = null;
        });
    }, 1000);
    return () => clearInterval(timer);
  }, [roomId, uid]);

  // --- announce host changes --------------------------------------------------
  const lastHost = useRef<{ roomId: string; hostId: string } | null>(null);
  const hostId = room?.hostPlayerId;
  const hostName = hostId ? room?.players[hostId]?.nickname : undefined;
  useEffect(() => {
    if (!roomId || !hostId) {
      lastHost.current = null;
      return;
    }
    const previous = lastHost.current;
    lastHost.current = { roomId, hostId };
    if (!previous || previous.roomId !== roomId || previous.hostId === hostId) return;
    if (hostId === uid) toast("房主離線，你已自動接手主持！", "info");
    else toast(`${hostName ?? "另一位玩家"} 接手成為新房主`, "info");
  }, [roomId, hostId, hostName, uid, toast]);

  return null;
}
