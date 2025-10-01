import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import PlatformAccount from "@/lib/models/PlatformAccount";
import MediaItem from "@/lib/models/MediaItem";
import { fetchPlatformData } from "@/lib/platforms";
import { upsertPlatformData } from "@/lib/services/syncService";

export const dynamic = "force-dynamic";

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
  const username = typeof baseUsername === "string" ? baseUsername.replace(/^@+/, "").trim() : null;

  if (account.platform === "instagram") {
    const userId = stringOrNull(metadata?.instagramUserId) || storedAccountId;
    return {
      username,
      userId,
      useMockOnError: false,
    };
  }

  if (account.platform === "tiktok") {
    const secUid = stringOrNull(metadata?.secUid) || storedAccountId;
    return {
      username,
      secUid,
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
      username,
      channelId: metadataChannelId || storedAccountId,
      identifier:
        stringOrNull(metadata?.identifierUsed) || handleWithAt || username || null,
      handle: handleWithAt,
      url: stringOrNull(metadata?.sourceUrl) || stringOrNull(account?.profileUrl),
      useMockOnError: false,
    };
  }

  return null;
}

function mergeAccountPayload(existingAccount, providerAccount, identifiers = {}) {
  const existingMetadata = normalizeMetadata(existingAccount?.metadata);
  const providerMetadata = normalizeMetadata(providerAccount?.metadata);
  const mergedMetadata = {
    ...existingMetadata,
    ...providerMetadata,
    ...identifiers,
  };

  return {
    ...providerAccount,
    accountId: providerAccount?.accountId ?? existingAccount?.accountId,
    username: providerAccount?.username ?? existingAccount?.username,
    displayName: providerAccount?.displayName ?? existingAccount?.displayName,
    profileUrl: providerAccount?.profileUrl ?? existingAccount?.profileUrl ?? null,
    metadata: mergedMetadata,
  };
}

export async function POST(_request, { params }) {
  const { accountId } = await params;

  if (!accountId || !mongoose.Types.ObjectId.isValid(accountId)) {
    return NextResponse.json(
      { error: "A valid account ID must be provided." },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to connect to the database." },
      { status: 500 }
    );
  }

  const existingAccount = await PlatformAccount.findById(accountId).lean();

  if (!existingAccount) {
    return NextResponse.json(
      { error: "Account not found." },
      { status: 404 }
    );
  }

  const options = buildFetcherOptions(existingAccount);

  if (!options) {
    return NextResponse.json(
      { error: `Platform '${existingAccount.platform}' is not supported for refresh yet.` },
      { status: 501 }
    );
  }

  const hasIdentifier = Boolean(options.userId || options.secUid || options.channelId);

  if (!hasIdentifier) {
    return NextResponse.json(
      {
        error:
          "Stored platform identifier is missing. Re-add the account to capture the required ID.",
      },
      { status: 400 }
    );
  }

  try {
    const providerData = await fetchPlatformData(existingAccount.platform, options);

    const identifiers = {};
    if (existingAccount.platform === "instagram") {
      identifiers.instagramUserId = options.userId;
    } else if (existingAccount.platform === "tiktok") {
      identifiers.secUid = options.secUid;
    } else if (existingAccount.platform === "youtube") {
      identifiers.channelId = options.channelId;
      if (options.handle) {
        identifiers.handle = options.handle;
      }
      if (options.identifier) {
        identifiers.identifierUsed = options.identifier;
      }
    }
    if (options.username) {
      identifiers.username = options.username;
    }

    const accountPayload = mergeAccountPayload(
      existingAccount,
      providerData.account,
      identifiers
    );

    const { platformAccount } = await upsertPlatformData({
      userId: existingAccount.user ?? null,
      platform: existingAccount.platform,
      account: accountPayload,
      media: providerData.media,
    });

    const refreshedAccount = await PlatformAccount.findById(platformAccount._id).lean();
    const mediaItems = await MediaItem.find({ account: platformAccount._id })
      .sort({ publishedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      platform: existingAccount.platform,
      account: {
        ...refreshedAccount,
        _id: String(refreshedAccount._id),
      },
      media: mediaItems.map((item) => ({
        ...item,
        _id: String(item._id),
        account: String(item.account),
      })),
    });
  } catch (error) {
    console.error("[accounts:refresh-single]", error);
    return NextResponse.json(
      { error: error.message || "Failed to refresh account." },
      { status: error?.response?.status ?? 500 }
    );
  }
}
