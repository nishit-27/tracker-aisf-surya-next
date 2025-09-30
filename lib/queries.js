import { connectToDatabase } from "@/lib/mongodb";
import PlatformAccount from "@/lib/models/PlatformAccount";
import MediaItem from "@/lib/models/MediaItem";
import { buildOverviewMetrics } from "@/lib/services/syncService";
import { fetchPlatformData, supportedPlatforms } from "@/lib/platforms";

export async function getOverviewAnalytics({ platform, dateRange } = {}) {
  let useMockData = false;

  try {
    await connectToDatabase();
  } catch (error) {
    console.warn("[analytics] Falling back to mock data:", error.message);
    useMockData = true;
  }

  if (useMockData) {
    const platformsToLoad = platform ? [platform] : supportedPlatforms;
    const accounts = [];
    const media = [];

    for (const platformKey of platformsToLoad) {
      const { account, media: mediaItems } = await fetchPlatformData(platformKey);

      const accountHistoryEntry = {
        date: account.lastSyncedAt ?? new Date(),
        followers: account.stats?.followers ?? 0,
        totalViews: account.stats?.totalViews ?? 0,
        totalLikes: account.stats?.totalLikes ?? 0,
        totalComments: account.stats?.totalComments ?? 0,
        totalShares: account.stats?.totalShares ?? 0,
        totalImpressions: account.stats?.totalImpressions ?? 0,
        engagementRate: account.stats?.engagementRate ?? 0,
      };

      accounts.push({
        ...account,
        _id: `mock-account-${platformKey}`,
        platform: platformKey,
        history: [accountHistoryEntry],
        createdAt: account.lastSyncedAt ?? new Date(),
        updatedAt: account.lastSyncedAt ?? new Date(),
      });

      for (const item of mediaItems) {
        media.push({
          ...item,
          _id: `mock-media-${item.externalId}`,
          platform: platformKey,
          account: `mock-account-${platformKey}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    const overview = buildOverviewMetrics(accounts, media);
    return { overview, accounts, media };
  }

  const accountQuery = {};
  if (platform) {
    accountQuery.platform = platform;
  }

  const accounts = await PlatformAccount.find(accountQuery)
    .sort({ updatedAt: -1 })
    .lean();

  const mediaQuery = {};
  if (platform) {
    mediaQuery.platform = platform;
  }

  if (dateRange?.start || dateRange?.end) {
    mediaQuery.publishedAt = {};
    if (dateRange?.start) {
      mediaQuery.publishedAt.$gte = dateRange.start;
    }
    if (dateRange?.end) {
      mediaQuery.publishedAt.$lte = dateRange.end;
    }
  }

  const media = await MediaItem.find(mediaQuery)
    .sort({ publishedAt: -1 })
    .lean();

  const overview = buildOverviewMetrics(accounts, media);

  return { overview, accounts, media };
}
