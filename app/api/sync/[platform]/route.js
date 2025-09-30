import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { fetchPlatformData, supportedPlatforms } from "@/lib/platforms";
import { upsertPlatformData } from "@/lib/services/syncService";
import PlatformAccount from "@/lib/models/PlatformAccount";
import MediaItem from "@/lib/models/MediaItem";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const { platform } = await params;

    if (!supportedPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Unsupported platform: ${platform}` },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { userId = null } = body;

    await connectToDatabase();

    const providerData = await fetchPlatformData(platform);

    const { platformAccount } = await upsertPlatformData({
      userId,
      platform,
      account: providerData.account,
      media: providerData.media,
    });

    const mediaItems = await MediaItem.find({ account: platformAccount._id })
      .sort({ publishedAt: -1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        platform,
        account: platformAccount,
        media: mediaItems,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`[sync:${params?.platform}]`, error);
    return NextResponse.json(
      { error: error.message || "Failed to sync platform." },
      { status: 500 }
    );
  }
}

export async function GET(_, { params }) {
  try {
    const { platform } = await params;

    if (!supportedPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Unsupported platform: ${platform}` },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const account = await PlatformAccount.findOne({ platform })
      .sort({ updatedAt: -1 })
      .lean();

    if (!account) {
      return NextResponse.json(
        { error: `No data found for platform: ${platform}` },
        { status: 404 }
      );
    }

    const media = await MediaItem.find({ account: account._id })
      .sort({ publishedAt: -1 })
      .lean();

    return NextResponse.json({ platform, account, media });
  } catch (error) {
    console.error(`[sync:get:${params?.platform}]`, error);
    return NextResponse.json(
      { error: error.message || "Failed to load platform data." },
      { status: 500 }
    );
  }
}
