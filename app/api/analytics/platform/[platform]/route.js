import { NextResponse } from "next/server";
import { getOverviewAnalytics } from "@/lib/queries";
import { supportedPlatforms } from "@/lib/platforms";

export const dynamic = "force-dynamic";

export async function GET(_, { params }) {
  try {
    const { platform } = await params;

    if (!supportedPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Unsupported platform: ${platform}` },
        { status: 400 }
      );
    }

    const data = await getOverviewAnalytics({ platform });

    if (!data.accounts.length) {
      return NextResponse.json(
        { error: `No data found for platform: ${platform}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ platform, ...data });
  } catch (error) {
    console.error(`[analytics:platform:${params?.platform}]`, error);
    return NextResponse.json(
      { error: error.message || "Failed to load platform analytics." },
      { status: 500 }
    );
  }
}
