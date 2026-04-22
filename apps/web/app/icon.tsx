import { ImageResponse } from "next/og";

/** サイドバー・ログインと同じ LV マーク（primary #D97757） */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 14,
          fontWeight: 700,
          fontFamily:
            'ui-sans-serif, system-ui, "Segoe UI", Roboto, "Noto Sans JP", sans-serif',
          letterSpacing: "-0.02em",
          borderRadius: 8,
        }}
      >
        LV
      </div>
    ),
    { ...size },
  );
}
