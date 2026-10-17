// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PLAY_MODES } from "@/constants/playModes";
import { PlayModePicker } from "./PlayModePicker";

afterEach(cleanup);

describe("PlayModePicker", () => {
  it("offers the three time boxes as a labelled radio group", () => {
    render(<PlayModePicker value="standard" onChange={() => {}} />);
    expect(screen.getByRole("radiogroup", { name: "時段長度" })).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    for (const mode of PLAY_MODES) {
      expect(screen.getByRole("radio", { name: new RegExp(mode.label) })).toHaveProperty(
        "ariaChecked",
        mode.id === "standard" ? "true" : "false",
      );
    }
  });

  it("selects on click", () => {
    const onChange = vi.fn();
    render(<PlayModePicker value="standard" onChange={onChange} />);
    screen.getByRole("radio", { name: /10分鐘最久/ }).click();
    expect(onChange).toHaveBeenCalledWith(PLAY_MODES[2]);
  });

  it("moves the selection with the arrow keys", () => {
    const onChange = vi.fn();
    render(<PlayModePicker value="flash" onChange={onChange} />);
    screen.getByRole("radio", { name: /3分鐘快閃/ }).dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    expect(onChange).toHaveBeenCalledWith(PLAY_MODES[1]);
  });
});
