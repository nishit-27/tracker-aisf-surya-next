import { Globe2 } from "lucide-react";

const platformThemes = {
  all: {
    icon: Globe2,
    accent: "text-sky-300",
    filterIdle: "text-slate-400 hover:text-slate-200",
    filterActive: "bg-sky-500/20 text-sky-300",
    badgeWrapper: "bg-white/5",
    badgeIcon: "text-white",
    overlayWrapper: "bg-black/70",
    overlayIcon: "text-white",
    chipIdle: "border-white/10 bg-white/5 text-slate-300 hover:border-white/20",
    chipActive: "border-sky-400/60 bg-sky-400/10 text-white",
    logo: "/globe.svg",
  },
  instagram: {
    icon: Globe2, // Keep icon for backward compatibility
    accent: "text-[#E4405F]",
    filterIdle: "text-[#E4405F] hover:text-[#E4405F]/80",
    filterActive:
      "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)]",
    badgeWrapper: "bg-[#F58529]/15",
    badgeIcon: "text-[#E4405F]",
    overlayWrapper: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
    overlayIcon: "text-white",
    chipIdle: "border-white/10 bg-white/5 text-slate-300 hover:border-white/20",
    chipActive: "border-[#E4405F]/60 bg-[#E4405F]/15 text-white",
    logo: "/instagram-svgrepo-com.svg",
  },
  youtube: {
    icon: Globe2, // Keep icon for backward compatibility
    accent: "text-[#FF0000]",
    filterIdle: "text-[#FF0000] hover:text-[#FF4D4D]",
    filterActive:
      "bg-gradient-to-br from-[#FF4D4D] to-[#FF0000] text-white shadow-[0_0_0_1px_rgba(255,0,0,0.18)]",
    badgeWrapper: "bg-[#FF0000]/15",
    badgeIcon: "text-[#FF1A1A]",
    overlayWrapper: "bg-gradient-to-br from-[#FF4D4D] to-[#FF0000]",
    overlayIcon: "text-white",
    chipIdle: "border-white/10 bg-white/5 text-slate-300 hover:border-white/20",
    chipActive: "border-[#FF0000]/60 bg-[#FF0000]/15 text-white",
    logo: "/youtube-svgrepo-com.svg",
  },
  tiktok: {
    icon: Globe2, // Keep icon for backward compatibility
    accent: "text-[#25F4EE]",
    filterIdle: "text-[#25F4EE] hover:text-[#25F4EE]/80",
    filterActive:
      "bg-gradient-to-br from-[#25F4EE] to-[#FE2C55] text-white shadow-[0_0_0_1px_rgba(37,244,238,0.18)]",
    badgeWrapper: "bg-[#25F4EE]/15",
    badgeIcon: "text-[#25F4EE]",
    overlayWrapper: "bg-gradient-to-br from-[#25F4EE] to-[#FE2C55]",
    overlayIcon: "text-white",
    chipIdle: "border-white/10 bg-white/5 text-slate-300 hover:border-white/20",
    chipActive: "border-[#25F4EE]/60 bg-[#25F4EE]/15 text-white",
    logo: "/tiktok-logo-logo-svgrepo-com.svg",
  },
};

export function getPlatformTheme(platform) {
  return platformThemes[platform] ?? platformThemes.all;
}

export default platformThemes;
