function toInt(value, fallback = 0) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildPostEntry(item = {}) {
  const metrics = {
    views: toInt(item?.metrics?.views),
    likes: toInt(item?.metrics?.likes),
    comments: toInt(item?.metrics?.comments),
    shares: toInt(item?.metrics?.shares),
    saves: toInt(item?.metrics?.saves),
    engagementRate: Number.isFinite(item?.metrics?.engagementRate)
      ? Number(item.metrics.engagementRate)
      : 0,
  };

  return {
    id: item?._id || item?.externalId || null,
    externalId: item?.externalId || null,
    title: item?.title || "",
    url: item?.url || null,
    thumbnailUrl: item?.thumbnailUrl || null,
    publishedAt: item?.publishedAt || null,
    metrics,
    raw: item,
  };
}

function summariseDay(entry) {
  const totals = {
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    engagementRateTotal: 0,
  };

  for (const post of entry.posts) {
    totals.views += post.metrics.views;
    totals.likes += post.metrics.likes;
    totals.comments += post.metrics.comments;
    totals.shares += post.metrics.shares;
    totals.saves += post.metrics.saves;
    totals.engagementRateTotal += post.metrics.engagementRate;
  }

  const sortedPosts = entry.posts
    .slice()
    .sort((a, b) => b.metrics.views - a.metrics.views)
    .map((post, index) => {
      const share = totals.views
        ? Number(((post.metrics.views / totals.views) * 100).toFixed(2))
        : 0;

      return {
        ...post,
        rank: index + 1,
        viewShare: share,
      };
    });

  const averageEngagement = sortedPosts.length
    ? Number((totals.engagementRateTotal / sortedPosts.length).toFixed(2))
    : 0;

  return {
    date: entry.date,
    posts: sortedPosts,
    totals: {
      views: totals.views,
      likes: totals.likes,
      comments: totals.comments,
      shares: totals.shares,
      saves: totals.saves,
      averageEngagement,
      postCount: sortedPosts.length,
    },
    topPost: sortedPosts[0] || null,
  };
}

export function buildDailyPerformance(mediaItems = []) {
  if (!Array.isArray(mediaItems) || mediaItems.length === 0) {
    return { groups: [], trendSeries: [] };
  }

  const groupsByDate = new Map();

  for (const item of mediaItems) {
    if (!item?.publishedAt) {
      continue;
    }

    const parsedDate = new Date(item.publishedAt);
    if (Number.isNaN(parsedDate.getTime())) {
      continue;
    }

    const dateKey = parsedDate.toISOString().split("T")[0];
    if (!groupsByDate.has(dateKey)) {
      groupsByDate.set(dateKey, {
        date: dateKey,
        posts: [],
      });
    }

    const entry = groupsByDate.get(dateKey);
    entry.posts.push(buildPostEntry(item));
  }

  if (!groupsByDate.size) {
    return { groups: [], trendSeries: [] };
  }

  const groupsDescending = Array.from(groupsByDate.values())
    .map(summariseDay)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const chronological = groupsDescending.slice().reverse();

  const trendSeries = chronological.map((group, index) => {
    const previous = index > 0 ? chronological[index - 1] : null;
    const viewsDelta = previous ? group.totals.views - previous.totals.views : null;
    const viewsDeltaPct =
      previous && previous.totals.views
        ? Number(((viewsDelta / previous.totals.views) * 100).toFixed(2))
        : null;

    return {
      date: group.date,
      views: group.totals.views,
      likes: group.totals.likes,
      comments: group.totals.comments,
      shares: group.totals.shares,
      saves: group.totals.saves,
      postCount: group.totals.postCount,
      topDriverTitle: group.topPost?.title || group.topPost?.externalId || null,
      topDriverViews: group.topPost?.metrics?.views || 0,
      topDriverShare: group.topPost?.viewShare || 0,
      topDriverUrl: group.topPost?.url || null,
      viewsDelta,
      viewsDeltaPct,
    };
  });

  return { groups: groupsDescending, trendSeries };
}

export default buildDailyPerformance;
