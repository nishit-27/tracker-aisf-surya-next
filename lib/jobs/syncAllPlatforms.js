import { connectToDatabase } from "@/lib/mongodb";
import { fetchPlatformData, supportedPlatforms } from "@/lib/platforms";
import { upsertPlatformData } from "@/lib/services/syncService";

export async function syncAllPlatforms({ userId = null } = {}) {
  await connectToDatabase();

  const results = [];

  for (const platform of supportedPlatforms) {
    try {
      const providerData = await fetchPlatformData(platform);
      const { platformAccount, mediaIds } = await upsertPlatformData({
        userId,
        platform,
        account: providerData.account,
        media: providerData.media,
      });

      results.push({
        platform,
        accountId: platformAccount.accountId,
        mediaCount: mediaIds.length,
        syncedAt: new Date(),
      });
    } catch (error) {
      results.push({ platform, error: error.message });
    }
  }

  return results;
}
