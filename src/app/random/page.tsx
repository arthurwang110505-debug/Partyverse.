import type { Metadata } from "next";
import { isPlayModeId } from "@/constants/playModes";
import RandomPartyClient from "./RandomPartyClient";

export const metadata: Metadata = {
  title: "隨機時段派對 — 3分鐘快閃 / 5分鐘正常 / 10分鐘最久",
  description:
    "選一個時間長度，系統隨機抽出塞得進這段時間的遊戲清單，盡量避開剛玩過的遊戲；玩完一款就自動接下一個。",
};

interface Props {
  searchParams: { mode?: string; players?: string };
}

export default function RandomPartyPage({ searchParams }: Props) {
  const players = Number(searchParams.players);
  return (
    <RandomPartyClient
      initialMode={isPlayModeId(searchParams.mode) ? searchParams.mode : undefined}
      initialPlayerCount={Number.isFinite(players) && players >= 2 && players <= 20 ? players : undefined}
    />
  );
}
