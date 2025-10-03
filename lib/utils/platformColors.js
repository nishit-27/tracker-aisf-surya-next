const platformColors = {
  instagram: "#ec4899",
  tiktok: "#3b82f6",
  youtube: "#ef4444",
  facebook: "#1877F2",
  twitter: "#1DA1F2",
  linkedin: "#0077B5",
};

const fallbackPalette = [
  "#38bdf8",
  "#f472b6",
  "#facc15",
  "#34d399",
  "#c084fc",
  "#f97316",
  "#a855f7",
  "#10b981",
];

export function getPlatformColor(platform, index = 0) {
  const key = typeof platform === "string" ? platform.toLowerCase() : platform;

  if (key && platformColors[key]) {
    return platformColors[key];
  }
  return fallbackPalette[index % fallbackPalette.length];
}

export { platformColors, fallbackPalette };
