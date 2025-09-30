import { connectToDatabase } from "@/lib/mongodb";
import PlatformAccount from "@/lib/models/PlatformAccount";
import { fetchPlatformData } from "@/lib/platforms";
import { upsertPlatformData } from "@/lib/services/syncService";

const REFRESHABLE_PLATFORMS = new Set(["instagram", "tiktok", "youtube"]);

// Platform-specific delays based on rate limits (minimal delays for faster refresh)
const PLATFORM_DELAYS = {
  instagram: 100,
  tiktok: 100,
  youtube: 200,
};

const DEFAULT_DELAY_MS = 100;
const lastPlatformRefresh = new Map();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeMetadata(value) {
  if (!value) {
    return {};
  }

  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }

  return value;
}

function stringOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "object") {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return null;
  }

  return String(value).trim() || null;
}

function buildFetcherOptions(account) {
  const metadata = normalizeMetadata(account?.metadata);
  const storedAccountId = stringOrNull(account?.accountId);
  const metadataUsername = stringOrNull(metadata?.username);
  const baseUsername = metadataUsername || stringOrNull(account?.username);
  const trimmedUsername = typeof baseUsername === "string" ? baseUsername.replace(/^@+/, "").trim() : null;

  if (account.platform === "instagram") {
    return {
      username: trimmedUsername,
      userId: stringOrNull(metadata?.instagramUserId) || storedAccountId,
      accountId: storedAccountId,
      useMockOnError: false,
    };
  }

  if (account.platform === "tiktok") {
    return {
      username: trimmedUsername,
      secUid: stringOrNull(metadata?.secUid) || storedAccountId,
      accountId: storedAccountId,
      useMockOnError: false,
    };
  }

  if (account.platform === "youtube") {
    const metadataChannelId = stringOrNull(metadata?.channelId);
    const storedHandle = stringOrNull(metadata?.handle) || baseUsername;
    const handleWithAt = storedHandle
      ? storedHandle.startsWith("@")
        ? storedHandle
        : `@${storedHandle}`
      : null;

    return {
      username: trimmedUsername,
      channelId: metadataChannelId || storedAccountId,
      identifier:
        stringOrNull(metadata?.identifierUsed) || handleWithAt || trimmedUsername || null,
      handle: handleWithAt,
      url: stringOrNull(metadata?.sourceUrl) || stringOrNull(account?.profileUrl),
      accountId: storedAccountId,
      useMockOnError: false,
    };
  }

  return {};
}

function mergeAccountPayload(existingAccount, incomingAccount) {
  const existingMetadata = normalizeMetadata(existingAccount?.metadata);
  const incomingMetadata = normalizeMetadata(incomingAccount?.metadata);
  const metadata = {
    ...existingMetadata,
    ...incomingMetadata,
  };

  return {
    ...incomingAccount,
    accountId: incomingAccount?.accountId ?? existingAccount?.accountId,
    username: incomingAccount?.username ?? existingAccount?.username,
    displayName: incomingAccount?.displayName ?? existingAccount?.displayName,
    profileUrl: incomingAccount?.profileUrl ?? existingAccount?.profileUrl ?? null,
    metadata,
  };
}

export async function refreshTrackedAccounts({
  userId = null,
  delayMs = null, // Will use platform-specific delays
} = {}) {
  await connectToDatabase();

  const accounts = await PlatformAccount.find({}).sort({ updatedAt: 1 }).lean();
  const results = [];
  lastPlatformRefresh.clear();

  for (let index = 0; index < accounts.length; index += 1) {
    const account = accounts[index];
    const { platform, _id, user } = account;
    if (!REFRESHABLE_PLATFORMS.has(platform)) {
      results.push({
        accountId: String(_id),
        platform,
        skipped: true,
        reason: "Platform refresh not implemented.",
      });
      continue;
    }

    const platformDelay = delayMs !== null ? delayMs : (PLATFORM_DELAYS[platform] || DEFAULT_DELAY_MS);
    const lastRefreshAt = lastPlatformRefresh.get(platform) ?? 0;
    const elapsedSinceLastRefresh = Date.now() - lastRefreshAt;

    if (lastRefreshAt && elapsedSinceLastRefresh < platformDelay) {
      const waitTime = platformDelay - elapsedSinceLastRefresh;
      console.log(
        `[refreshTrackedAccounts] Waiting ${waitTime}ms to respect ${platform} rate limits before refreshing ${account.username}`
      );
      await delay(waitTime);
    }

    lastPlatformRefresh.set(platform, Date.now());

    const options = buildFetcherOptions(account);

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
      );
      
      const providerData = await Promise.race([
        fetchPlatformData(platform, options),
        timeoutPromise
      ]);
      
      const mergedAccount = mergeAccountPayload(account, providerData.account);

      const { platformAccount, mediaIds } = await upsertPlatformData({
        userId: user ?? userId,
        platform,
        account: mergedAccount,
        media: providerData.media,
      });

      results.push({
        accountId: String(platformAccount._id),
        platform,
        mediaCount: mediaIds.length,
        syncedAt: new Date(),
        identifiersUsed: {
          accountId:
            options?.userId ||
            options?.secUid ||
            options?.channelId ||
            options?.accountId ||
            null,
          username: options?.username || options?.handle || options?.identifier || null,
        },
      });
    } catch (error) {
      console.error("[refreshTrackedAccounts]", platform, error);
      
      // Handle specific error types
      const isNotFound = error?.response?.status === 404 || /not found/i.test(error.message ?? "");
      const isRateLimited = error?.response?.status === 429 || /rate limit/i.test(error.message ?? "");
      const isInvalidId = /invalid.*id/i.test(error.message ?? "");
      
      let errorType = "unknown";
      if (isNotFound) errorType = "not_found";
      else if (isRateLimited) errorType = "rate_limited";
      else if (isInvalidId) errorType = "invalid_id";
      
      let extraDelay = 0;
      if (isRateLimited) {
        extraDelay = platform === 'instagram' ? 2000 : 1000;
        console.log(`[refreshTrackedAccounts] Rate limited for ${platform} ${account.username}, adding ${extraDelay}ms delay`);
        await delay(extraDelay);
      }

      if (isRateLimited) {
        try {
          console.log(`[refreshTrackedAccounts] Retrying ${platform} ${account.username} after ${extraDelay}ms delay`);
          lastPlatformRefresh.set(platform, Date.now());

          const retryData = await fetchPlatformData(platform, { ...options, signal: undefined });
          const mergedRetryAccount = mergeAccountPayload(account, retryData.account);

          const { platformAccount: retryAccount, mediaIds: retryMediaIds } = await upsertPlatformData({
            userId: user ?? userId,
            platform,
            account: mergedRetryAccount,
            media: retryData.media,
          });

          results.push({
            accountId: String(retryAccount._id),
            platform,
            mediaCount: retryMediaIds.length,
            syncedAt: new Date(),
            retry: true,
          });

          const finalDelay = delayMs !== null ? delayMs : (PLATFORM_DELAYS[platform] || DEFAULT_DELAY_MS);
          if (finalDelay > 0) {
            await delay(finalDelay);
          }

          continue;
        } catch (retryError) {
          console.warn(`[refreshTrackedAccounts] Retry failed for ${platform} ${account.username}:`, retryError.message);
        }
      }

      if (isNotFound && options?.username) {
        try {
          console.log(`[refreshTrackedAccounts] Attempting identifier refresh for ${platform} ${account.username}`);
          const refreshedOptions = { ...options, userId: undefined, secUid: undefined, useMockOnError: false };
          lastPlatformRefresh.set(platform, Date.now());
          const refreshedData = await fetchPlatformData(platform, refreshedOptions);
          const mergedRefreshedAccount = mergeAccountPayload(account, refreshedData.account);

          const { platformAccount: refreshedAccount, mediaIds: refreshedMediaIds } = await upsertPlatformData({
            userId: user ?? userId,
            platform,
            account: mergedRefreshedAccount,
            media: refreshedData.media,
          });

          results.push({
            accountId: String(refreshedAccount._id),
            platform,
            mediaCount: refreshedMediaIds.length,
            syncedAt: new Date(),
            identifierRefreshed: true,
          });

          const finalDelay = delayMs !== null ? delayMs : (PLATFORM_DELAYS[platform] || DEFAULT_DELAY_MS);
          if (finalDelay > 0) {
            await delay(finalDelay);
          }

          continue;
        } catch (identifierError) {
          console.warn(`[refreshTrackedAccounts] Identifier refresh failed for ${platform} ${account.username}:`, identifierError.message);
        }
      }

      // Log the stored ID being used for debugging
      console.log(`[refreshTrackedAccounts] Using stored ${platform} ID: ${account.accountId} for ${account.username}`);
      
      results.push({
        accountId: String(_id),
        platform,
        username: account.username,
        error: error.message || "Failed to refresh account.",
        errorType,
        statusCode: error?.response?.status,
        identifiersUsed: {
          accountId: options?.userId || options?.secUid || options?.accountId || null,
          username: options?.username || null,
        },
      });
    }

  }

  return {
    total: accounts.length,
    results,
    completedAt: new Date(),
  };
}
