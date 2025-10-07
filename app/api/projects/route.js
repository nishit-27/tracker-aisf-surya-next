import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/lib/models/Project";
import PlatformAccount from "@/lib/models/PlatformAccount";

export const dynamic = "force-dynamic";

function normaliseAccountIds(accountIds = []) {
  if (!Array.isArray(accountIds)) {
    return [];
  }

  const unique = Array.from(
    new Set(
      accountIds
        .map((value) => {
          if (typeof value === "string") {
            return value.trim();
          }
          if (value && value._id) {
            return String(value._id);
          }
          return null;
        })
        .filter(Boolean)
    )
  );

  return unique
    .filter((value) => mongoose.Types.ObjectId.isValid(value))
    .map((value) => new mongoose.Types.ObjectId(value));
}

function serializeProject(project, accountMap = new Map()) {
  if (!project) {
    return null;
  }

  const accountIds = (project.accountIds || []).map((id) => String(id));
  const accounts = accountIds
    .map((id) => {
      const account = accountMap.get(id);
      if (!account) {
        return null;
      }
      return {
        ...account,
        _id: String(account._id),
      };
    })
    .filter(Boolean);

  return {
    _id: String(project._id),
    name: project.name,
    description: project.description ?? "",
    accountIds,
    accounts,
    createdAt: project.createdAt ? project.createdAt.toISOString?.() || new Date(project.createdAt).toISOString() : null,
    updatedAt: project.updatedAt ? project.updatedAt.toISOString?.() || new Date(project.updatedAt).toISOString() : null,
  };
}

export async function GET() {
  try {
    await connectToDatabase();

    const projects = await Project.find({}).sort({ name: 1 }).lean();
    const allAccountIds = Array.from(
      new Set(
        projects.flatMap((project) => (project.accountIds || []).map((id) => String(id)))
      )
    );

    const accounts = await PlatformAccount.find({ _id: { $in: allAccountIds } })
      .sort({ displayName: 1, username: 1 })
      .lean();

    const accountMap = new Map(accounts.map((account) => [String(account._id), account]));

    const payload = projects.map((project) => serializeProject(project, accountMap));

    return NextResponse.json({ success: true, projects: payload });
  } catch (error) {
    console.error("[projects:get]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch projects." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const name = body?.name?.trim();
    const description = body?.description?.trim?.() ?? "";
    const accountIds = normaliseAccountIds(body?.accountIds);

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Project name is required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existing = await Project.findOne({ name })
      .collation({ locale: "en", strength: 2 })
      .lean();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A project with this name already exists." },
        { status: 409 }
      );
    }

    const project = await Project.create({ name, description, accountIds });
    const created = await Project.findById(project._id).lean();

    const accounts = await PlatformAccount.find({ _id: { $in: accountIds } })
      .sort({ displayName: 1, username: 1 })
      .lean();

    const accountMap = new Map(accounts.map((account) => [String(account._id), account]));

    return NextResponse.json(
      {
        success: true,
        project: serializeProject(created, accountMap),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[projects:post]", error);
    const status = error?.code === 11000 ? 409 : 500;
    const message =
      error?.code === 11000
        ? "A project with this name already exists."
        : error.message || "Failed to create project.";

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
