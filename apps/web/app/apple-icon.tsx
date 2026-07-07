import { ImageResponse } from "next/og";

/** ホーム画面用（favicon と同じ M マーク） */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#5E6AD2",
          color: "#ffffff",
          fontSize: 68,
          fontWeight: 700,
          fontFamily:
            'ui-sans-serif, system-ui, "Segoe UI", Roboto, "Noto Sans JP", sans-serif',
          letterSpacing: "-0.02em",
          borderRadius: 28,
        }}
      >
        M
      </div>
    ),
    { ...size },
  );
}
