import { ImageResponse } from "next/og";

/** ホーム画面用（favicon と同じ LV マーク） */
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
          background: "#D97757",
          color: "#ffffff",
          fontSize: 78,
          fontWeight: 700,
          fontFamily:
            'ui-sans-serif, system-ui, "Segoe UI", Roboto, "Noto Sans JP", sans-serif',
          letterSpacing: "-0.02em",
          borderRadius: 40,
        }}
      >
        LV
      </div>
    ),
    { ...size },
  );
}
