import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/lib/models/Project";
import PlatformAccount from "@/lib/models/PlatformAccount";

export const dynamic = "force-dynamic";

function normaliseAccountIds(accountIds = []) {
  if (!Array.isArray(accountIds)) {
    return null;
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

  const objectIds = unique
    .filter((value) => mongoose.Types.ObjectId.isValid(value))
    .map((value) => new mongoose.Types.ObjectId(value));

  return objectIds;
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

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

async function buildAccountMap(accountIds = []) {
  if (!accountIds.length) {
    return new Map();
  }

  const accounts = await PlatformAccount.find({ _id: { $in: accountIds } })
    .sort({ displayName: 1, username: 1 })
    .lean();

  return new Map(accounts.map((account) => [String(account._id), account]));
}

export async function GET(_request, { params }) {
  try {
    const projectId = params?.id;

    if (!projectId || !isValidObjectId(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project identifier." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const project = await Project.findById(projectId).lean();

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found." },
        { status: 404 }
      );
    }

    const accountMap = await buildAccountMap(project.accountIds || []);

    return NextResponse.json({ success: true, project: serializeProject(project, accountMap) });
  } catch (error) {
    console.error("[projects:get:id]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch project." },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const projectId = params?.id;

    if (!projectId || !isValidObjectId(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project identifier." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const updates = {};

    if (body?.name !== undefined) {
      const trimmed = body.name?.trim?.();
      if (!trimmed) {
        return NextResponse.json(
          { success: false, error: "Project name cannot be empty." },
          { status: 400 }
        );
      }
      updates.name = trimmed;
    }

    if (body?.description !== undefined) {
      updates.description = body.description?.trim?.() ?? "";
    }

    if (body?.accountIds !== undefined) {
      const accountIds = normaliseAccountIds(body.accountIds);
      updates.accountIds = accountIds ?? [];
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json(
        { success: false, error: "No valid fields provided for update." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    if (updates.name) {
      const existing = await Project.findOne({
        _id: { $ne: projectId },
        name: updates.name,
      })
        .collation({ locale: "en", strength: 2 })
        .lean();

      if (existing) {
        return NextResponse.json(
          { success: false, error: "A project with this name already exists." },
          { status: 409 }
        );
      }
    }

    const project = await Project.findByIdAndUpdate(
      projectId,
      { $set: updates },
      { new: true }
    ).lean();

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found." },
        { status: 404 }
      );
    }

    const accountMap = await buildAccountMap(project.accountIds || []);

    return NextResponse.json({ success: true, project: serializeProject(project, accountMap) });
  } catch (error) {
    console.error("[projects:patch:id]", error);
    const status = error?.code === 11000 ? 409 : 500;
    const message =
      error?.code === 11000
        ? "A project with this name already exists."
        : error.message || "Failed to update project.";

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    const projectId = params?.id;

    if (!projectId || !isValidObjectId(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project identifier." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const deleted = await Project.findByIdAndDelete(projectId).lean();

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Project not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[projects:delete:id]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete project." },
      { status: 500 }
    );
  }
}
