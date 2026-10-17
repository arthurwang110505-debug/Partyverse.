import { afterEach, describe, expect, it, vi } from "vitest";
import { testRoom, startPlayingRoom } from "@/test/fixtures";
import { claimRoomHost, hostIsGone, successorRank } from "./gameSession";
import { hostSeat, isHostMode, phonesShowStage, usesBigScreen } from "./stage";
import { stageAvailable, stageOpensAutomatically } from "./stagePolicy";
import { inviteText, joinUrlFor, shareInvite } from "./invite";
import { parseRoom } from "./roomData";
import { splitSecrets, viewGameState } from "./privateState";
import { HOST_STALE_MS } from "@/constants/room";
import type { Room } from "@/types";

const NOW = 100000;

/** A phone-hosted room: the host (p1) is an ordinary player. */
function phoneRoom(gameId = "bombcountdown"): Room {
  const room = testRoom(gameId);
  delete room.players.tv;
  room.players.p1.isHost = true;
  room.hostPlayerId = "p1";
  room.screenMode = "phones";
  return room;
}

describe("stage mode", () => {
  it("trusts an explicit screenMode, and infers it for rooms created before one existed", () => {
    expect(usesBigScreen(testRoom())).toBe(true);
    expect(usesBigScreen(phoneRoom())).toBe(false);
    expect(phonesShowStage(phoneRoom())).toBe(true);
    expect(phonesShowStage(null)).toBe(false);
    // A phone host who plays must not be mistaken for a TV room.
    const legacyPhone = phoneRoom();
    delete legacyPhone.screenMode;
    expect(usesBigScreen(legacyPhone)).toBe(false);
    // A TV seat in a room that says "phones" (host switched to referee) is still phones.
    const referee = testRoom();
    referee.screenMode = "phones";
    expect(usesBigScreen(referee)).toBe(false);
  });

  it("maps each host mode to a seat", () => {
    expect(hostSeat("play")).toEqual({ role: "player", screenMode: "phones" });
    expect(hostSeat("referee")).toEqual({ role: "display", screenMode: "phones" });
    expect(hostSeat("tv")).toEqual({ role: "display", screenMode: "tv" });
    expect(isHostMode("tv")).toBe(true);
    expect(isHostMode("nope")).toBe(false);
  });

  it("keeps screenMode through the database round trip and drops junk", () => {
    const stored = { ...phoneRoom(), screenMode: "phones" } as unknown as Record<string, unknown>;
    expect(parseRoom(stored, "TESTA")?.screenMode).toBe("phones");
    expect(parseRoom({ ...stored, screenMode: "bogus" }, "TESTA")?.screenMode).toBeUndefined();
  });
});

describe("stage policy", () => {
  it("opens by itself only for phases the group watches together", () => {
    expect(stageOpensAutomatically({ gameId: "everybodyknows", phase: "reveal" })).toBe(true);
    expect(stageOpensAutomatically({ gameId: "everybodyknows", phase: "answering" })).toBe(false);
    expect(stageOpensAutomatically({ gameId: "realbattle", phase: "battle" })).toBe(true);
    expect(stageOpensAutomatically({ gameId: "musicalchairs", phase: "music" })).toBe(true);
    expect(stageOpensAutomatically({ gameId: "bombcountdown", phase: "battle" })).toBe(false);
    expect(stageOpensAutomatically({ gameId: "bombcountdown", phase: undefined })).toBe(false);
    expect(stageOpensAutomatically({ gameId: "bombcountdown", phase: "rules" })).toBe(false);
  });

  it("is unavailable until the rules briefing is over", () => {
    expect(stageAvailable({ gameId: "x", phase: undefined })).toBe(false);
    expect(stageAvailable({ gameId: "x", phase: "rules" })).toBe(false);
    expect(stageAvailable({ gameId: "x", phase: "answering" })).toBe(true);
  });
});

describe("automatic host handoff", () => {
  it("treats a disconnected host, or a frozen one mid-game, as gone", () => {
    const lobby = phoneRoom();
    expect(hostIsGone(lobby, NOW)).toBe(false);
    lobby.players.p1.isConnected = false;
    expect(hostIsGone(lobby, NOW)).toBe(true);

    const playing = startPlayingRoom(phoneRoom(), NOW);
    expect(hostIsGone(playing, NOW + 1000)).toBe(false);
    expect(hostIsGone(playing, NOW + HOST_STALE_MS + 1000)).toBe(true);
    // A frozen host only matters while a game is actually running.
    expect(hostIsGone({ ...playing, status: "RESULTS" }, NOW + HOST_STALE_MS + 1000)).toBe(false);
  });

  it("ranks connected non-display players by id, and nobody else", () => {
    const room = phoneRoom();
    room.players.p3.isConnected = false;
    expect(successorRank(room, "p2")).toBe(0);
    expect(successorRank(room, "p4")).toBe(1);
    expect(successorRank(room, "p3")).toBe(-1);
    expect(successorRank(room, "p1")).toBe(-1); // the host is not their own heir
    const tv = testRoom();
    expect(successorRank(tv, "tv")).toBe(-1);
    expect(successorRank(tv, "p1")).toBe(0); // a TV host's room can still be inherited
  });

  it("lets the next phone claim a dropped host, in the lobby too", () => {
    const room = phoneRoom();
    room.players.p1.isConnected = false;
    const claimed = claimRoomHost(room, "p2", "p1", NOW)!;
    expect(claimed.hostPlayerId).toBe("p2");
    expect(claimed.players.p2.isHost).toBe(true);
    expect(claimed.players.p1.isHost).toBe(false);
    expect(claimRoomHost(claimed, "p3", "p1", NOW)).toBeNull(); // someone already took it
  });
});

describe("a host who plays gets no secrets, but the revealed answer is public", () => {
  it("hides the drawing word from guessers until the reveal, then shows it to everyone", () => {
    const word = { id: "w", word: "蘋果", category: "水果", aliases: [] };
    const drawing = splitSecrets("drawandguess", { phase: "drawing", prompt: word });
    expect(drawing.publicState.prompt).toBeUndefined();
    expect(drawing.hostSecrets.prompt).toEqual(word);

    const revealed = splitSecrets("drawandguess", { phase: "reveal", prompt: word });
    expect(revealed.publicState.prompt).toEqual(word);

    const room = testRoom("drawandguess");
    room.gameState = revealed.publicState;
    const guesserView = viewGameState(room, "p2", { myPrivate: null });
    expect((guesserView.prompt as { word: string }).word).toBe("蘋果");

    room.gameState = drawing.publicState;
    const hiddenView = viewGameState(room, "p2", { myPrivate: null });
    expect((hiddenView.prompt as { word: string }).word).toBe("");
  });

  it("never publishes undercover secrets mid-game", () => {
    const { publicState } = splitSecrets("whoisundercoveragent", {
      phase: "voting",
      undercoverPlayerId: "p2",
      civilianWord: "a",
      undercoverWord: "b",
      playerWords: { p1: "a" },
    });
    expect(publicState).not.toHaveProperty("undercoverPlayerId");
    expect(publicState).not.toHaveProperty("civilianWord");
  });
});

describe("shareInvite", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("builds the join link and message", () => {
    expect(joinUrlFor("https://x.test", "AB123")).toBe("https://x.test/join/AB123");
    expect(joinUrlFor("", "AB123")).toBe("");
    expect(inviteText("AB123")).toContain("AB123");
  });

  it("uses the native share sheet when there is one", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });
    expect(await shareInvite("AB123", "https://x.test/join/AB123")).toBe("shared");
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: "https://x.test/join/AB123" }));
  });

  it("does not call a dismissed share sheet a failure", async () => {
    vi.stubGlobal("navigator", { share: vi.fn().mockRejectedValue(new DOMException("x", "AbortError")) });
    expect(await shareInvite("AB123", "https://x.test/join/AB123")).toBe("cancelled");
  });

  it("falls back to the clipboard, then to failure", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    expect(await shareInvite("AB123", "https://x.test/join/AB123")).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("https://x.test/join/AB123"));

    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("no")) } });
    expect(await shareInvite("AB123", "https://x.test/join/AB123")).toBe("failed");
    expect(await shareInvite("AB123", "")).toBe("failed");
  });
});
