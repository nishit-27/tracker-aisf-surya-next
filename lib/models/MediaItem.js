import mongoose from "mongoose";

const metricSnapshotSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    views: Number,
    likes: Number,
    comments: Number,
    shares: Number,
    saves: Number,
    impressions: Number,
    engagementRate: Number,
  },
  { _id: false }
);

const mediaItemSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformAccount",
      required: true,
      index: true,
    },
    platform: {
      type: String,
      required: true,
      enum: ["instagram", "tiktok", "youtube"],
      index: true,
    },
    externalId: { type: String, required: true },
    title: { type: String },
    caption: { type: String },
    url: { type: String },
    thumbnailUrl: { type: String },
    publishedAt: { type: Date },
    metrics: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      saves: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      engagementRate: { type: Number, default: 0 },
    },
    history: {
      type: [metricSnapshotSchema],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

mediaItemSchema.index({ account: 1, externalId: 1 }, { unique: true });

const MediaItem =
  mongoose.models.MediaItem || mongoose.model("MediaItem", mediaItemSchema);

export default MediaItem;
