import { NextResponse } from "next/server";
import { refreshTrackedAccounts } from "@/lib/jobs/refreshTrackedAccounts";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId = null } = body;

    // Add timeout to the entire refresh operation
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Refresh operation timeout after 120 seconds')), 120000)
    );
    
    const result = await Promise.race([
      refreshTrackedAccounts({ userId }),
      timeoutPromise
    ]);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[accounts:refresh]", error);
    return NextResponse.json(
      { error: error.message || "Failed to refresh accounts." },
      { status: 500 }
    );
  }
}
