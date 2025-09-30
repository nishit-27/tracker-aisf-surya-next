import { NextResponse } from "next/server";
import { getOverviewAnalytics } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getOverviewAnalytics();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[analytics:overview]", error);
    return NextResponse.json(
      { error: error.message || "Failed to load analytics overview." },
      { status: 500 }
    );
  }
}
