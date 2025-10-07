import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    accountIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PlatformAccount",
      },
    ],
  },
  { timestamps: true }
);

projectSchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

const Project = mongoose.models.Project || mongoose.model("Project", projectSchema);

export default Project;
