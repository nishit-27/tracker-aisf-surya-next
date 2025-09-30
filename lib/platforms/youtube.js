import axios from "axios";

const API_BASE_URL = "https://youtube.googleapis.com/youtube/v3";
const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_MAX_ITEMS = 120;

function getYouTubeApiKey() {
  return process.env.YOUTUBE_API_KEY;
}

let client;

function getYouTubeClient() {
  if (!client) {
    client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
    });
  }

  return client;
}

function toInt(value, fallback = 0) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function iso8601ToSeconds(duration) {
  if (!duration || typeof duration !== "string") {
    return 0;
  }

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) {
    return 0;
  }

  const hours = Number.parseInt(match[1] || "0", 10);
  const minutes = Number.parseInt(match[2] || "0", 10);
  const seconds = Number.parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}

function calculateEngagementRate({ views = 0, likes = 0, comments = 0, shares = 0 }) {
  if (!views) {
    return 0;
  }

  const interactions = likes + comments + shares;
  return Number(((interactions / views) * 100).toFixed(2));
}

async function youtubeApiGet(endpoint, params, { signal, trackQuota, units = 1 } = {}) {
  const apiKey = getYouTubeApiKey();

  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is required to query the YouTube Data API.");
  }

  if (typeof trackQuota === "function") {
    trackQuota(units);
  }

  const api = getYouTubeClient();
  const response = await api.get(endpoint, {
    params: {
      key: apiKey,
      ...params,
    },
    signal,
  });

  return response?.data ?? null;
}

function buildProfileUrl({ handle, channelId, customUrl, sourceUrl }) {
  if (sourceUrl) {
    return sourceUrl;
  }

  if (handle) {
    return `https://www.youtube.com/${handle.startsWith("@") ? handle : `@${handle}`}`;
  }

  if (customUrl) {
    return `https://www.youtube.com/${customUrl}`;
  }

  if (channelId) {
    return `https://www.youtube.com/channel/${channelId}`;
  }

  return null;
}

function summariseMediaMetrics(items) {
  return items.reduce(
    (acc, item) => {
      const metrics = item.metrics ?? {};
      acc.views += metrics.views ?? 0;
      acc.likes += metrics.likes ?? 0;
      acc.comments += metrics.comments ?? 0;
      acc.shares += metrics.shares ?? 0;
      acc.saves += metrics.saves ?? 0;
      acc.impressions += metrics.impressions ?? 0;
      return acc;
    },
    {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      impressions: 0,
    }
  );
}

function pickThumbnail(snippet) {
  const thumbnails = snippet?.thumbnails ?? {};
  return (
    thumbnails.maxres?.url ||
    thumbnails.standard?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    null
  );
}

function mapVideoToMediaItem(video, playlistItem) {
  const videoId = video?.id;
  const snippet = video?.snippet ?? {};
  const statistics = video?.statistics ?? {};
  const contentDetails = video?.contentDetails ?? {};
  const publishedAt = snippet.publishedAt ? new Date(snippet.publishedAt) : null;
  const duration = contentDetails.duration || null;
  const durationSeconds = iso8601ToSeconds(duration);
  const isShort = durationSeconds > 0 && durationSeconds <= 60;

  const metrics = {
    views: toInt(statistics.viewCount),
    likes: toInt(statistics.likeCount),
    comments: toInt(statistics.commentCount),
    shares: 0,
    saves: 0,
    impressions: 0,
  };

  return {
    externalId: String(videoId),
    title: snippet.title || "",
    caption: snippet.description || "",
    url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
    thumbnailUrl: pickThumbnail(snippet),
    publishedAt,
    metrics: {
      ...metrics,
      engagementRate: calculateEngagementRate(metrics),
    },
    metadata: {
      channelId: snippet.channelId || null,
      channelTitle: snippet.channelTitle || null,
      duration,
      durationSeconds,
      isShort,
      privacyStatus: video?.status?.privacyStatus || null,
      playlistItem: playlistItem
        ? {
            position: playlistItem.snippet?.position ?? null,
            addedAt: playlistItem.snippet?.publishedAt || null,
          }
        : null,
      rawStatistics: statistics,
    },
  };
}

function buildMockYouTubeData({ channelId = "UC_mock", handle = "@mockchannel" } = {}) {
  const timestamp = new Date();
  const mockVideos = [
    {
      id: "yt_mock_1",
      snippet: {
        title: "Mock YouTube Short",
        description: "Generated fallback video",
        publishedAt: new Date(timestamp.getTime() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        channelId,
        channelTitle: "Mock Channel",
        thumbnails: {
          high: { url: "https://picsum.photos/seed/ytmock1/640/360" },
        },
      },
      statistics: {
        viewCount: 12500,
        likeCount: 980,
        commentCount: 42,
      },
      contentDetails: {
        duration: "PT45S",
      },
      status: {
        privacyStatus: "public",
      },
    },
    {
      id: "yt_mock_2",
      snippet: {
        title: "Weekly Performance Recap",
        description: "Fallback video for offline mode",
        publishedAt: new Date(timestamp.getTime() - 1000 * 60 * 60 * 24 * 9).toISOString(),
        channelId,
        channelTitle: "Mock Channel",
        thumbnails: {
          high: { url: "https://picsum.photos/seed/ytmock2/640/360" },
        },
      },
      statistics: {
        viewCount: 8800,
        likeCount: 610,
        commentCount: 31,
      },
      contentDetails: {
        duration: "PT3M5S",
      },
      status: {
        privacyStatus: "public",
      },
    },
  ];

  const media = mockVideos.map((video, index) =>
    mapVideoToMediaItem(video, {
      snippet: {
        position: index,
        publishedAt: video.snippet.publishedAt,
      },
    })
  );

  const totals = summariseMediaMetrics(media);
  const lastSyncedAt = new Date();

  return {
    account: {
      accountId: channelId,
      username: handle,
      displayName: "Mock YouTube Channel",
      profileUrl: buildProfileUrl({ handle, channelId }),
      stats: {
        followers: 0,
        totalViews: totals.views,
        totalLikes: totals.likes,
        totalComments: totals.comments,
        totalShares: totals.shares,
        totalImpressions: totals.impressions,
        engagementRate: calculateEngagementRate(totals),
      },
      lastSyncedAt,
      metadata: {
        source: "youtube-data-api-mock",
        channelId,
        handle,
      },
    },
    media,
  };
}

async function fetchUploadsPlaylistItems(playlistId, {
  maxItems = DEFAULT_MAX_ITEMS,
  pageSize = DEFAULT_PAGE_SIZE,
  signal,
  trackQuota,
} = {}) {
  if (!playlistId) {
    return [];
  }

  const results = [];
  let nextPageToken = null;

  while (results.length < maxItems) {
    const remaining = maxItems - results.length;
    const pageLimit = Math.min(pageSize, remaining, 50);

    const data = await youtubeApiGet(
      "/playlistItems",
      {
        part: "snippet,contentDetails,status",
        playlistId,
        maxResults: pageLimit,
        pageToken: nextPageToken ?? undefined,
      },
      { signal, trackQuota, units: 1 }
    );

    const items = Array.isArray(data?.items) ? data.items : [];
    results.push(...items);

    if (!data?.nextPageToken || results.length >= maxItems) {
      break;
    }

    nextPageToken = data.nextPageToken;
  }

  return results;
}

async function fetchVideosByIds(videoIds, { signal, trackQuota } = {}) {
  if (!Array.isArray(videoIds) || videoIds.length === 0) {
    return [];
  }

  const chunks = [];
  for (let index = 0; index < videoIds.length; index += 50) {
    chunks.push(videoIds.slice(index, index + 50));
  }

  const results = [];

  for (const chunk of chunks) {
    const data = await youtubeApiGet(
      "/videos",
      {
        part: "snippet,contentDetails,statistics,status",
        id: chunk.join(","),
        maxResults: chunk.length,
      },
      { signal, trackQuota, units: 1 }
    );

    if (Array.isArray(data?.items)) {
      results.push(...data.items);
    }
  }

  return results;
}

export function extractYouTubeIdentifierFromUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    if (!hostname.includes("youtube.com")) {
      return null;
    }

    const segments = parsed.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (!segments.length) {
      return null;
    }

    const first = segments[0];

    if (first.startsWith("@")) {
      return { handle: first, identifier: first };
    }

    if (first === "channel" && segments[1]) {
      return { channelId: segments[1], identifier: segments[1] };
    }

    if ((first === "user" || first === "c") && segments[1]) {
      return { identifier: segments[1] };
    }

    // Handle URLs like /@handle/shorts/XYZ
    if (segments.length > 1 && segments[0].startsWith("@")) {
      return { handle: segments[0], identifier: segments[0] };
    }

    return null;
  } catch (error) {
    return null;
  }
}

export async function resolveYouTubeChannelId(identifier, { signal, trackQuota } = {}) {
  if (!identifier) {
    throw new Error("YouTube identifier is required to resolve a channelId.");
  }

  const trimmed = identifier.trim();
  if (!trimmed) {
    throw new Error("YouTube identifier is required to resolve a channelId.");
  }

  if (trimmed.startsWith("UC")) {
    return trimmed;
  }

  const normalizedHandle = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;

  // Try handle resolution via search (costs 100 units)
  const searchData = await youtubeApiGet(
    "/search",
    {
      part: "id,snippet",
      type: "channel",
      maxResults: 1,
      q: trimmed,
    },
    { signal, trackQuota, units: 100 }
  ).catch(() => null);

  const searchItem = searchData?.items?.[0];
  const searchChannelId = searchItem?.id?.channelId || searchItem?.snippet?.channelId;

  if (searchChannelId) {
    return searchChannelId;
  }

  // Fallback to legacy username lookup (costs 1 unit)
  const legacyData = await youtubeApiGet(
    "/channels",
    {
      part: "id",
      forUsername: normalizedHandle,
      maxResults: 1,
    },
    { signal, trackQuota, units: 1 }
  ).catch(() => null);

  const legacyItem = legacyData?.items?.[0];
  if (legacyItem?.id) {
    return legacyItem.id;
  }

  throw new Error(`Could not resolve YouTube channelId for '${identifier}'.`);
}

export async function fetchYouTubeData({
  channelId: initialChannelId = null,
  identifier = null,
  handle = null,
  username = null,
  url = null,
  maxVideos = DEFAULT_MAX_ITEMS,
  useMockOnError = true,
  signal,
} = {}) {
  if (!isYouTubeConfigured()) {
    if (useMockOnError) {
      console.warn("[youtube] YOUTUBE_API_KEY missing. Returning mock data.");
      return buildMockYouTubeData();
    }

    throw new Error(
      "YouTube Data API is not configured. Set YOUTUBE_API_KEY in your environment."
    );
  }

  let quotaUsed = 0;
  const trackQuota = (units = 1) => {
    if (Number.isFinite(units)) {
      quotaUsed += units;
    }
  };

  try {
    let resolvedChannelId = initialChannelId ? String(initialChannelId).trim() : "";
    let inferredHandle = handle;
    let inferredIdentifier = identifier || username || handle || null;
    let sourceUrl = url || null;

    if (!resolvedChannelId && url) {
      const extracted = extractYouTubeIdentifierFromUrl(url);
      if (extracted?.channelId) {
        resolvedChannelId = extracted.channelId;
      }
      if (extracted?.handle && !inferredHandle) {
        inferredHandle = extracted.handle;
      }
      if (extracted?.identifier && !inferredIdentifier) {
        inferredIdentifier = extracted.identifier;
      }
    }

    if (!resolvedChannelId && inferredIdentifier) {
      resolvedChannelId = await resolveYouTubeChannelId(inferredIdentifier, {
        signal,
        trackQuota,
      });
    }

    if (!resolvedChannelId) {
      throw new Error("Unable to determine YouTube channel ID.");
    }

    const channelData = await youtubeApiGet(
      "/channels",
      {
        part: "snippet,statistics,contentDetails",
        id: resolvedChannelId,
        maxResults: 1,
      },
      { signal, trackQuota, units: 1 }
    );

    const channel = channelData?.items?.[0];

    if (!channel) {
      throw new Error(`YouTube channel '${resolvedChannelId}' was not found.`);
    }

    const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads ?? null;

    const playlistItems = await fetchUploadsPlaylistItems(uploadsPlaylistId, {
      maxItems: maxVideos,
      signal,
      trackQuota,
    });

    const videoIds = playlistItems
      .map((item) => item?.contentDetails?.videoId)
      .filter(Boolean);

    const videos = await fetchVideosByIds(videoIds, { signal, trackQuota });
    const videoMap = new Map(videos.map((video) => [video.id, video]));

    const media = playlistItems
      .map((playlistItem) => {
        const videoId = playlistItem?.contentDetails?.videoId;
        if (!videoId) {
          return null;
        }
        const video = videoMap.get(videoId);
        if (!video) {
          return null;
        }
        return mapVideoToMediaItem(video, playlistItem);
      })
      .filter(Boolean)
      .sort((a, b) => {
        const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return bTime - aTime;
      });

    const aggregatedMetrics = summariseMediaMetrics(media);

    const subscriberCount = toInt(channel?.statistics?.subscriberCount);
    const displayName = channel?.snippet?.title || inferredIdentifier || "YouTube Channel";
    const customUrl = channel?.snippet?.customUrl || null;
    const bestHandle = inferredHandle || (customUrl ? `@${customUrl}` : null);

    const accountStats = {
      followers: subscriberCount,
      totalViews: aggregatedMetrics.views,
      totalLikes: aggregatedMetrics.likes,
      totalComments: aggregatedMetrics.comments,
      totalShares: aggregatedMetrics.shares,
      totalImpressions: aggregatedMetrics.impressions,
      engagementRate: calculateEngagementRate(aggregatedMetrics),
    };

    const lastSyncedAt = new Date();

    return {
      account: {
        accountId: resolvedChannelId,
        username: bestHandle || customUrl || inferredIdentifier || resolvedChannelId,
        displayName,
        profileUrl: buildProfileUrl({
          handle: bestHandle,
          channelId: resolvedChannelId,
          customUrl,
          sourceUrl,
        }),
        stats: accountStats,
        lastSyncedAt,
        metadata: {
          source: "youtube-data-api",
          channelId: resolvedChannelId,
          uploadsPlaylistId,
          handle: bestHandle,
          customUrl,
          identifierUsed: inferredIdentifier,
          quotaUsed,
          channelStatistics: channel?.statistics ?? null,
          rawChannel: channel,
        },
      },
      media,
    };
  } catch (error) {
    if (useMockOnError) {
      console.warn("[youtube] Falling back to mock data after API failure.", error);
      return buildMockYouTubeData({ channelId: initialChannelId || undefined, handle });
    }

    throw error;
  }
}

export function isYouTubeConfigured() {
  return Boolean(getYouTubeApiKey());
}
