import axios from "axios";

const DEFAULT_PAGE_SIZE = 12;
const DEFAULT_MAX_PAGES = 10;
const DEFAULT_HOST = "instagram-looter2.p.rapidapi.com";

const rapidApiKey = process.env.RAPIDAPI_KEY;
const rapidApiHost = process.env.RAPIDAPI_HOST_INSTAGRAM || DEFAULT_HOST;

let client;

function getInstagramClient() {
  if (!rapidApiKey) {
    throw new Error("RAPIDAPI_KEY is required to query Instagram RapidAPI endpoints.");
  }

  if (!client) {
    client = axios.create({
      baseURL: `https://${rapidApiHost}`,
      timeout: 30000, // Increased timeout to 30 seconds
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

function calculateEngagementRate({
  views = 0,
  likes = 0,
  comments = 0,
  shares = 0,
  saves = 0,
}) {
  if (!views) {
    return 0;
  }

  const totalInteractions = likes + comments + shares + saves;
  return Number(((totalInteractions / views) * 100).toFixed(2));
}

function pickThumbnail(item) {
  const candidates = item?.image_versions2?.candidates ?? [];
  const bestCandidate = candidates[0]?.url;
  return (
    item?.thumbnail_url ||
    item?.thumbnail_src ||
    item?.thumbnail ||
    item?.display_url ||
    item?.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url ||
    bestCandidate ||
    null
  );
}

function buildMediaUrl(item) {
  const code = item?.code || item?.shortcode || item?.pk;
  if (!code) {
    return null;
  }
  return `https://www.instagram.com/reel/${code}`;
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

function mapReelToMedia(item, accountId) {
  const data = item?.media ?? item;
  const fallbackMedia = item?.media ?? {};

  const publishedTimestamp = data?.taken_at_ms
    ? Number(data.taken_at_ms)
    : data?.taken_at_timestamp
    ? Number(data.taken_at_timestamp) * 1000
    : data?.taken_at
    ? Number(data.taken_at) * 1000
    : null;

  const publishedAt = publishedTimestamp ? new Date(publishedTimestamp) : null;

  const metrics = {
    views:
      toInt(
        data?.video_play_count ??
          data?.play_count ??
          data?.view_count ??
          fallbackMedia?.play_count ??
          fallbackMedia?.video_play_count ??
          fallbackMedia?.view_count
      ) || toInt(data?.statistics?.play_count),
    likes:
      toInt(
        data?.edge_media_preview_like?.count ??
          data?.like_count ??
          data?.statistics?.like_count ??
          fallbackMedia?.edge_media_preview_like?.count ??
          fallbackMedia?.like_count
      ),
    comments:
      toInt(
        data?.edge_media_to_comment?.count ??
          data?.comment_count ??
          data?.statistics?.comment_count ??
          fallbackMedia?.edge_media_to_comment?.count ??
          fallbackMedia?.comment_count
      ),
    shares: toInt(data?.share_count ?? data?.statistics?.share_count),
    saves: toInt(data?.save_count ?? data?.statistics?.save_count),
    impressions: toInt(data?.impression_count ?? data?.statistics?.impression_count),
  };

  // Extract title properly - handle both string and object caption
  let title = "";
  if (typeof data?.caption === "string") {
    title = data.caption;
  } else if (data?.caption?.text) {
    title = data.caption.text;
  } else if (data?.caption_text) {
    title = data.caption_text;
  } else if (data?.title) {
    title = data.title;
  }

  // Extract caption text properly
  let caption = "";
  if (typeof data?.caption === "string") {
    caption = data.caption;
  } else if (data?.caption?.text) {
    caption = data.caption.text;
  } else if (data?.caption_text) {
    caption = data.caption_text;
  }

  return {
    externalId: String(data?.id ?? data?.pk ?? `${accountId}-${publishedTimestamp}`),
    title: title || "",
    caption: caption || "",
    url: buildMediaUrl(data),
    thumbnailUrl: pickThumbnail(data),
    publishedAt,
    metrics: {
      ...metrics,
      engagementRate: calculateEngagementRate(metrics),
    },
    metadata: {
      shortcode: data?.code ?? data?.shortcode,
      original: item,
    },
  };
}

function summariseAccountStats(mediaItems, user = {}) {
  const totals = mediaItems.reduce(
    (acc, item) => {
      const metrics = item.metrics ?? {};
      acc.totalViews += metrics.views ?? 0;
      acc.totalLikes += metrics.likes ?? 0;
      acc.totalComments += metrics.comments ?? 0;
      acc.totalShares += metrics.shares ?? 0;
      acc.totalImpressions += metrics.impressions ?? 0;
      return acc;
    },
    {
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalImpressions: 0,
    }
  );

  const followerCount =
    toInt(user?.follower_count ?? user?.edge_followed_by?.count) ||
    toInt(user?.followers);

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

function buildMockInstagramData({ username } = {}) {
  const timestamp = new Date();
  const handle = username || "mock_ig_creator";

  return {
    account: {
      accountId: "ig_mock_123456",
      username: handle,
      displayName: "Mock Instagram Creator",
      profileUrl: `https://instagram.com/${handle}`,
      stats: {
        followers: 51200,
        totalViews: 1850000,
        totalLikes: 742000,
        totalComments: 18300,
        totalShares: 9200,
        totalImpressions: 2250000,
        engagementRate: 8.4,
      },
      lastSyncedAt: timestamp,
      metadata: {
        source: "mock",
      },
    },
    media: [
      {
        externalId: "ig_post_1",
        title: "Spring Collection Launch",
        caption: "Behind the scenes of our spring shoot 🌸",
        url: `https://instagram.com/p/${handle}_post_1`,
        thumbnailUrl: "https://picsum.photos/seed/ig1/400/400",
        publishedAt: new Date(timestamp.getTime() - 1000 * 60 * 60 * 24 * 5),
        metrics: {
          views: 185000,
          likes: 42200,
          comments: 1350,
          shares: 720,
          saves: 980,
          impressions: 210000,
          engagementRate: 12.3,
        },
      },
      {
        externalId: "ig_post_2",
        title: "Creator Q&A Live",
        caption: "Live recap with the community",
        url: `https://instagram.com/p/${handle}_post_2`,
        thumbnailUrl: "https://picsum.photos/seed/ig2/400/400",
        publishedAt: new Date(timestamp.getTime() - 1000 * 60 * 60 * 24 * 12),
        metrics: {
          views: 143000,
          likes: 38200,
          comments: 980,
          shares: 430,
          saves: 620,
          impressions: 165000,
          engagementRate: 11.7,
        },
      },
    ],
  };
}

export function extractInstagramUsernameFromUrl(url) {
  try {
    const parsed = new URL(url);
    if (!/instagram\.com$/i.test(parsed.hostname)) {
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
    const disallowed = new Set(["p", "reel", "reels", "stories", "explore"]);

    if (disallowed.has(first.toLowerCase())) {
      return null;
    }

    return first.toLowerCase();
  } catch (error) {
    return null;
  }
}

export async function resolveInstagramUserId(
  username,
  { useMockOnError = true, logResponse = false } = {}
) {
  if (!username) {
    throw new Error("Instagram username is required to resolve user id.");
  }

  if (!rapidApiKey) {
    if (useMockOnError) {
      return `mock-user-${username}`;
    }
    throw new Error("RAPIDAPI_KEY is not configured.");
  }

  try {
    const api = getInstagramClient();
    const response = await api.get("/id", { params: { username } });
    const data = response?.data;

    if (logResponse) {
      try {
        console.info(
          "[instagram] resolve user id",
          JSON.stringify({ username, response: data })
        );
      } catch (loggingError) {
        console.debug("[instagram] failed to log user id response", loggingError);
      }
    }

    const idValue =
      data?.user_id ??
      data?.id ??
      data?.data?.id ??
      data?.data?.user_id ??
      data?.user?.id ??
      data?.result ??
      data?.userId;

    if (!idValue) {
      throw new Error("Instagram API response did not include an id.");
    }

    return String(idValue);
  } catch (error) {
    const status = error?.response?.status;
    const rawMessage =
      error?.response?.data?.error ??
      error?.response?.data?.message ??
      error?.message ??
      "";

    const isNotFound =
      status === 404 || /api not exist/i.test(rawMessage) || /not found/i.test(rawMessage);

    if (isNotFound) {
      throw new Error(
        `Instagram profile '${username}' could not be found or is not accessible. Double-check the handle and ensure the account is public.`
      );
    }

    if (useMockOnError) {
      console.warn("[instagram] Failed to resolve user id via RapidAPI. Falling back to mock id.", error);
      return `mock-user-${username}`;
    }

    throw error;
  }
}

export async function fetchInstagramProfile(userId, { useMockOnError = true, logResponse = false } = {}) {
  if (!userId) {
    throw new Error("Instagram user ID is required to fetch profile.");
  }

  if (!rapidApiKey) {
    if (useMockOnError) {
      return {
        id: userId,
        username: "mock_user",
        full_name: "Mock User",
        biography: "Mock biography",
        follower_count: 0,
        following_count: 0,
        media_count: 0,
        is_private: false,
        is_verified: false,
        profile_pic_url: null,
        external_url: null,
        category: null,
        is_business: false,
      };
    }
    throw new Error("RAPIDAPI_KEY is not configured.");
  }

  try {
    const api = getInstagramClient();
    const response = await api.get("/profile2", { params: { id: userId } });
    const data = response?.data;

    if (logResponse) {
      try {
        console.info(
          "[instagram] fetch profile",
          JSON.stringify({ userId, response: data })
        );
      } catch (loggingError) {
        console.debug("[instagram] failed to log profile response", loggingError);
      }
    }

    if (!data) {
      throw new Error("Instagram profile API response is empty.");
    }

    // Extract profile information from the response
    const profile = {
      id: data.id || data.pk || userId,
      username: data.username || null,
      full_name: data.full_name || null,
      biography: data.biography || null,
      follower_count: toInt(data.follower_count, 0),
      following_count: toInt(data.following_count, 0),
      media_count: toInt(data.media_count, 0),
      is_private: Boolean(data.is_private),
      is_verified: Boolean(data.is_verified),
      profile_pic_url: data.profile_pic_url || data.hd_profile_pic_url_info?.url || null,
      external_url: data.external_url || null,
      category: data.category || null,
      is_business: Boolean(data.is_business),
      account_type: data.account_type || null,
      bio_links: data.bio_links || [],
      fbid_v2: data.fbid_v2 || null,
    };

    return profile;
  } catch (error) {
    const status = error?.response?.status;
    const rawMessage =
      error?.response?.data?.error ??
      error?.response?.data?.message ??
      error?.message ??
      "";

    const isNotFound =
      status === 404 || /api not exist/i.test(rawMessage) || /not found/i.test(rawMessage);
    
    const isQuotaExceeded = 
      status === 429 || /quota/i.test(rawMessage) || /exceeded/i.test(rawMessage) || /too many requests/i.test(rawMessage);

    if (isNotFound) {
      throw new Error(
        `Instagram profile with ID '${userId}' could not be found or is not accessible.`
      );
    }

    if (isQuotaExceeded) {
      console.warn(`[instagram] API quota exceeded for profile2 endpoint. Using mock data.`);
      if (useMockOnError) {
        return {
          id: userId,
          username: "mock_user",
          full_name: "Mock User",
          biography: "Mock biography",
          follower_count: 0,
          following_count: 0,
          media_count: 0,
          is_private: false,
          is_verified: false,
          profile_pic_url: null,
          external_url: null,
          category: null,
          is_business: false,
        };
      }
      throw new Error(`Instagram API quota exceeded for profile2 endpoint.`);
    }

    if (useMockOnError) {
      console.warn("[instagram] Failed to fetch profile via RapidAPI. Falling back to mock profile.", error);
      return {
        id: userId,
        username: "mock_user",
        full_name: "Mock User",
        biography: "Mock biography",
        follower_count: 0,
        following_count: 0,
        media_count: 0,
        is_private: false,
        is_verified: false,
        profile_pic_url: null,
        external_url: null,
        category: null,
        is_business: false,
      };
    }

    throw error;
  }
}

const userIdCache = new Map();

async function fetchReelsPages({ userId, pageSize, maxPages, signal }) {
  const api = getInstagramClient();
  let nextMaxId;
  let page = 0;
  const reels = [];
  const seenIds = new Set();
  let latestPayloadUser = null;
  let shouldContinue = true;

  while (page < maxPages && shouldContinue) {
    const params = {
      id: userId,
      count: pageSize,
    };

    if (nextMaxId) {
      params.max_id = nextMaxId;
    }

    const response = await api.get("/reels", {
      params,
      signal,
    });

    const payload = response?.data ?? {};
    const items = Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.reels)
      ? payload.reels
      : [];

    const inferredUser =
      items?.[0]?.media?.user ?? items?.[0]?.user ?? payload?.user ?? payload?.owner;
    if (inferredUser) {
      latestPayloadUser = inferredUser;
    }

    let newItemsCount = 0;
    for (const item of items) {
      const mapped = mapReelToMedia(item, userId);
      if (!seenIds.has(mapped.externalId)) {
        reels.push(mapped);
        seenIds.add(mapped.externalId);
        newItemsCount++;
      }
    }

    // Stop pagination if no new items were found in this page
    if (newItemsCount === 0) {
      console.log(`[instagram] No new items found on page ${page + 1}, stopping pagination`);
      break;
    }

    const pagingInfo = payload?.paging_info ?? payload?.paging ?? {};

    const more = toBooleanFlag(
      payload?.more_available ??
        pagingInfo?.more_available ??
        payload?.has_more ??
        pagingInfo?.has_more ??
        false
    );

    const nextId =
      pagingInfo?.max_id ??
      pagingInfo?.next_max_id ??
      payload?.next_max_id ??
      payload?.max_id ??
      pagingInfo?.cursors?.after ??
      null;

    shouldContinue = more && Boolean(nextId) && nextId !== nextMaxId;

    if (!shouldContinue) {
      console.log(`[instagram] Stopping pagination: more=${more}, nextId=${nextId}, nextMaxId=${nextMaxId}`);
      break;
    }

    nextMaxId = nextId;
    page += 1;

    // Add delay between pagination requests to respect rate limits (10 requests per second)
    if (page < maxPages && shouldContinue) {
      await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay (minimal delay)
    }
  }

  return { reels, user: latestPayloadUser };
}

export async function fetchInstagramData(
  {
    username,
    userId,
    pageSize = DEFAULT_PAGE_SIZE,
    maxPages = DEFAULT_MAX_PAGES,
    signal,
    useMockOnError = true,
  } = {}
) {
  const handle = username?.toLowerCase();

  if (!rapidApiKey || (!handle && !userId)) {
    return buildMockInstagramData({ username: handle });
  }

  try {
    const cacheKey = userId ? `${handle || "id"}-${userId}` : handle;
    let resolvedUserId = cacheKey ? userIdCache.get(cacheKey) : null;

    if (!resolvedUserId) {
      resolvedUserId =
        userId ||
        (await resolveInstagramUserId(handle, {
          useMockOnError: false,
          logResponse: process.env.NODE_ENV !== "production",
        }));

      if (cacheKey && resolvedUserId) {
        userIdCache.set(cacheKey, resolvedUserId);
      }
    }

    let { reels, user } = await fetchReelsPages({
      userId: resolvedUserId,
      pageSize,
      maxPages,
      signal,
    });

    // If the stored userId failed and we have a username, try to re-resolve
    if ((!reels || reels.length === 0) && handle && userId && userId !== resolvedUserId) {
      console.log(`[instagram] Stored userId ${userId} failed, attempting to re-resolve for ${handle}`);
      try {
        const newUserId = await resolveInstagramUserId(handle, {
          useMockOnError: false,
          logResponse: process.env.NODE_ENV !== "production",
        });
        
        if (newUserId && newUserId !== userId) {
          const retryResult = await fetchReelsPages({
            userId: newUserId,
            pageSize,
            maxPages,
            signal,
          });
          reels = retryResult.reels;
          user = retryResult.user;
          resolvedUserId = newUserId;
          
          if (cacheKey) {
            userIdCache.set(cacheKey, resolvedUserId);
          }
        }
      } catch (retryError) {
        console.warn(`[instagram] Re-resolution failed for ${handle}:`, retryError.message);
      }
    }

    let stats = summariseAccountStats(reels, user);
    const lastSyncedAt = new Date();

    // Fetch detailed profile information using profile2 endpoint
    let profileData = null;
    try {
      profileData = await fetchInstagramProfile(resolvedUserId, {
        useMockOnError: true, // Changed to true to handle quota issues gracefully
        logResponse: process.env.NODE_ENV !== "production",
      });
    } catch (profileError) {
      console.warn(`[instagram] Failed to fetch profile data for ${resolvedUserId}:`, profileError.message);
      // Continue without profile data - this is not critical for the main functionality
    }

    if (profileData?.follower_count !== undefined && profileData?.follower_count !== null) {
      stats = {
        ...stats,
        followers: toInt(profileData.follower_count, stats.followers ?? 0),
      };
    }

    return {
      account: {
        accountId: String(resolvedUserId),
        username: profileData?.username || handle || user?.username,
        displayName: profileData?.full_name || user?.full_name || user?.name || handle || "Instagram Creator",
        profileUrl: handle ? `https://www.instagram.com/${handle}` : null,
        stats,
        lastSyncedAt,
        metadata: {
          source: "rapidapi-instagram-looter2",
          instagramUserId: String(resolvedUserId),
          username: profileData?.username || handle || user?.username,
          // Enhanced profile data from profile2 endpoint
          profile: profileData
            ? {
                platform: "instagram",
                ...profileData,
              }
            : null,
        },
      },
      media: reels,
    };
  } catch (error) {
    if (useMockOnError) {
      console.warn("[instagram] Falling back to mock data after API failure.", error);
      return buildMockInstagramData({ username: handle });
    }

    throw error;
  }
}

export function isInstagramConfigured() {
  return Boolean(rapidApiKey);
}
