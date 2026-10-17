/** Invite helpers shared by the lobby and the in-game host menu. */

export function joinUrlFor(origin: string, roomCode: string): string {
  return origin ? `${origin}/join/${roomCode}` : "";
}

export function inviteText(roomCode: string): string {
  return `來玩 PARTYVERSE！房間代碼 ${roomCode}`;
}

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

/**
 * Hand the invite to the phone's native share sheet (LINE, Messages, AirDrop…),
 * falling back to the clipboard where the Web Share API does not exist.
 */
export async function shareInvite(roomCode: string, url: string): Promise<ShareOutcome> {
  if (!url) return "failed";
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  if (nav && typeof nav.share === "function") {
    try {
      await nav.share({ title: "PARTYVERSE", text: inviteText(roomCode), url });
      return "shared";
    } catch (error) {
      // The user closing the share sheet is not a failure.
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  try {
    await nav?.clipboard.writeText(`${inviteText(roomCode)}\n${url}`);
    return "copied";
  } catch {
    return "failed";
  }
}
