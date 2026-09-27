"use client";

import { useCallback, useRef } from "react";
import { useRoom } from "@/providers/RoomContext";
import { useToast } from "@/providers/ToastProvider";

export interface SubmitOptions {
  /** Fallback when the thrown error has no message. */
  failMessage?: string;
  /**
   * Minimum ms between toasts for this caller. High-frequency actions
   * (whack, move, tap-mash) should pass 3000–5000 so a dead connection
   * does not carpet-bomb the screen.
   */
  throttleMs?: number;
  /** Skip the toast entirely (rare — prefer throttle). */
  silent?: boolean;
}

const DEFAULT_FAIL = "送出失敗，請再試一次";

/**
 * The single path every controller action should take.
 *
 * Motivation: views used to `catch { // Ignore }`, so a failed Firebase
 * write looked identical to success. This helper always surfaces a toast
 * (optionally throttled) and returns whether the write committed.
 */
export function useSubmitAction() {
  const { submitAction } = useRoom();
  const { toast } = useToast();
  const lastToastAt = useRef(0);

  return useCallback(
    async (action: unknown, options: SubmitOptions = {}): Promise<boolean> => {
      const { failMessage = DEFAULT_FAIL, throttleMs = 0, silent = false } = options;
      try {
        await submitAction(action);
        return true;
      } catch (error) {
        if (!silent) {
          const now = Date.now();
          if (!throttleMs || now - lastToastAt.current >= throttleMs) {
            lastToastAt.current = now;
            const message =
              error instanceof Error && error.message.trim() ? error.message : failMessage;
            toast(message);
          }
        }
        return false;
      }
    },
    [submitAction, toast],
  );
}
