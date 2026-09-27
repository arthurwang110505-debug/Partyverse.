/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSubmitAction } from "./useSubmitAction";

const submitAction = vi.fn();
const toast = vi.fn();

vi.mock("@/providers/RoomContext", () => ({
  useRoom: () => ({ submitAction }),
}));

vi.mock("@/providers/ToastProvider", () => ({
  useToast: () => ({ toast }),
}));

describe("useSubmitAction", () => {
  beforeEach(() => {
    submitAction.mockReset();
    toast.mockReset();
  });

  it("returns true and does not toast on success", async () => {
    submitAction.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSubmitAction());
    let ok = false;
    await act(async () => {
      ok = await result.current({ type: "vote" });
    });
    expect(ok).toBe(true);
    expect(toast).not.toHaveBeenCalled();
  });

  it("toasts the error message and returns false on failure", async () => {
    submitAction.mockRejectedValue(new Error("房間已結束"));
    const { result } = renderHook(() => useSubmitAction());
    let ok = true;
    await act(async () => {
      ok = await result.current({ type: "vote" });
    });
    expect(ok).toBe(false);
    expect(toast).toHaveBeenCalledWith("房間已結束");
  });

  it("falls back to failMessage when the error has no text", async () => {
    submitAction.mockRejectedValue(new Error("   "));
    const { result } = renderHook(() => useSubmitAction());
    await act(async () => {
      await result.current({ type: "sit" }, { failMessage: "坐下失敗，請再試一次" });
    });
    expect(toast).toHaveBeenCalledWith("坐下失敗，請再試一次");
  });

  it("throttles repeated failure toasts", async () => {
    submitAction.mockRejectedValue(new Error("連線中斷"));
    const { result } = renderHook(() => useSubmitAction());
    await act(async () => {
      await result.current({ type: "whack" }, { throttleMs: 5000 });
      await result.current({ type: "whack" }, { throttleMs: 5000 });
      await result.current({ type: "whack" }, { throttleMs: 5000 });
    });
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it("respects silent option", async () => {
    submitAction.mockRejectedValue(new Error("x"));
    const { result } = renderHook(() => useSubmitAction());
    await act(async () => {
      await result.current({ type: "taps", count: 3 }, { silent: true });
    });
    expect(toast).not.toHaveBeenCalled();
  });
});
