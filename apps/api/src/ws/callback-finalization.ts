import { logger } from "../lib/logger.js";

export type CallbackFinalizationOptions = {
  /** Gemini を閉じ、クロージング音声の再生待ちを開始する */
  onBeginClosing: () => void;
  /** 通話を終了する（finalize + ws close 等） */
  onEndCall: () => void;
  /** クロージング音声の再生待ち ms */
  postCloseMs?: number;
  /** フォールバック ms */
  fallbackMs?: number;
};

/**
 * register_callback 後の通話終了を調整する。
 * - toolCall と turnComplete の到着順・非同期 dispatch のレースを吸収する
 * - turnComplete 前に dispatch が完了した場合 / 後に完了した場合の両方に対応
 */
export function createCallbackFinalizationCoordinator(
  options: CallbackFinalizationOptions,
) {
  const postCloseMs = options.postCloseMs ?? 2500;
  const fallbackMs = options.fallbackMs ?? 15_000;

  let pendingClose = false;
  let closing = false;
  let turnCompleteAwaitingDispatch = false;
  let postCloseTimer: ReturnType<typeof setTimeout> | null = null;
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  let inFlightRegister: Promise<boolean> | null = null;

  function clearPostCloseTimer(): void {
    if (postCloseTimer) {
      clearTimeout(postCloseTimer);
      postCloseTimer = null;
    }
  }

  function clearFallbackTimer(): void {
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
  }

  function scheduleEndCall(): void {
    clearPostCloseTimer();
    postCloseTimer = setTimeout(() => {
      postCloseTimer = null;
      closing = false;
      pendingClose = false;
      turnCompleteAwaitingDispatch = false;
      options.onEndCall();
    }, postCloseMs);
  }

  function armFallback(): void {
    if (fallbackTimer) return;
    fallbackTimer = setTimeout(() => {
      fallbackTimer = null;
      if (!closing && (pendingClose || turnCompleteAwaitingDispatch)) {
        logger.warn(
          "callback finalization fallback: forcing call end after register_callback",
        );
        clearPostCloseTimer();
        closing = false;
        pendingClose = false;
        turnCompleteAwaitingDispatch = false;
        options.onEndCall();
      }
    }, fallbackMs);
  }

  function beginClosing(): void {
    if (closing) return;
    closing = true;
    pendingClose = false;
    turnCompleteAwaitingDispatch = false;
    options.onBeginClosing();
    scheduleEndCall();
  }

  function trackRegisterCallbackDispatch(
    promise: Promise<{ status?: string; error?: string }>,
  ): void {
    const tracked = promise.then((result) => {
      if (result.status === "registered") return true;
      if (result.error) {
        logger.error(
          { error: result.error },
          "register_callback dispatch failed",
        );
      }
      return false;
    });

    inFlightRegister = tracked;
    void tracked.finally(() => {
      if (inFlightRegister === tracked) {
        inFlightRegister = null;
      }
    });
  }

  function onRegisterCallbackSucceeded(): void {
    pendingClose = true;
    armFallback();
    if (turnCompleteAwaitingDispatch) {
      beginClosing();
    }
  }

  async function onTurnComplete(): Promise<void> {
    if (inFlightRegister) {
      const registered = await inFlightRegister;
      if (registered) {
        pendingClose = true;
      }
    }

    if (pendingClose) {
      beginClosing();
      return;
    }

    if (inFlightRegister) {
      turnCompleteAwaitingDispatch = true;
      armFallback();
      const registered = await inFlightRegister;
      if (registered) {
        beginClosing();
      } else {
        turnCompleteAwaitingDispatch = false;
      }
    }
  }

  function shouldSkipOnClose(): boolean {
    return closing;
  }

  function warnIfInterrupted(context: string): void {
    if (
      pendingClose ||
      closing ||
      turnCompleteAwaitingDispatch ||
      inFlightRegister
    ) {
      logger.warn(
        { context, pendingClose, closing, turnCompleteAwaitingDispatch },
        "call ended while register_callback finalization was in progress",
      );
    }
  }

  function reset(): void {
    clearPostCloseTimer();
    clearFallbackTimer();
    pendingClose = false;
    closing = false;
    turnCompleteAwaitingDispatch = false;
    inFlightRegister = null;
  }

  return {
    trackRegisterCallbackDispatch,
    onRegisterCallbackSucceeded,
    onTurnComplete,
    shouldSkipOnClose,
    warnIfInterrupted,
    reset,
  };
}
