import { Easing } from "remotion";

export const filmTheme = {
  colors: {
    background: "#0b100e",
    foreground: "#f3efe6",
    lime: "#b7cf61",
    blue: "#93a6ff",
    copper: "#ef9877",
    vignette: "#00000024",
  },
  fonts: {
    display: '"Instrument Motion", Arial, sans-serif',
    label: "monospace",
  },
  easing: Easing.bezier(0.16, 1, 0.3, 1),
  spring: { damping: 18, stiffness: 120, mass: 0.8 },
} as const;
