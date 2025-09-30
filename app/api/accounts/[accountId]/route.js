import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import PlatformAccount from "@/lib/models/PlatformAccount";
import MediaItem from "@/lib/models/MediaItem";

export const dynamic = "force-dynamic";

export async function DELETE(_request, { params }) {
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

  try {
    const mediaResult = await MediaItem.deleteMany({ account: accountId });
    await PlatformAccount.deleteOne({ _id: accountId });

    return NextResponse.json({
      success: true,
      deletedAccountId: accountId,
      mediaDeleted: mediaResult?.deletedCount ?? 0,
    });
  } catch (error) {
    console.error("[accounts:delete]", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete account." },
      { status: 500 }
    );
  }
}
