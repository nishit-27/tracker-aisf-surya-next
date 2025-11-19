import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import MediaItem from "@/lib/models/MediaItem";
import { normaliseRunableFilter } from "@/lib/utils/runableFilter";

export const dynamic = "force-dynamic";

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function serialiseMediaItem(item) {
  if (!item) {
    return null;
  }

  return {
    ...item,
    _id: String(item._id),
    account: item.account ? String(item.account) : null,
    createdAt: item.createdAt
      ? new Date(item.createdAt).toISOString()
      : null,
    updatedAt: item.updatedAt
      ? new Date(item.updatedAt).toISOString()
      : null,
    publishedAt: item.publishedAt
      ? new Date(item.publishedAt).toISOString()
      : null,
  };
}

function normaliseRunableInput(value) {
  if (value === null) {
    return { value: null, valid: true };
  }

  const token = normaliseRunableFilter(value, null);

  if (!token) {
    return { value: null, valid: false };
  }

  if (token === "all") {
    return { value: null, valid: true };
  }

  return {
    value: token === "runable",
    valid: true,
  };
}

export async function PATCH(request, context = {}) {
  try {
    const paramsInput = context?.params;
    const resolvedParams =
      typeof paramsInput?.then === "function" ? await paramsInput : paramsInput || {};
    const mediaId = resolvedParams?.id;

    if (!mediaId || !isValidObjectId(mediaId)) {
      return NextResponse.json(
        { success: false, error: "Invalid media identifier." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || body.runable === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing runable value." },
        { status: 400 }
      );
    }

    const { value: runableValue, valid } = normaliseRunableInput(body.runable);

    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Invalid runable value." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const media = await MediaItem.findByIdAndUpdate(
      mediaId,
      { $set: { runable: runableValue } },
      { new: true, timestamps: false }
    ).lean();

    if (!media) {
      return NextResponse.json(
        { success: false, error: "Media item not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, media: serialiseMediaItem(media) });
  } catch (error) {
    console.error("[media:update:runable]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update media." },
      { status: 500 }
    );
  }
}
