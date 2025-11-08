import { connectToDatabase } from "@/lib/mongodb";
import PlatformAccount from "@/lib/models/PlatformAccount";
import { fetchPlatformData } from "@/lib/platforms";
import { upsertPlatformData } from "@/lib/services/syncService";

const REFRESHABLE_PLATFORMS = new Set(["instagram", "tiktok", "youtube"]);

// Platform-specific delays derived from the stated rate limits
const PLATFORM_DELAYS = {
  instagram: 500, // More conservative: ~2 req/sec to avoid rate limits
  tiktok: 100, // 600 req/min ≈ 10 req/sec
  youtube: 0, // effectively unlimited
};

const DEFAULT_DELAY_MS = 100;
// Platform-specific timeouts (Instagram needs more time for pagination)
const PLATFORM_TIMEOUTS = {
  instagram: 60_000, // 60 seconds for Instagram (pagination can be slow)
  tiktok: 30_000,
  youtube: 30_000,
};
const REQUEST_TIMEOUT_MS = 30_000;
const lastPlatformRefresh = new Map();
const platformQueues = new Map();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getPlatformDelay(platform, overrideDelay = null) {
  if (overrideDelay !== null && Number.isFinite(overrideDelay)) {
    return Math.max(0, overrideDelay);
  }
  return PLATFORM_DELAYS[platform] ?? DEFAULT_DELAY_MS;
}

async function withTimeout(promise, timeoutMs, message) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

async function waitForPlatformSlot(platform, label, overrideDelay = null) {
  const platformDelay = getPlatformDelay(platform, overrideDelay);
  const identifier = label || platform;

  if (!platformQueues.has(platform)) {
    platformQueues.set(platform, Promise.resolve());
  }

  const previous = platformQueues.get(platform);

  let release;
  const next = new Promise((resolve) => {
    release = resolve;
  });

  platformQueues.set(platform, previous.then(() => next));

  await previous;

  try {
    if (platformDelay > 0) {
      const lastRefreshAt = lastPlatformRefresh.get(platform) ?? 0;
      const elapsed = Date.now() - lastRefreshAt;
      if (lastRefreshAt && elapsed < platformDelay) {
        const waitTime = platformDelay - elapsed;
        console.log(
          `[refreshTrackedAccounts] Waiting ${waitTime}ms to respect ${platform} rate limits before refreshing ${identifier}`
        );
        await delay(waitTime);
      }
    }
    lastPlatformRefresh.set(platform, Date.now());
  } finally {
    release();
  }
}

async function fetchProviderData(platform, options, label, overrideDelay = null) {
  await waitForPlatformSlot(platform, label, overrideDelay);
  const timeoutMs = PLATFORM_TIMEOUTS[platform] ?? REQUEST_TIMEOUT_MS;
  const timeoutSeconds = timeoutMs / 1000;
  return withTimeout(
    fetchPlatformData(platform, options),
    timeoutMs,
    `Request timeout after ${timeoutSeconds} seconds`
  );
}

function buildIdentifiersUsed(options = {}) {
  return {
    accountId:
      options?.userId ||
      options?.secUid ||
      options?.channelId ||
      options?.accountId ||
      null,
    username: options?.username || options?.handle || options?.identifier || null,
  };
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
  delayMs = null,
} = {}) {
  await connectToDatabase();

  const accounts = await PlatformAccount.find({}).sort({ updatedAt: 1 }).lean();
  const results = new Array(accounts.length).fill(null);
  lastPlatformRefresh.clear();
  platformQueues.clear();

  async function syncAccount(account, index) {
    const { platform, _id, user, username, displayName, accountId: storedAccountId } = account;
    const accountLabel = username || displayName || storedAccountId || String(_id);

    if (!REFRESHABLE_PLATFORMS.has(platform)) {
      results[index] = {
        accountId: String(_id),
        platform,
        skipped: true,
        reason: "Platform refresh not implemented.",
      };
      return;
    }

    const ownerId = user ?? userId;
    const options = buildFetcherOptions(account);

    const applyProviderData = async (providerData, opts, extraMeta = {}) => {
      const mergedAccount = mergeAccountPayload(account, providerData.account);
      const { platformAccount, mediaIds } = await upsertPlatformData({
        userId: ownerId,
        platform,
        account: mergedAccount,
        media: providerData.media,
      });

      results[index] = {
        accountId: String(platformAccount._id),
        platform,
        mediaCount: mediaIds.length,
        syncedAt: new Date(),
        identifiersUsed: buildIdentifiersUsed(opts),
        ...extraMeta,
      };
    };

    try {
      const providerData = await fetchProviderData(platform, options, accountLabel, delayMs);
      await applyProviderData(providerData, options);
      return;
    } catch (error) {
      console.error("[refreshTrackedAccounts]", platform, error);

      const isNotFound = error?.response?.status === 404 || /not found/i.test(error.message ?? "");
      const isRateLimited = error?.response?.status === 429 || /rate limit/i.test(error.message ?? "");
      const isInvalidId = /invalid.*id/i.test(error.message ?? "");
      const isTimeout = /timeout/i.test(error.message ?? "");

      let errorType = "unknown";
      if (isNotFound) errorType = "not_found";
      else if (isRateLimited) errorType = "rate_limited";
      else if (isInvalidId) errorType = "invalid_id";
      else if (isTimeout) errorType = "timeout";

      // Handle rate limits and timeouts (timeouts can occur due to rate limiting)
      if (isRateLimited || (isTimeout && platform === "instagram")) {
        const extraDelay = platform === "instagram" ? 5000 : 2000; // Increased delay for Instagram
        console.log(
          `[refreshTrackedAccounts] ${isRateLimited ? "Rate limited" : "Timeout"} for ${platform} ${accountLabel}, adding ${extraDelay}ms delay`
        );
        await delay(extraDelay);

        try {
          console.log(`[refreshTrackedAccounts] Retrying ${platform} ${accountLabel} after ${isRateLimited ? "rate limit" : "timeout"} delay`);
          const retryData = await fetchProviderData(platform, { ...options, signal: undefined }, accountLabel, delayMs);
          await applyProviderData(retryData, options, { retry: true });
          return;
        } catch (retryError) {
          console.warn(
            `[refreshTrackedAccounts] Retry failed for ${platform} ${accountLabel}:`,
            retryError.message
          );
          // If retry also fails with rate limit/timeout, add another longer delay and try once more
          if ((retryError?.response?.status === 429 || /timeout|rate limit/i.test(retryError.message ?? "")) && platform === "instagram") {
            console.log(`[refreshTrackedAccounts] Second retry attempt for ${platform} ${accountLabel} after longer delay`);
            await delay(10000); // 10 second delay for second retry
            try {
              const secondRetryData = await fetchProviderData(platform, { ...options, signal: undefined }, accountLabel, delayMs);
              await applyProviderData(secondRetryData, options, { retry: true, secondRetry: true });
              return;
            } catch (secondRetryError) {
              console.warn(
                `[refreshTrackedAccounts] Second retry also failed for ${platform} ${accountLabel}:`,
                secondRetryError.message
              );
            }
          }
        }
      }

      if (isNotFound && options?.username) {
        try {
          console.log(`[refreshTrackedAccounts] Attempting identifier refresh for ${platform} ${accountLabel}`);
          const refreshedOptions = { ...options, userId: undefined, secUid: undefined, useMockOnError: false };
          const refreshedData = await fetchProviderData(
            platform,
            refreshedOptions,
            accountLabel,
            delayMs
          );
          await applyProviderData(refreshedData, refreshedOptions, { identifierRefreshed: true });
          return;
        } catch (identifierError) {
          console.warn(
            `[refreshTrackedAccounts] Identifier refresh failed for ${platform} ${accountLabel}:`,
            identifierError.message
          );
        }
      }

      console.log(
        `[refreshTrackedAccounts] Using stored ${platform} ID: ${storedAccountId} for ${accountLabel}`
      );

      results[index] = {
        accountId: String(_id),
        platform,
        username,
        error: error.message || "Failed to refresh account.",
        errorType,
        statusCode: error?.response?.status,
        identifiersUsed: buildIdentifiersUsed(options),
      };
    }
  }

  await Promise.all(
    accounts.map((account, index) =>
      syncAccount(account, index).catch((error) => {
        console.error(
          `[refreshTrackedAccounts] Unexpected failure for ${account.platform} ${account.username}:`,
          error
        );
        results[index] = {
          accountId: String(account?._id || ""),
          platform: account?.platform,
          username: account?.username,
          error: error?.message || "Failed to refresh account.",
          errorType: "unknown",
        };
      })
    )
  );

  return {
    total: accounts.length,
    results,
    completedAt: new Date(),
  };
}
