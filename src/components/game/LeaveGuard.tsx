"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRoom } from "@/providers/RoomContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/**
 * Confirms before a phone player leaves mid-match.
 *
 * Covers:
 *  - browser / Android back (popstate)
 *  - tab close / refresh (beforeunload) while PLAYING
 *
 * Lobby already has its own leave button + modal; this is the in-game safety net
 * for accidental swipe-back that used to silently drop the player.
 */
export function LeaveGuard() {
  const router = useRouter();
  const { room, leaveRoom, connectionStatus } = useRoom();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const inMatch = room?.status === "PLAYING" || room?.status === "RESULTS";

  useEffect(() => {
    if (!inMatch) return;

    // Push a sentinel so the first back press opens our dialog instead of exiting.
    const sentinel = { partyverseLeaveGuard: true };
    window.history.pushState(sentinel, "");

    const onPop = () => {
      setConfirmOpen(true);
      // Re-push so repeated backs keep opening the dialog until they confirm.
      window.history.pushState(sentinel, "");
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (room?.status === "PLAYING") {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("popstate", onPop);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [inMatch, room?.status]);

  // Drop the leave dialog if the socket already died — ConnectionBadge handles that state.
  useEffect(() => {
    if (connectionStatus === "disconnected" || connectionStatus === "reconnecting") {
      setConfirmOpen(false);
    }
  }, [connectionStatus]);

  const confirmLeave = async () => {
    if (leaving) return;
    setLeaving(true);
    try {
      await leaveRoom();
      router.push("/");
    } catch {
      setLeaving(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="要離開這場遊戲嗎？" role="alertdialog">
      <p className="mb-6 text-sm text-white/60">
        離開後名額會釋出，需要重新輸入代碼才能回來。進行中的分數不會幫你保留操作權。
      </p>
      <div className="flex gap-2">
        <Button variant="ghost" size="md" className="flex-1" onClick={() => setConfirmOpen(false)} disabled={leaving}>
          留下繼續玩
        </Button>
        <Button variant="danger" size="md" className="flex-1" loading={leaving} onClick={() => void confirmLeave()}>
          離開房間
        </Button>
      </div>
    </Modal>
  );
}
