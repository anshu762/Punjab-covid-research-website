import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 18,
          background: "#0B1F3A",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#FFFFFF",
          borderRadius: 7,
          fontWeight: 800,
          border: "1.5px solid #2563EB",
        }}
      >
        E
      </div>
    ),
    {
      ...size,
    }
  );
}
