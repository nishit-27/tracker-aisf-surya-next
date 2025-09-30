import mongoose from "mongoose";

const statsSchema = new mongoose.Schema(
  {
    followers: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    totalComments: { type: Number, default: 0 },
    totalShares: { type: Number, default: 0 },
    totalImpressions: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 },
  },
  { _id: false }
);

const historyEntrySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    followers: Number,
    totalViews: Number,
    totalLikes: Number,
    totalComments: Number,
    totalShares: Number,
    totalImpressions: Number,
    engagementRate: Number,
  },
  { _id: false }
);

const platformAccountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    platform: {
      type: String,
      required: true,
      index: true,
      enum: ["instagram", "tiktok", "youtube"],
    },
    accountId: { type: String, required: true },
    username: { type: String },
    displayName: { type: String },
    profileUrl: { type: String },
    stats: statsSchema,
    history: {
      type: [historyEntrySchema],
      default: [],
    },
    lastSyncedAt: { type: Date },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

platformAccountSchema.index({ user: 1, platform: 1, accountId: 1 }, { unique: true });

const PlatformAccount =
  mongoose.models.PlatformAccount ||
  mongoose.model("PlatformAccount", platformAccountSchema);

export default PlatformAccount;
