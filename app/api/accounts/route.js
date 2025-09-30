import { NextResponse } from "next/server";
import { detectPlatformFromUrl } from "@/lib/platforms/detect";
import {
  extractInstagramUsernameFromUrl,
  fetchInstagramData,
  isInstagramConfigured,
  resolveInstagramUserId,
} from "@/lib/platforms/instagram";
import {
  extractTikTokUsernameFromUrl,
  resolveTikTokSecUid,
  fetchTikTokData,
  isTikTokConfigured,
} from "@/lib/platforms/tiktok";
import { connectToDatabase } from "@/lib/mongodb";
import PlatformAccount from "@/lib/models/PlatformAccount";
import MediaItem from "@/lib/models/MediaItem";
import { upsertPlatformData } from "@/lib/services/syncService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();
    
    const accounts = await PlatformAccount.find({})
      .sort({ createdAt: -1 })
      .lean();
    
    const accountsWithMediaCount = await Promise.all(
      accounts.map(async (account) => {
        const mediaCount = await MediaItem.countDocuments({ account: account._id });
        return {
          ...account,
          mediaCount
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      accounts: accountsWithMediaCount,
      total: accountsWithMediaCount.length
    });
  } catch (error) {
    console.error("[accounts:get]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch accounts." },
      { status: 500 }
    );
  }
}

async function handleInstagramAccount({ accountUrl, userId: requestUserId }) {
  if (!isInstagramConfigured()) {
    return NextResponse.json(
      {
        error:
          "Instagram RapidAPI credentials are missing. Set RAPIDAPI_KEY and RAPIDAPI_HOST_INSTAGRAM in your environment.",
      },
      { status: 501 }
    );
  }

  const username = extractInstagramUsernameFromUrl(accountUrl);

  if (!username) {
    return NextResponse.json(
      { error: "Unable to extract Instagram username from the provided URL." },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const existingAccount = await PlatformAccount.findOne({ platform: "instagram", username }).lean();

  let instagramUserId =
    existingAccount?.metadata?.instagramUserId || existingAccount?.accountId;

  if (!instagramUserId) {
    console.log(`[accounts] Resolving user ID for username: ${username}`);
    instagramUserId = await resolveInstagramUserId(username, { useMockOnError: false });
    console.log(`[accounts] Resolved user ID: ${instagramUserId}`);
  }

  let providerData;
  try {
    providerData = await fetchInstagramData({
      username,
      userId: instagramUserId,
      useMockOnError: false,
    });
  } catch (error) {
    if (error?.message) {
      throw error;
    }
    throw new Error("Failed to fetch Instagram media.");
  }

  const metadata = {
    ...(providerData.account?.metadata ?? {}),
    instagramUserId,
    username,
    sourceUrl: accountUrl,
  };

  const accountPayload = {
    ...providerData.account,
    accountId: instagramUserId,
    username,
    profileUrl: providerData.account.profileUrl ?? accountUrl,
    metadata,
  };

  const { platformAccount } = await upsertPlatformData({
    userId: requestUserId ?? existingAccount?.user ?? null,
    platform: "instagram",
    account: accountPayload,
    media: providerData.media,
  });

  const populatedAccount = await PlatformAccount.findById(platformAccount._id).lean();
  const mediaItems = await MediaItem.find({ account: platformAccount._id })
    .sort({ publishedAt: -1 })
    .lean();

  return NextResponse.json({
    success: true,
    platform: "instagram",
    account: populatedAccount,
    media: mediaItems,
  });
}

async function handleTikTokAccount({ accountUrl, userId: requestUserId }) {
  if (!isTikTokConfigured()) {
    return NextResponse.json(
      {
        error:
          "TikTok RapidAPI credentials are missing. Set RAPIDAPI_KEY and RAPIDAPI_HOST_TIKTOK in your environment.",
      },
      { status: 501 }
    );
  }

  const username = extractTikTokUsernameFromUrl(accountUrl);

  if (!username) {
    return NextResponse.json(
      { error: "Unable to extract TikTok username from the provided URL." },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const existingAccount = await PlatformAccount.findOne({ platform: "tiktok", username }).lean();

  let secUid = existingAccount?.metadata?.secUid || existingAccount?.accountId;
  let cachedUserInfo = existingAccount?.metadata?.userInfo ?? null;

  if (secUid && typeof secUid === "object") {
    secUid =
      secUid.secUid ||
      secUid.accountId ||
      secUid.id ||
      secUid.value ||
      null;
  }

  if (!secUid) {
    const lookup = await resolveTikTokSecUid(username, {
      useMockOnError: false,
      logResponse: process.env.NODE_ENV !== "production",
    });
    secUid = lookup.secUid;
    cachedUserInfo = lookup.userInfo ?? cachedUserInfo;
  }

  const secUidString = String(secUid);

  let providerData;
  try {
    providerData = await fetchTikTokData({
      username,
      secUid: secUidString,
      useMockOnError: false,
    });
  } catch (error) {
    if (error?.message) {
      throw error;
    }
    throw new Error("Failed to fetch TikTok media.");
  }

  const resolvedFollowers =
    Number(providerData?.account?.stats?.followers ?? 0) ||
    Number(providerData?.account?.stats?.followers ?? 0);

  const cachedFollowerCount = Number(
    cachedUserInfo?.stats?.followerCount ??
      cachedUserInfo?.stats?.follower_count ??
      cachedUserInfo?.stats?.fans ??
      0
  ) || 0;

  if (!resolvedFollowers && cachedFollowerCount) {
    providerData.account.stats = {
      ...(providerData.account.stats ?? {}),
      followers: cachedFollowerCount,
    };
  }

  const metadata = {
    ...(providerData.account?.metadata ?? {}),
    secUid: secUidString,
    username,
    sourceUrl: accountUrl,
    ...(cachedUserInfo ? { userInfo: cachedUserInfo } : {}),
  };

  const accountPayload = {
    ...providerData.account,
    accountId: secUidString,
    username: providerData.account.username || username,
    profileUrl: providerData.account.profileUrl ?? accountUrl,
    metadata,
  };

  const { platformAccount } = await upsertPlatformData({
    userId: requestUserId ?? existingAccount?.user ?? null,
    platform: "tiktok",
    account: accountPayload,
    media: providerData.media,
  });

  const populatedAccount = await PlatformAccount.findById(platformAccount._id).lean();
  const mediaItems = await MediaItem.find({ account: platformAccount._id })
    .sort({ publishedAt: -1 })
    .lean();

  return NextResponse.json({
    success: true,
    platform: "tiktok",
    account: populatedAccount,
    media: mediaItems,
  });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const accountUrl = body?.url;
    const userId = body?.userId ?? null;

    if (!accountUrl) {
      return NextResponse.json(
        { error: "Request body must include an account 'url'." },
        { status: 400 }
      );
    }

    const platform = detectPlatformFromUrl(accountUrl);

    if (!platform) {
      return NextResponse.json(
        { error: "Unable to detect social platform from the provided URL." },
        { status: 400 }
      );
    }

    if (platform === "instagram") {
      return await handleInstagramAccount({ accountUrl, userId });
    } else if (platform === "tiktok") {
      return await handleTikTokAccount({ accountUrl, userId });
    } else {
      return NextResponse.json(
        { error: `Platform '${platform}' is not yet supported for onboarding.` },
        { status: 501 }
      );
    }
  } catch (error) {
    console.error("[accounts:create]", error);
    const status =
      error?.response?.status ??
      (/not found/i.test(error.message ?? "") ? 404 : 500);

    return NextResponse.json(
      { error: error.message || "Failed to add platform account." },
      { status }
    );
  }
}
