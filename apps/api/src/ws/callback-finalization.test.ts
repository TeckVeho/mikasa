import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createCallbackFinalizationCoordinator } from "./callback-finalization.js";

describe("createCallbackFinalizationCoordinator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("turnComplete が dispatch 完了後ならクロージングを開始する", async () => {
    const onBeginClosing = vi.fn();
    const onEndCall = vi.fn();
    const coordinator = createCallbackFinalizationCoordinator({
      onBeginClosing,
      onEndCall,
      postCloseMs: 100,
    });

    let resolveDispatch!: (value: { status?: string }) => void;
    const dispatchPromise = new Promise<{ status?: string }>((resolve) => {
      resolveDispatch = resolve;
    });

    coordinator.trackRegisterCallbackDispatch(dispatchPromise);
    resolveDispatch({ status: "registered" });
    coordinator.onRegisterCallbackSucceeded();

    await coordinator.onTurnComplete();

    expect(onBeginClosing).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(onEndCall).toHaveBeenCalledTimes(1);
  });

  it("turnComplete が dispatch 完了前でも await 後にクロージングを開始する", async () => {
    const onBeginClosing = vi.fn();
    const onEndCall = vi.fn();
    const coordinator = createCallbackFinalizationCoordinator({
      onBeginClosing,
      onEndCall,
      postCloseMs: 100,
    });

    let resolveDispatch!: (value: { status?: string }) => void;
    const dispatchPromise = new Promise<{ status?: string }>((resolve) => {
      resolveDispatch = resolve;
    });

    coordinator.trackRegisterCallbackDispatch(dispatchPromise);

    const turnCompletePromise = coordinator.onTurnComplete();
    expect(onBeginClosing).not.toHaveBeenCalled();

    resolveDispatch({ status: "registered" });
    coordinator.onRegisterCallbackSucceeded();
    await turnCompletePromise;

    expect(onBeginClosing).toHaveBeenCalledTimes(1);
  });

  it("dispatch 失敗時はクロージングを開始しない", async () => {
    const onBeginClosing = vi.fn();
    const coordinator = createCallbackFinalizationCoordinator({
      onBeginClosing,
      onEndCall: vi.fn(),
    });

    coordinator.trackRegisterCallbackDispatch(
      Promise.resolve({ status: "error", error: "db failed" }),
    );

    await coordinator.onTurnComplete();

    expect(onBeginClosing).not.toHaveBeenCalled();
  });

  it("closing 中は onClose をスキップする", async () => {
    const coordinator = createCallbackFinalizationCoordinator({
      onBeginClosing: vi.fn(),
      onEndCall: vi.fn(),
    });

    coordinator.trackRegisterCallbackDispatch(
      Promise.resolve({ status: "registered" }),
    );
    coordinator.onRegisterCallbackSucceeded();
    await coordinator.onTurnComplete();

    expect(coordinator.shouldSkipOnClose()).toBe(true);
  });
});
