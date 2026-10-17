"use client";

import HostGameView from "@/app/room/[roomCode]/host/HostGameView";
import { EmbeddedStageProvider } from "./StageContext";

/**
 * The big-screen view of the running game, rendered inside a phone.
 *
 * TV views only ever show information that is meant for the whole table, so
 * showing them on every phone is safe. Loaded lazily by `StageDock`.
 */
export default function StageMirror() {
  return (
    <EmbeddedStageProvider value={true}>
      <HostGameView />
    </EmbeddedStageProvider>
  );
}
