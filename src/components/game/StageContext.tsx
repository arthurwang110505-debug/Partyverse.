"use client";

import { createContext, useContext } from "react";

/**
 * True while a TV (host) view is rendered *inside* a phone, as the "stage".
 *
 * Host views were written for a big screen: they bring their own full-page
 * shell, ticking sounds and host controls. When a phone mirrors one, those
 * would duplicate the phone's own shell, so `HostShell` and `HostGameControls`
 * check this flag and step aside.
 */
const StageContext = createContext(false);

export const EmbeddedStageProvider = StageContext.Provider;

export function useEmbeddedStage(): boolean {
  return useContext(StageContext);
}
