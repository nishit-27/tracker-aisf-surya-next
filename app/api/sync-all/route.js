import { NextResponse } from "next/server";
import { syncAllPlatforms } from "@/lib/jobs/syncAllPlatforms";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const secret = process.env.SYNC_WEBHOOK_SECRET;
    if (secret) {
      const header = request.headers.get("authorization") ?? "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : null;
      if (token !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const { userId = null } = body;

    const results = await syncAllPlatforms({ userId });

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("[sync-all]", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync platforms." },
      { status: 500 }
    );
  }
}
