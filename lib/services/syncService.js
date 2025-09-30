import PlatformAccount from "../models/PlatformAccount";
import MediaItem from "../models/MediaItem";

function calculateEngagementRate({ views = 0, likes = 0, comments = 0, shares = 0, saves = 0 }) {
  if (!views || views === 0) {
    return 0;
  }

  const totalInteractions = likes + comments + shares + saves;
  return Number(((totalInteractions / views) * 100).toFixed(2));
}

export async function upsertPlatformData({ userId, platform, account, media }) {
  let engagementRate = account?.stats?.engagementRate;

  if (engagementRate === undefined) {
    engagementRate = calculateEngagementRate(account?.stats ?? {});
  }

  const accountHistoryEntry = {
    date: account?.lastSyncedAt || new Date(),
    followers: account?.stats?.followers ?? 0,
    totalViews: account?.stats?.totalViews ?? 0,
    totalLikes: account?.stats?.totalLikes ?? 0,
    totalComments: account?.stats?.totalComments ?? 0,
    totalShares: account?.stats?.totalShares ?? 0,
    totalImpressions: account?.stats?.totalImpressions ?? 0,
    engagementRate,
  };

  const accountFilter = {
    platform,
    accountId: account?.accountId,
  };

  const accountUpdate = {
    $set: {
      user: userId,
      username: account?.username,
      displayName: account?.displayName,
      profileUrl: account?.profileUrl,
      stats: {
        ...(account?.stats ?? {}),
        engagementRate,
      },
      lastSyncedAt: account?.lastSyncedAt || new Date(),
      metadata: account?.metadata ?? {},
    },
    $push: {
      history: accountHistoryEntry,
    },
  };

  const platformAccount = await PlatformAccount.findOneAndUpdate(accountFilter, accountUpdate, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });

  const upsertedMediaIds = [];

  for (const item of media ?? []) {
    const metrics = item.metrics ?? {};
    const computedEngagementRate =
      metrics.engagementRate ?? calculateEngagementRate({ ...metrics });

    const mediaHistoryEntry = {
      date: account?.lastSyncedAt || new Date(),
      views: metrics.views ?? 0,
      likes: metrics.likes ?? 0,
      comments: metrics.comments ?? 0,
      shares: metrics.shares ?? 0,
      saves: metrics.saves ?? 0,
      impressions: metrics.impressions ?? 0,
      engagementRate: computedEngagementRate,
    };

    const mediaFilter = {
      account: platformAccount._id,
      externalId: item.externalId,
    };

    const mediaUpdate = {
      $set: {
        platform,
        title: item.title,
        caption: item.caption,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl,
        publishedAt: item.publishedAt,
        metrics: {
          ...metrics,
          engagementRate: computedEngagementRate,
        },
        tags: item.tags ?? [],
        metadata: item.metadata ?? {},
      },
      $push: {
        history: mediaHistoryEntry,
      },
    };

    const mediaDoc = await MediaItem.findOneAndUpdate(mediaFilter, mediaUpdate, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    upsertedMediaIds.push(mediaDoc._id);
  }

  return { platformAccount, mediaIds: upsertedMediaIds };
}

export function buildOverviewMetrics(accounts = [], mediaItems = []) {
  const overview = {
    totalFollowers: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalImpressions: 0,
    averageEngagementRate: 0,
    platformBreakdown: {},
  };

  if (!accounts.length) {
    return overview;
  }

  for (const account of accounts) {
    const stats = account.stats ?? {};
    const platform = account.platform;

    overview.totalFollowers += stats.followers ?? 0;
    overview.totalViews += stats.totalViews ?? 0;
    overview.totalLikes += stats.totalLikes ?? 0;
    overview.totalComments += stats.totalComments ?? 0;
    overview.totalShares += stats.totalShares ?? 0;
    overview.totalImpressions += stats.totalImpressions ?? 0;

    if (!overview.platformBreakdown[platform]) {
      overview.platformBreakdown[platform] = {
        followers: 0,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        impressions: 0,
        engagementRate: 0,
        mediaCount: 0,
      };
    }

    const platformEntry = overview.platformBreakdown[platform];
    platformEntry.followers += stats.followers ?? 0;
    platformEntry.views += stats.totalViews ?? 0;
    platformEntry.likes += stats.totalLikes ?? 0;
    platformEntry.comments += stats.totalComments ?? 0;
    platformEntry.shares += stats.totalShares ?? 0;
    platformEntry.impressions += stats.totalImpressions ?? 0;
    platformEntry.engagementRate += stats.engagementRate ?? 0;
    platformEntry.mediaCount += 0;
  }

  const mediaGroupByPlatform = mediaItems.reduce((acc, item) => {
    const platform = item.platform;
    if (!acc[platform]) {
      acc[platform] = [];
    }
    acc[platform].push(item);
    return acc;
  }, {});

  const platformKeys = Object.keys(overview.platformBreakdown);

  if (platformKeys.length) {
    overview.averageEngagementRate = Number(
      (
        platformKeys.reduce((sum, key) => {
          const platformEntry = overview.platformBreakdown[key];
          return sum + (platformEntry.engagementRate || 0);
        }, 0) / platformKeys.length
      ).toFixed(2)
    );
  }

  for (const platformKey of platformKeys) {
    const breakdownEntry = overview.platformBreakdown[platformKey];
    const items = mediaGroupByPlatform[platformKey] ?? [];
    breakdownEntry.mediaCount = items.length;
    if (items.length) {
      const totalRate = items.reduce(
        (sum, item) => sum + (item.metrics?.engagementRate ?? 0),
        0
      );
      breakdownEntry.engagementRate = Number(
        (totalRate / items.length).toFixed(2)
      );
    } else {
      breakdownEntry.engagementRate = Number(
        (breakdownEntry.engagementRate || 0).toFixed(2)
      );
    }
  }

  return overview;
}
