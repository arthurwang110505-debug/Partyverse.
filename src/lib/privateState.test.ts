import { describe, expect, it } from "vitest";
import { testRoom } from "@/test/fixtures";
import { hydrateGameState, splitSecrets, viewGameState } from "./privateState";

describe("privateState split / view", () => {
  it("strips undercover secrets from the public blob", () => {
    const full = {
      phase: "discussion",
      civilianWord: "珍珠奶茶",
      undercoverWord: "水果茶",
      undercoverPlayerId: "p2",
      playerWords: { p1: "珍珠奶茶", p2: "水果茶", p3: "珍珠奶茶" },
      votes: {},
      eliminatedPlayerIds: [],
      currentScores: { p1: 0, p2: 0, p3: 0 },
    };
    const { publicState, hostSecrets, playerSecrets } = splitSecrets("whoisundercoveragent", full);
    expect(publicState.playerWords).toBeUndefined();
    expect(publicState.undercoverPlayerId).toBeUndefined();
    expect(publicState.undercoverWord).toBeUndefined();
    expect(publicState.civilianWord).toBeUndefined();
    expect(publicState.phase).toBe("discussion");
    expect(hostSecrets.undercoverPlayerId).toBe("p2");
    expect(playerSecrets.p2).toEqual({ myWord: "水果茶" });
    expect(playerSecrets.p1).toEqual({ myWord: "珍珠奶茶" });
  });

  it("lets a civilian phone see only their word", () => {
    const room = testRoom("whoisundercoveragent", 3);
    room.gameState = {
      phase: "voting",
      votes: {},
      eliminatedPlayerIds: [],
      currentScores: {},
    };
    const view = viewGameState(room, "p1", {
      myPrivate: { myWord: "珍珠奶茶" },
      hostSecrets: {
        undercoverPlayerId: "p2",
        playerWords: { p1: "珍珠奶茶", p2: "水果茶" },
        undercoverWord: "水果茶",
        civilianWord: "珍珠奶茶",
      },
    });
    expect(view.myWord).toBe("珍珠奶茶");
    expect(view.playerWords).toEqual({ p1: "珍珠奶茶" });
    expect(view.undercoverPlayerId).toBeUndefined();
    expect(view.undercoverWord).toBeUndefined();
  });

  it("hides impostor ids from crew phones", () => {
    const room = testRoom("amongus", 5);
    room.gameState = { phase: "tasks", tasksCompleted: 0, tasksTotal: 8 };
    const crewView = viewGameState(room, "p1", {
      myPrivate: {},
      hostSecrets: { impostorIds: ["p4", "p5"] },
    });
    expect(crewView.impostorIds).toEqual([]);
    expect(crewView.iAmImpostor).toBe(false);

    const impView = viewGameState(room, "p4", {
      myPrivate: { isImpostor: true, impostorMates: ["p5"] },
    });
    expect(impView.iAmImpostor).toBe(true);
    expect(impView.impostorIds).toEqual(["p4", "p5"]);
  });

  it("hydrates host state for the engine clock", () => {
    const hydrated = hydrateGameState(
      { phase: "tasks", tasksCompleted: 1 },
      { impostorIds: ["p2"] },
    );
    expect(hydrated).toEqual({ phase: "tasks", tasksCompleted: 1, impostorIds: ["p2"] });
  });

  it("keeps draw prompt off public state except category", () => {
    const full = {
      phase: "drawing",
      drawerPlayerId: "p1",
      prompt: { id: "d1", word: "捷運", category: "交通", aliases: [] },
      strokes: [],
    };
    const { publicState, playerSecrets } = splitSecrets("drawandguess", full);
    expect(publicState.prompt).toBeUndefined();
    expect(publicState.promptCategory).toBe("交通");
    expect(playerSecrets.p1?.prompt).toEqual(full.prompt);
    expect(playerSecrets.p2).toBeUndefined();
  });
});
