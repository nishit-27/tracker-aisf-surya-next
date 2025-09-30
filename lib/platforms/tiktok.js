import axios from "axios";

const DEFAULT_PAGE_SIZE = 35;
const DEFAULT_MAX_PAGES = 5;
const DEFAULT_HOST = "tiktok-api23.p.rapidapi.com";

// Read environment variables at runtime
function getRapidApiKey() {
  return process.env.RAPIDAPI_KEY;
}

function getRapidApiHost() {
  return process.env.RAPIDAPI_HOST_TIKTOK || DEFAULT_HOST;
}

let client;

function getTikTokClient() {
  const rapidApiKey = getRapidApiKey();
  const rapidApiHost = getRapidApiHost();
  
  if (!rapidApiKey) {
    throw new Error("RAPIDAPI_KEY is required to query TikTok RapidAPI endpoints.");
  }

  if (!client) {
    client = axios.create({
      baseURL: `https://${rapidApiHost}`,
      timeout: 10000,
      headers: {
        "x-rapidapi-host": rapidApiHost,
        "x-rapidapi-key": rapidApiKey,
      },
    });
  }

  return client;
}

function toInt(value, fallback = 0) {
  if (value === null || value === undefined) {
    return fallback;
  }

  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  return parsed;
}

function calculateEngagementRate({ views = 0, likes = 0, comments = 0, shares = 0 }) {
  if (!views) {
    return 0;
  }

  const totalInteractions = likes + comments + shares;
  return Number(((totalInteractions / views) * 100).toFixed(2));
}

function pickCover(item) {
  return (
    item?.video?.cover ??
    item?.video?.dynamicCover ??
    item?.video?.originCover ??
    item?.imagePost?.cover ??
    null
  );
}

function toBooleanFlag(value) {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    return normalized === "true" || normalized === "1";
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  return value === true;
}

export function extractTikTokUsernameFromUrl(url) {
  try {
    const parsed = new URL(url);
    if (!/tiktok\.com$/i.test(parsed.hostname)) {
      return null;
    }

    const segments = parsed.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (!segments.length) {
      return null;
    }

    if (segments[0] === "video" && segments.length >= 2) {
      const handleSegment = segments[segments.length - 2];
      return handleSegment?.startsWith("@")
        ? handleSegment.slice(1).toLowerCase()
        : handleSegment?.toLowerCase() ?? null;
    }

    const first = segments[0];
    return first.startsWith("@") ? first.slice(1).toLowerCase() : first.toLowerCase();
  } catch (error) {
    return null;
  }
}

export async function resolveTikTokSecUid(
  uniqueId,
  { useMockOnError = true, logResponse = false } = {}
) {
  if (!uniqueId) {
    throw new Error("TikTok username is required to resolve secUid.");
  }

  const rapidApiKey = getRapidApiKey();
  if (!rapidApiKey) {
    if (useMockOnError) {
      return { secUid: `mock-secuid-${uniqueId}`, userInfo: null };
    }
    throw new Error("RAPIDAPI_KEY is not configured.");
  }

  try {
    const api = getTikTokClient();
    const response = await api.get("/api/user/info", { params: { uniqueId } });
    const data = response?.data;

    if (logResponse) {
      try {
        console.info("[tiktok] resolve secUid", JSON.stringify({ uniqueId, response: data }));
      } catch (loggingError) {
        console.debug("[tiktok] failed to log secUid response", loggingError);
      }
    }

    // The actual API response structure is: userInfo.user.secUid
    const secUid = data?.userInfo?.user?.secUid;

    if (!secUid) {
      throw new Error("TikTok API response did not include secUid.");
    }

    const userInfo = data?.userInfo ?? null;

    return { secUid: String(secUid), userInfo };
  } catch (error) {
    const status = error?.response?.status;
    const rawMessage =
      error?.response?.data?.error ??
      error?.response?.data?.message ??
      error?.message ??
      "";

    const isNotFound = status === 404 || /not found/i.test(rawMessage);

    if (isNotFound) {
      throw new Error(
        `TikTok profile '${uniqueId}' could not be found or is not accessible. Double-check the handle and ensure the account is public.`
      );
    }

    if (useMockOnError) {
      console.warn("[tiktok] Failed to resolve secUid via RapidAPI. Falling back to mock data.", error);
      return { secUid: `mock-secuid-${uniqueId}`, userInfo: null };
    }

    throw error;
  }
}

function mapTikTokItem(item, accountId) {
  // The actual API response structure is: data.itemList[0].statsV2
  const stats = item?.statsV2 ?? item?.stats ?? {};

  const createTime = item?.createTime ?? item?.create_time;
  const publishedAt = createTime ? new Date(Number(createTime) * 1000) : null;

  const metrics = {
    views: toInt(stats.playCount),
    likes: toInt(stats.diggCount),
    comments: toInt(stats.commentCount),
    shares: toInt(stats.shareCount),
  };

  const awemeId = item?.id;
  const authorUniqueId = item?.author?.uniqueId ?? "";

  const shareUrl = authorUniqueId && awemeId
    ? `https://www.tiktok.com/@${authorUniqueId}/video/${awemeId}`
    : null;

  return {
    externalId: String(awemeId ?? `${accountId}-${createTime}`),
    title: item?.desc ?? "",
    caption: item?.desc ?? "",
    url: shareUrl,
    thumbnailUrl: pickCover(item),
    publishedAt,
    metrics: {
      ...metrics,
      engagementRate: calculateEngagementRate(metrics),
    },
    metadata: {
      original: item,
    },
  };
}

function summariseAccountStats(mediaItems, userInfo = {}) {
  const totals = mediaItems.reduce(
    (acc, item) => {
      const metrics = item.metrics ?? {};
      acc.totalViews += metrics.views ?? 0;
      acc.totalLikes += metrics.likes ?? 0;
      acc.totalComments += metrics.comments ?? 0;
      acc.totalShares += metrics.shares ?? 0;
      return acc;
    },
    {
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
    }
  );

  const followerCount = toInt(userInfo?.stats?.followerCount ?? userInfo?.stats?.follower_count);

  const engagementRate = calculateEngagementRate({
    views: totals.totalViews || followerCount,
    likes: totals.totalLikes,
    comments: totals.totalComments,
    shares: totals.totalShares,
  });

  return {
    followers: followerCount,
    ...totals,
    engagementRate,
  };
}

function buildTikTokProfile(info, secUid) {
  if (!info) {
    return null;
  }

  const user = info?.user ?? info?.userInfo?.user ?? info;
  const stats = info?.stats ?? info?.userInfo?.stats ?? {};

  return {
    platform: "tiktok",
    secUid: secUid ?? user?.secUid ?? null,
    id: user?.id ?? null,
    uniqueId: user?.uniqueId ?? null,
    nickname: user?.nickname ?? null,
    signature: user?.signature ?? null,
    verified: toBooleanFlag(user?.verified),
    privateAccount: toBooleanFlag(user?.privateAccount),
    relation: user?.relation ?? null,
    avatarThumb: user?.avatarThumb ?? null,
    avatarMedium: user?.avatarMedium ?? null,
    avatarLarger: user?.avatarLarger ?? null,
    bioLink: user?.bioLink ?? null,
    commentSetting: user?.commentSetting ?? null,
    duetSetting: user?.duetSetting ?? null,
    stitchSetting: user?.stitchSetting ?? null,
    downloadSetting: user?.downloadSetting ?? null,
    followingVisibility: user?.followingVisibility ?? null,
    openFavorite: toBooleanFlag(user?.openFavorite),
    canExpPlaylist: toBooleanFlag(user?.canExpPlaylist),
    profileTab: user?.profileTab ?? null,
    commerceUserInfo: user?.commerceUserInfo ?? null,
    ttSeller: toBooleanFlag(user?.ttSeller),
    isEmbedBanned: toBooleanFlag(user?.isEmbedBanned),
    isADVirtual: toBooleanFlag(user?.isADVirtual),
    profileEmbedPermission: user?.profileEmbedPermission ?? null,
    stats: {
      followerCount: toInt(stats?.followerCount ?? stats?.follower_count, null),
      followingCount: toInt(stats?.followingCount ?? stats?.following_count, null),
      friendCount: toInt(stats?.friendCount ?? stats?.friend_count, null),
      heart: toInt(stats?.heart ?? stats?.heartCount ?? stats?.heart_count, null),
      heartCount: toInt(stats?.heartCount ?? stats?.heart_count ?? stats?.heart, null),
      diggCount: toInt(stats?.diggCount ?? stats?.digg_count, null),
      videoCount: toInt(stats?.videoCount ?? stats?.video_count, null),
    },
    raw: info,
  };
}

function buildMockTikTokData({ username } = {}) {
  const timestamp = new Date();
  const handle = username || "mock_tiktok_creator";

  return {
    account: {
      accountId: "tt_mock_654321",
      username: handle,
      displayName: "Mock TikTok Creator",
      profileUrl: `https://www.tiktok.com/@${handle}`,
      stats: {
        followers: 98500,
        totalViews: 3420000,
        totalLikes: 1250000,
        totalComments: 22500,
        totalShares: 15300,
        engagementRate: 9.1,
      },
      lastSyncedAt: timestamp,
      metadata: {
        source: "mock",
      },
    },
    media: [],
  };
}

async function fetchTikTokPosts({ secUid, pageSize, maxPages, signal }) {
  const api = getTikTokClient();
  let cursor = 0;
  let page = 0;
  const items = [];
  const seenIds = new Set();
  let latestUserInfo = null;
  let latestShareMeta = null;
  let shouldContinue = true;

  while (page < maxPages && shouldContinue) {
    const response = await api.get("/api/user/posts", {
      params: {
        secUid,
        count: pageSize,
        cursor,
      },
      signal,
    });

    const root = response?.data ?? {};
    const payload = root?.data ?? root;
    
    // The actual API response structure is: data.itemList
    const list = Array.isArray(payload?.itemList) ? payload.itemList : [];

    let newItemsCount = 0;
    for (const item of list) {
      const mapped = mapTikTokItem(item, secUid);
      if (!seenIds.has(mapped.externalId)) {
        items.push(mapped);
        seenIds.add(mapped.externalId);
        newItemsCount++;
      }
    }

    // Stop pagination if no new items were found in this page
    if (newItemsCount === 0) {
      console.log(`[tiktok] No new items found on page ${page + 1}, stopping pagination`);
      break;
    }

    if (!latestUserInfo) {
      latestUserInfo = root?.userInfo ?? payload?.userInfo ?? null;
    }

    if (!latestShareMeta) {
      latestShareMeta = root?.shareMeta ?? payload?.shareMeta ?? null;
    }

    // Check for pagination - the API returns hasMore and cursor in the data object
    const hasMore = toBooleanFlag(payload?.hasMore);
    const nextCursor = payload?.cursor;

    shouldContinue = hasMore && nextCursor !== undefined && nextCursor !== cursor;

    if (!shouldContinue) {
      console.log(
        `[tiktok] Stopping pagination: hasMore=${hasMore}, nextCursor=${nextCursor}, cursor=${cursor}`
      );
      break;
    }

    cursor = nextCursor;
    page += 1;

    // Add delay between pagination requests to respect rate limits (600 requests per minute)
    if (page < maxPages && shouldContinue) {
      await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay (minimal delay)
    }
  }

  return { items, userInfo: latestUserInfo, shareMeta: latestShareMeta };
}

const secUidCache = new Map();

export async function fetchTikTokData(
  {
    username,
    secUid,
    pageSize = DEFAULT_PAGE_SIZE,
    maxPages = DEFAULT_MAX_PAGES,
    signal,
    useMockOnError = true,
  } = {}
) {
  const handle = username?.toLowerCase();
  const rapidApiKey = getRapidApiKey();

  if (!rapidApiKey || (!handle && !secUid)) {
    return buildMockTikTokData({ username: handle });
  }

  try {
    const cacheKey = secUid ? `${handle || "secUid"}-${secUid}` : handle;
    let resolvedSecUid = secUid ?? (cacheKey ? secUidCache.get(cacheKey) : null);
    let resolvedUserInfo = null;

    if (!resolvedSecUid) {
      const lookup = await resolveTikTokSecUid(handle, {
        useMockOnError: false,
        logResponse: process.env.NODE_ENV !== "production",
      });
      resolvedSecUid = lookup.secUid;
      resolvedUserInfo = lookup.userInfo;
      if (cacheKey && resolvedSecUid) {
        secUidCache.set(cacheKey, resolvedSecUid);
      }
    }

    let { items, userInfo, shareMeta } = await fetchTikTokPosts({
      secUid: resolvedSecUid,
      pageSize,
      maxPages,
      signal,
    });

    // If the stored secUid failed and we have a username, try to re-resolve
    if ((!items || items.length === 0) && handle && secUid && secUid !== resolvedSecUid) {
      console.log(`[tiktok] Stored secUid ${secUid} failed, attempting to re-resolve for ${handle}`);
      try {
        const lookup = await resolveTikTokSecUid(handle, {
          useMockOnError: false,
          logResponse: process.env.NODE_ENV !== "production",
        });
        
        if (lookup.secUid && lookup.secUid !== secUid) {
          const retryResult = await fetchTikTokPosts({
            secUid: lookup.secUid,
            pageSize,
            maxPages,
            signal,
          });
          items = retryResult.items;
          userInfo = retryResult.userInfo;
          shareMeta = retryResult.shareMeta;
          resolvedSecUid = lookup.secUid;
          resolvedUserInfo = lookup.userInfo;
          
          if (cacheKey) {
            secUidCache.set(cacheKey, resolvedSecUid);
          }
        }
      } catch (retryError) {
        console.warn(`[tiktok] Re-resolution failed for ${handle}:`, retryError.message);
      }
    }

    const info = userInfo ?? resolvedUserInfo;
    let stats = summariseAccountStats(items, info);
    const lastSyncedAt = new Date();

    const profileData = buildTikTokProfile(info, resolvedSecUid);

    if (profileData?.stats?.followerCount !== null && profileData?.stats?.followerCount !== undefined) {
      stats = {
        ...stats,
        followers: profileData.stats.followerCount,
      };
    }

    const profile = profileData ?? info?.user ?? info?.userInfo?.user ?? info ?? {};

    return {
      account: {
        accountId: resolvedSecUid,
        username: profile?.uniqueId ?? handle,
        displayName: profile?.nickname ?? handle,
        profileUrl: `https://www.tiktok.com/@${profile?.uniqueId ?? handle}`,
        stats,
        lastSyncedAt,
        metadata: {
          source: "rapidapi-tiktok",
          secUid: resolvedSecUid,
          username: profile?.uniqueId ?? handle,
          profile: profileData,
          shareMeta: shareMeta ?? null,
        },
      },
      media: items,
    };
  } catch (error) {
    if (useMockOnError) {
      console.warn("[tiktok] Falling back to mock data after API failure.", error);
      return buildMockTikTokData({ username: handle });
    }

    throw error;
  }
}

export function isTikTokConfigured() {
  return Boolean(getRapidApiKey());
}
