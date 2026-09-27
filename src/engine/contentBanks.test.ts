import { describe, expect, it } from "vitest";
import { assertNonEmptyString, assertUniqueIds, isFourDigitCode } from "@/lib/contentAudit";
import { SONG_LIST, songOptions } from "./song3Seconds";
import { RIDDLES } from "./brainTeaser";
import { MYSTERY_CASES } from "./mysteryRoom";
import { DRAW_PROMPTS } from "./drawAndGuess";
import { WORD_PAIRS, pickWordPair } from "./whoIsUndercover";

describe("content banks", () => {
  it("songs have unique ids, lyrics, and four distinct options", () => {
    assertUniqueIds(
      SONG_LIST.map((s) => s.id),
      "SONG_LIST",
    );
    expect(SONG_LIST.length).toBeGreaterThanOrEqual(50);
    for (const song of SONG_LIST) {
      assertNonEmptyString(song.title, song.id);
      assertNonEmptyString(song.artist, song.id);
      assertNonEmptyString(song.lyric, song.id);
      assertNonEmptyString(song.category, song.id);
      const opts = songOptions(song, () => 0.42);
      expect(opts).toHaveLength(4);
      expect(new Set(opts).size).toBe(4);
      expect(opts).toContain(song.title);
    }
  });

  it("riddles have unique ids and one correct answer not in wrongs", () => {
    assertUniqueIds(
      RIDDLES.map((r) => r.id),
      "RIDDLES",
    );
    expect(RIDDLES.length).toBeGreaterThanOrEqual(40);
    for (const r of RIDDLES) {
      assertNonEmptyString(r.question, r.id);
      assertNonEmptyString(r.answer, r.id);
      assertNonEmptyString(r.explain, r.id);
      expect(r.wrong).toHaveLength(3);
      expect(r.wrong).not.toContain(r.answer);
      expect(new Set(r.wrong).size).toBe(3);
    }
  });

  it("draw prompts are unique and non-empty", () => {
    assertUniqueIds(
      DRAW_PROMPTS.map((p) => p.id),
      "DRAW_PROMPTS",
    );
    expect(DRAW_PROMPTS.length).toBeGreaterThanOrEqual(30);
    for (const p of DRAW_PROMPTS) {
      assertNonEmptyString(p.word, p.id);
      assertNonEmptyString(p.category, p.id);
    }
  });

  it("undercover pairs are unique and difficulty-pickable", () => {
    const keys = WORD_PAIRS.map((p) => `${p.civilianWord}|${p.undercoverWord}`);
    assertUniqueIds(keys, "WORD_PAIRS");
    expect(WORD_PAIRS.length).toBeGreaterThanOrEqual(35);
    for (const d of ["easy", "medium", "hard"] as const) {
      const pair = pickWordPair(d, () => 0);
      expect(pair.civilianWord).not.toBe(pair.undercoverWord);
      if (pair.difficulty) expect(["easy", "medium", "hard"]).toContain(pair.difficulty);
    }
  });

  it("mystery cases use unique 4-digit codes and self-consistent clues", () => {
    assertUniqueIds(
      MYSTERY_CASES.map((c) => c.id),
      "MYSTERY_CASES",
    );
    for (const c of MYSTERY_CASES) {
      expect(isFourDigitCode(c.correctCode), c.id).toBe(true);
      assertNonEmptyString(c.title, c.id);
      assertNonEmptyString(c.background, c.id);
      expect(c.clues.length).toBeGreaterThanOrEqual(4);
      assertUniqueIds(
        c.clues.map((cl) => cl.id),
        `${c.id}.clues`,
      );
      for (const cl of c.clues) {
        assertNonEmptyString(cl.title, cl.id);
        assertNonEmptyString(cl.content, cl.id);
        // Clues must not paste the full code (forces collaboration).
        expect(cl.content.includes(c.correctCode), `${c.id}/${cl.id} leaks code`).toBe(false);
      }
    }
  });
});
