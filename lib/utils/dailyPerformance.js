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

function normaliseDateKey(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const normalised = value.includes("T") ? value : `${value}T00:00:00.000Z`;
    const parsed = new Date(normalised);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.toISOString().split("T")[0];
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return value.toISOString().split("T")[0];
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().split("T")[0];
}

function calculateMedian(values = []) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) {
    return null;
  }

  const sorted = filtered.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }

  const lower = sorted[mid - 1];
  const upper = sorted[mid];
  return Number(((lower + upper) / 2).toFixed(2));
}

export function buildRollingMedianSeries(mediaItems = [], referenceDates = []) {
  if (!Array.isArray(mediaItems) || !mediaItems.length) {
    return [];
  }

  const chronologicallySorted = mediaItems
    .filter((item) => item?.publishedAt)
    .map((item) => {
      const publishedAt = new Date(item.publishedAt);
      if (Number.isNaN(publishedAt.getTime())) {
        return null;
      }
      return {
        date: publishedAt,
        dateKey: publishedAt.toISOString().split("T")[0],
        views: toInt(item?.metrics?.views, 0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date - b.date);

  if (!chronologicallySorted.length) {
    return [];
  }

  const dateKeySet = new Set();

  (referenceDates || []).forEach((value) => {
    const key = normaliseDateKey(value);
    if (key) {
      dateKeySet.add(key);
    }
  });

  chronologicallySorted.forEach((entry) => {
    dateKeySet.add(entry.dateKey);
  });

  if (chronologicallySorted.length) {
    const firstKey = chronologicallySorted[0].dateKey;
    const lastKey = chronologicallySorted[chronologicallySorted.length - 1].dateKey;

    if (firstKey && lastKey) {
      const cursor = new Date(`${firstKey}T00:00:00.000Z`);
      const end = new Date(`${lastKey}T00:00:00.000Z`);

      while (cursor <= end) {
        dateKeySet.add(cursor.toISOString().split("T")[0]);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }
  }

  const sortedDateKeys = Array.from(dateKeySet)
    .filter(Boolean)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const rollingWindow = [];
  let pointer = 0;

  const series = sortedDateKeys
    .map((dateKey) => {
      while (
        pointer < chronologicallySorted.length &&
        chronologicallySorted[pointer].dateKey <= dateKey
      ) {
        rollingWindow.push(chronologicallySorted[pointer]);
        pointer += 1;
      }

      if (!rollingWindow.length) {
        return null;
      }

      const recentEntries = rollingWindow.slice(-10);
      const median = calculateMedian(recentEntries.map((entry) => entry.views));

      return {
        date: dateKey,
        medianViews: median,
        sampleSize: recentEntries.length,
      };
    })
    .filter((entry) => entry && entry.sampleSize > 0 && entry.medianViews !== null);

  return series;
}

export default buildDailyPerformance;
