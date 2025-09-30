import { fetchInstagramData, fetchInstagramProfile } from "./instagram";
import { fetchTikTokData } from "./tiktok";
import { fetchYouTubeData } from "./youtube";

const providers = {
  instagram: fetchInstagramData,
  tiktok: fetchTikTokData,
  youtube: fetchYouTubeData,
};

export async function fetchPlatformData(platform, options) {
  const fetcher = providers[platform];

  if (!fetcher) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  return fetcher(options);
}

// Export individual platform functions for direct use
export { fetchInstagramProfile };

export const supportedPlatforms = Object.keys(providers);
