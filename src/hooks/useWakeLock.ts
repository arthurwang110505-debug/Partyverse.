"use client";

import { useEffect, useState } from "react";

interface WakeLockSentinelLike {
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
}
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
};

export type WakeLockState = "unsupported" | "inactive" | "active";

/**
 * Keep the screen on while `enabled`.
 *
 * A phone-hosted game is only as alive as the host's screen: a locked phone
 * stops the clock. Browsers drop the lock whenever the page is hidden, so it is
 * re-requested when the page becomes visible again.
 */
export function useWakeLock(enabled: boolean): WakeLockState {
  const [state, setState] = useState<WakeLockState>("inactive");

  useEffect(() => {
    const nav = typeof navigator === "undefined" ? undefined : (navigator as WakeLockNavigator);
    if (!nav?.wakeLock) {
      setState("unsupported");
      return;
    }
    if (!enabled) {
      setState("inactive");
      return;
    }
    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const request = async () => {
      if (cancelled || document.visibilityState !== "visible" || sentinel) return;
      try {
        const lock = await nav.wakeLock!.request("screen");
        if (cancelled) {
          void lock.release().catch(() => undefined);
          return;
        }
        sentinel = lock;
        setState("active");
        lock.addEventListener("release", () => {
          if (sentinel === lock) sentinel = null;
          if (!cancelled) setState("inactive");
        });
      } catch {
        // Denied (battery saver, no user gesture yet): stay inactive and retry on the next wake.
        setState("inactive");
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };
    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => undefined);
      sentinel = null;
    };
  }, [enabled]);

  return state;
}
