
import React from "react";

export const HorizontalReorderIndicator: React.FC<{ direction: "left" | "right" }> = ({ direction }) => {
  return (
    <div
      className={`absolute ${
        direction === "left" ? "left-0" : "right-0"
      } top-0 h-full w-2 bg-blue-200 opacity-80 rounded ${direction === "left" ? "rounded-l" : "rounded-r"} z-40`}
      style={{ pointerEvents: "none" }}
    />
  );
};
