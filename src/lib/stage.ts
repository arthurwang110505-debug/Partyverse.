import type { HostMode, Room, ScreenMode } from "@/types";

/**
 * Whether a shared big screen is showing the stage for this room.
 *
 * Rooms created after phone hosting carry an explicit `screenMode`. Older rooms
 * did not: they always had a display seat, so a display seat means "TV" and its
 * absence means the phones are on their own.
 */
export function usesBigScreen(room: Pick<Room, "screenMode" | "players"> | null | undefined): boolean {
  if (!room) return false;
  if (room.screenMode) return room.screenMode === "tv";
  return Object.values(room.players ?? {}).some((p) => p.role === "display");
}

/** True when every phone has to show the stage itself. */
export function phonesShowStage(room: Pick<Room, "screenMode" | "players"> | null | undefined): boolean {
  return Boolean(room) && !usesBigScreen(room);
}

/** Seat configuration for the person who creates the room. */
export function hostSeat(mode: HostMode): { role: "player" | "display"; screenMode: ScreenMode } {
  switch (mode) {
    case "play":
      return { role: "player", screenMode: "phones" };
    case "referee":
      return { role: "display", screenMode: "phones" };
    case "tv":
      return { role: "display", screenMode: "tv" };
  }
}

export const HOST_MODE_KEY = "partyverse_host_mode";

export function isHostMode(value: unknown): value is HostMode {
  return value === "play" || value === "referee" || value === "tv";
}
