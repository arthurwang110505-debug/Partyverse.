"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Crown, Power, RotateCcw, Share2, Flag, X } from "lucide-react";
import { useRoom } from "@/providers/RoomContext";
import { useToast } from "@/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { isParticipant } from "@/engine/participants";
import { joinUrlFor, shareInvite } from "@/lib/invite";
import { usesBigScreen } from "@/lib/stage";
import { cn } from "@/lib/utils";

type Confirm = "restart" | "end" | "close" | null;

/**
 * The host's control panel for a phone-hosted room: one floating button, one sheet.
 *
 * On a big screen the host controls live on the TV and need no menu, so this
 * renders nothing on the TV seat itself. It holds everything a host needs without a second
 * screen: invite (share / QR), who is in the room, restart / end the game,
 * switching between playing and refereeing, and closing the room.
 */
export function HostMenu({ className }: { className?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { room, player, isHost, endRound, endGame, endRoom, kickPlayer, setHostPlays } = useRoom();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [pending, setPending] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  // The TV itself needs no menu; a phone that inherited a TV room's host seat does.
  if (!room || !isHost || (usesBigScreen(room) && player?.role === "display")) return null;

  const url = joinUrlFor(origin, room.id);
  const lobby = room.status === "LOBBY";
  const playing = room.status === "PLAYING";
  const plays = player ? isParticipant(player) : false;
  const people = Object.values(room.players).filter(isParticipant);

  const run = async (action: () => Promise<void>, done?: string) => {
    if (pending) return;
    setPending(true);
    try {
      await action();
      if (done) toast(done, "info");
      setConfirm(null);
      setOpen(false);
    } catch (error) {
      toast(error instanceof Error ? error.message : "操作失敗，請再試一次");
      setConfirm(null);
    } finally {
      setPending(false);
    }
  };

  const share = async () => {
    const outcome = await shareInvite(room.id, url);
    if (outcome === "copied") toast("邀請連結已複製，貼給朋友吧", "info");
    if (outcome === "failed") toast("無法分享，請讓朋友輸入代碼加入");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="主持人選單"
        className={cn(
          "fixed bottom-3 right-3 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-yellow-400/40",
          "bg-yellow-400/15 text-yellow-300 shadow-xl backdrop-blur-md transition-all active:scale-90",
          "mb-[env(safe-area-inset-bottom)]",
          className,
        )}
      >
        <Crown className="h-5 w-5" aria-hidden="true" />
      </button>

      <Modal
        open={open}
        onClose={() => {
          if (!pending) {
            setOpen(false);
            setConfirm(null);
          }
        }}
        title={
          <span className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-400" aria-hidden="true" /> 主持人選單
          </span>
        }
        className="max-h-[88dvh] overflow-y-auto"
      >
        {/* Invite */}
        <section aria-label="邀請朋友" className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-white/40">房間代碼</p>
          <p className="mb-3 text-4xl font-black tracking-[0.2em] text-violet-300">{room.id}</p>
          {url && (
            <div className="mx-auto mb-3 inline-block rounded-xl bg-white p-3">
              <QRCodeSVG value={url} size={150} level="M" aria-label={`加入房間 ${room.id} 的 QR code`} />
            </div>
          )}
          <Button variant="accent" size="md" className="w-full" disabled={!url} onClick={() => void share()}>
            <Share2 className="h-4 w-4" aria-hidden="true" /> 分享邀請
          </Button>
        </section>

        {/* Roster */}
        <section aria-label="房內玩家" className="mb-5">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/50">
            房內玩家（{people.length}）
          </h3>
          <ul className="space-y-1.5">
            {people.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden="true">{p.avatar}</span>
                  <span className="truncate font-semibold">{p.nickname}</span>
                  {p.isHost && <Crown className="h-3.5 w-3.5 shrink-0 text-yellow-400" aria-label="房主" />}
                  <span
                    className={cn("h-2 w-2 shrink-0 rounded-full", p.isConnected ? "bg-emerald-400" : "bg-red-500")}
                    aria-label={p.isConnected ? "在線" : "離線"}
                  />
                </span>
                {lobby && !p.isHost && (
                  <button
                    type="button"
                    aria-label={`移除 ${p.nickname}`}
                    className="rounded-lg p-2 text-white/50 hover:bg-white/10"
                    onClick={() =>
                      void kickPlayer(p.id).catch((e) => toast(e instanceof Error ? e.message : "無法移除"))
                    }
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
            {people.length === 0 && <li className="text-sm text-white/50">還沒有人加入</li>}
          </ul>
        </section>

        {/* Host seat */}
        {lobby && (
          <section aria-label="房主身分" className="mb-5">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm">
              <span>
                <span className="block font-semibold">我也要下場玩</span>
                <span className="block text-xs text-white/50">
                  {plays ? "你會和大家一起得分" : "你只負責主持，不計分"}
                </span>
              </span>
              <input
                type="checkbox"
                role="switch"
                className="h-6 w-11 accent-violet-500"
                checked={plays}
                disabled={pending}
                onChange={(e) => void run(() => setHostPlays(e.target.checked))}
              />
            </label>
          </section>
        )}

        {/* Game controls */}
        {playing && (
          <section aria-label="遊戲控制" className="mb-5 grid grid-cols-2 gap-2">
            <Button variant="ghost" size="md" onClick={() => setConfirm("restart")}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> 重新開始
            </Button>
            <Button variant="ghost" size="md" onClick={() => setConfirm("end")}>
              <Flag className="h-4 w-4" aria-hidden="true" /> 結束並結算
            </Button>
          </section>
        )}

        <Button variant="danger" size="md" className="w-full" onClick={() => setConfirm("close")}>
          <Power className="h-4 w-4" aria-hidden="true" /> 關閉房間
        </Button>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-white/40">
          遊戲的計時由你的手機負責，請讓螢幕保持開啟。若你離線，另一位玩家會自動接手主持。
        </p>

        {confirm && (
          <div
            role="alertdialog"
            aria-label="確認操作"
            className="mt-4 rounded-2xl border border-red-500/30 bg-red-950/40 p-4 text-center"
          >
            <p className="mb-3 text-sm text-white/80">
              {confirm === "restart" && "本場積分會歸零並重新開始，確定嗎？"}
              {confirm === "end" && "保留目前積分並提早前往結算，確定嗎？"}
              {confirm === "close" && "所有人都會被移出，房間代碼立刻失效，無法復原。"}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" disabled={pending} onClick={() => setConfirm(null)}>
                取消
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                loading={pending}
                onClick={() =>
                  void run(async () => {
                    if (confirm === "restart") await endRound();
                    else if (confirm === "end") await endGame();
                    else {
                      await endRoom();
                      router.push("/");
                    }
                  })
                }
              >
                確認
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
