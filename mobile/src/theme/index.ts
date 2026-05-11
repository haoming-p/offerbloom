// Mobile theme constants. Kept loose (plain objects, not a Theme provider)
// so screens can just import what they need without context overhead.

export const colors = {
  // Brand
  orange: "#E8640A",
  orangeLight: "#FFF4EC",
  orangeBorder: "#FFD9BD",

  // Neutrals
  text: "#1F2937",         // gray-800
  textMuted: "#6B7280",    // gray-500
  textFaint: "#9CA3AF",    // gray-400
  textGhost: "#D1D5DB",    // gray-300

  bg: "#FFFFFF",
  bgMuted: "#F9FAFB",      // gray-50
  bgAlt: "#F3F4F6",        // gray-100

  border: "#E5E7EB",       // gray-200
  borderSoft: "#F3F4F6",   // gray-100

  // Semantic
  danger: "#EF4444",       // red-500
  success: "#10B981",      // green-500
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 28,
};

export const fontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};
