import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import MediaItem from "@/lib/models/MediaItem";
import { supportedPlatforms } from "@/lib/platforms";
import { applyRunableFilterToQuery } from "@/lib/utils/runableFilter";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortBy = searchParams.get("sortBy") ?? "publishedAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const runableFilter = searchParams.get("runable");

    const query = {};

    if (platform) {
      if (!supportedPlatforms.includes(platform)) {
        return NextResponse.json(
          { error: `Unsupported platform: ${platform}` },
          { status: 400 }
        );
      }
      query.platform = platform;
    }

    if (startDate || endDate) {
      query.publishedAt = {};
      if (startDate) {
        query.publishedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.publishedAt.$lte = new Date(endDate);
      }
    }

    applyRunableFilterToQuery(query, runableFilter);

    const media = await MediaItem.find(query)
      .sort({ [sortBy]: sortOrder })
      .lean();

    return NextResponse.json({ media });
  } catch (error) {
    console.error("[media:list]", error);
    return NextResponse.json(
      { error: error.message || "Failed to load media." },
      { status: 500 }
    );
  }
}
