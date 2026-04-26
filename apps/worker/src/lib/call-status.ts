export type CallStatus = "complete" | "transferred" | "abandoned" | "error";

export interface StatusDisplay {
  label: string;
  color: string;
  emoji: string;
  needsFollowUp: boolean;
}

const SHORT_CALL_THRESHOLD_SECONDS = 15;

export function getStatusDisplay(
  status: string,
  durationSeconds: number | null,
): StatusDisplay {
  switch (status) {
    case "complete":
      if (
        durationSeconds !== null &&
        durationSeconds < SHORT_CALL_THRESHOLD_SECONDS
      ) {
        return {
          label: "短時間切断",
          color: "#dc3545",
          emoji: "\u{1F534}",
          needsFollowUp: true,
        };
      }
      return {
        label: "通話完了",
        color: "#28a745",
        emoji: "\u{1F7E2}",
        needsFollowUp: false,
      };

    case "transferred":
      return {
        label: "転送済み",
        color: "#f0ad4e",
        emoji: "\u{1F7E1}",
        needsFollowUp: false,
      };

    case "abandoned":
      return {
        label: "途中切断",
        color: "#dc3545",
        emoji: "\u{1F534}",
        needsFollowUp: true,
      };

    case "error":
      return {
        label: "エラー終了",
        color: "#6c757d",
        emoji: "\u26AB",
        needsFollowUp: true,
      };

    default:
      return {
        label: status,
        color: "#6c757d",
        emoji: "\u26AA",
        needsFollowUp: false,
      };
  }
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}秒`;
  return `${m}分${s}秒`;
}
