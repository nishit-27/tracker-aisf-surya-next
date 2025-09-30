const platformHostMap = [
  { platform: "instagram", hosts: ["instagram.com", "www.instagram.com"] },
  { platform: "tiktok", hosts: ["tiktok.com", "www.tiktok.com"] },
  { platform: "youtube", hosts: ["youtube.com", "www.youtube.com", "youtu.be"] },
];

export function detectPlatformFromUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    for (const entry of platformHostMap) {
      if (entry.hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
        return entry.platform;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}
