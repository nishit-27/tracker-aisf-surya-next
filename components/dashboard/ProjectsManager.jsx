"use client";

import { useCallback, useMemo, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";

function formatAccountName(account) {
  return (
    account?.displayName ||
    account?.username ||
    account?.accountId ||
    "Untitled account"
  );
}

function formatPlatformLabel(platform) {
  if (!platform) {
    return "Unknown platform";
  }
  const formatted = String(platform).toLowerCase();
  if (formatted === "youtube") {
    return "YouTube";
  }
  if (formatted === "tiktok") {
    return "TikTok";
  }
  if (formatted === "instagram") {
    return "Instagram";
  }
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function AccountToggleGrid({
  accounts = [],
  selectedIds = [],
  onToggle,
  disabled = false,
}) {
  const selection = useMemo(() => new Set(selectedIds.map((id) => String(id))), [selectedIds]);

  if (!accounts.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
        Add social accounts to start grouping them into projects.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account) => {
        const accountId = String(account._id);
        const isSelected = selection.has(accountId);
        return (
          <button
            key={accountId}
            type="button"
            onClick={() => onToggle?.(accountId)}
            disabled={disabled}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
              isSelected
                ? "border-sky-400/60 bg-sky-400/10 text-white"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
            } ${disabled ? "cursor-not-allowed opacity-75" : ""}`.trim()}
          >
            <div>
              <p className="text-sm font-semibold">{formatAccountName(account)}</p>
              <p className="text-xs text-slate-400">{formatPlatformLabel(account.platform)}</p>
            </div>
            {isSelected ? <CheckCircle2 className="h-4 w-4 text-sky-300" /> : null}
          </button>
        );
      })}
    </div>
  );
}

export default function ProjectsManager({
  projects = [],
  accounts = [],
  isLoading = false,
  error = null,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onReloadProjects,
}) {
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    accountIds: [],
  });
  const [createError, setCreateError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    accountIds: [],
  });
  const [editError, setEditError] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const sortedAccounts = useMemo(() => {
    return [...(accounts || [])]
      .map((account) => ({ ...account, _id: String(account._id) }))
      .sort((a, b) => formatAccountName(a).localeCompare(formatAccountName(b)));
  }, [accounts]);

  const resetCreateForm = useCallback(() => {
    setCreateForm({ name: "", description: "", accountIds: [] });
    setCreateError(null);
  }, []);

  const toggleCreateAccount = useCallback((accountId) => {
    setCreateForm((current) => {
      const exists = current.accountIds.includes(accountId);
      const accountIds = exists
        ? current.accountIds.filter((id) => id !== accountId)
        : [...current.accountIds, accountId];
      return { ...current, accountIds };
    });
  }, []);

  const toggleEditAccount = useCallback((accountId) => {
    setEditForm((current) => {
      const exists = current.accountIds.includes(accountId);
      const accountIds = exists
        ? current.accountIds.filter((id) => id !== accountId)
        : [...current.accountIds, accountId];
      return { ...current, accountIds };
    });
  }, []);

  const handleCreateSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (!onCreateProject) {
      return;
    }

    const trimmedName = createForm.name.trim();
    if (!trimmedName) {
      setCreateError("Project name is required.");
      return;
    }

    setCreateError(null);
    setIsCreating(true);

    try {
      const result = await onCreateProject({
        name: trimmedName,
        description: createForm.description.trim(),
        accountIds: createForm.accountIds,
      });

      if (!result?.success) {
        setCreateError(result?.error || "Unable to create project.");
        return;
      }

      resetCreateForm();
    } catch (submissionError) {
      console.error("[projects:create]", submissionError);
      setCreateError(submissionError.message || "Unable to create project.");
    } finally {
      setIsCreating(false);
    }
  }, [createForm, onCreateProject, resetCreateForm]);

  const handleStartEdit = useCallback((project) => {
    if (!project) {
      return;
    }
    setEditingProjectId(project._id);
    setEditError(null);
    setEditForm({
      name: project.name ?? "",
      description: project.description ?? "",
      accountIds: [...(project.accountIds || []).map((id) => String(id))],
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingProjectId(null);
    setEditForm({ name: "", description: "", accountIds: [] });
    setEditError(null);
  }, []);

  const handleEditSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (!editingProjectId || !onUpdateProject) {
      return;
    }

    const trimmedName = editForm.name.trim();
    if (!trimmedName) {
      setEditError("Project name is required.");
      return;
    }

    setEditError(null);
    setIsSavingEdit(true);

    try {
      const result = await onUpdateProject(editingProjectId, {
        name: trimmedName,
        description: editForm.description.trim(),
        accountIds: editForm.accountIds,
      });

      if (!result?.success) {
        setEditError(result?.error || "Unable to update project.");
        return;
      }

      handleCancelEdit();
    } catch (submissionError) {
      console.error("[projects:update]", submissionError);
      setEditError(submissionError.message || "Unable to update project.");
    } finally {
      setIsSavingEdit(false);
    }
  }, [editingProjectId, editForm, onUpdateProject, handleCancelEdit]);

  const handleDelete = useCallback(async (projectId) => {
    if (!onDeleteProject) {
      return;
    }

    const confirmed = typeof window !== "undefined"
      ? window.confirm("Delete this project? This action cannot be undone.")
      : true;

    if (!confirmed) {
      return;
    }

    setDeletingId(projectId);

    try {
      const result = await onDeleteProject(projectId);
      if (!result?.success) {
        console.error("[projects:delete]", result?.error);
      }
      if (editingProjectId === projectId) {
        handleCancelEdit();
      }
    } catch (submissionError) {
      console.error("[projects:delete]", submissionError);
    } finally {
      setDeletingId(null);
    }
  }, [onDeleteProject, editingProjectId, handleCancelEdit]);

  const totalSelectedForCreate = createForm.accountIds.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Manage projects</h2>
          <p className="text-sm text-slate-400">
            Organise accounts into shareable groups for quick filtering across the dashboard.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Refreshing
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => onReloadProjects?.()}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-white/30 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <section className="rounded-3xl border border-white/5 bg-[#101125] p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Create a project</h3>
            <p className="text-xs text-slate-400">
              Pick a name and assign accounts. Projects become available as filters in the floating bar.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Users className="h-3.5 w-3.5" />
            {totalSelectedForCreate} selected
          </div>
        </div>

        <form onSubmit={handleCreateSubmit} className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                Project name
              </span>
              <input
                type="text"
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Spring launch"
                className="rounded-xl border border-white/10 bg-[#0b0c19] px-3 py-2 text-sm text-white outline-none focus:border-sky-400/80"
                disabled={isCreating}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                Description
              </span>
              <input
                type="text"
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Optional context"
                className="rounded-xl border border-white/10 bg-[#0b0c19] px-3 py-2 text-sm text-white outline-none focus:border-sky-400/80"
                disabled={isCreating}
              />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                Assign accounts
              </span>
              <button
                type="button"
                onClick={() => setCreateForm((current) => ({ ...current, accountIds: [] }))}
                className="text-xs font-medium text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
                disabled={isCreating || !createForm.accountIds.length}
              >
                Clear selection
              </button>
            </div>
            <AccountToggleGrid
              accounts={sortedAccounts}
              selectedIds={createForm.accountIds}
              onToggle={toggleCreateAccount}
              disabled={isCreating}
            />
          </div>

          {createError ? (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {createError}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={resetCreateForm}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-white/30 hover:text-white"
              disabled={isCreating || (!createForm.name && !createForm.description && !createForm.accountIds.length)}
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {isCreating ? "Creating" : "Create project"}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Existing projects</h3>
        {!projects.length ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-slate-400">
            No projects yet. Use the form above to group accounts into a project.
          </div>
        ) : (
          projects.map((project) => {
            const isEditing = editingProjectId === project._id;
            const assignedAccounts = project.accounts || [];
            return (
              <div
                key={project._id}
                className="rounded-3xl border border-white/5 bg-[#0b0c19] p-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{project.name}</h4>
                    {project.description ? (
                      <p className="mt-1 text-sm text-slate-400">{project.description}</p>
                    ) : null}
                    <p className="mt-3 text-xs text-slate-500">
                      {project.accountIds?.length || 0} {project.accountIds?.length === 1 ? "account" : "accounts"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditing) {
                          handleCancelEdit();
                        } else {
                          handleStartEdit(project);
                        }
                      }}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        isEditing
                          ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
                          : "border-white/10 text-slate-200 hover:border-white/30 hover:text-white"
                      }`}
                    >
                      {isEditing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />} 
                      {isEditing ? "Cancel" : "Edit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(project._id)}
                      disabled={deletingId === project._id}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:border-rose-400/60 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === project._id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Delete
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <form onSubmit={handleEditSubmit} className="mt-6 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="flex flex-col gap-2 text-sm text-slate-200">
                        <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                          Project name
                        </span>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(event) =>
                            setEditForm((current) => ({ ...current, name: event.target.value }))
                          }
                          className="rounded-xl border border-white/10 bg-[#0f101c] px-3 py-2 text-sm text-white outline-none focus:border-sky-400/80"
                          disabled={isSavingEdit}
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm text-slate-200">
                        <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                          Description
                        </span>
                        <input
                          type="text"
                          value={editForm.description}
                          onChange={(event) =>
                            setEditForm((current) => ({ ...current, description: event.target.value }))
                          }
                          className="rounded-xl border border-white/10 bg-[#0f101c] px-3 py-2 text-sm text-white outline-none focus:border-sky-400/80"
                          disabled={isSavingEdit}
                        />
                      </label>
                    </div>

                    <div className="space-y-3">
                      <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                        Assign accounts
                      </span>
                      <AccountToggleGrid
                        accounts={sortedAccounts}
                        selectedIds={editForm.accountIds}
                        onToggle={toggleEditAccount}
                        disabled={isSavingEdit}
                      />
                    </div>

                    {editError ? (
                      <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                        {editError}
                      </div>
                    ) : null}

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-white/30 hover:text-white"
                        disabled={isSavingEdit}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingEdit}
                        className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isSavingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        {isSavingEdit ? "Saving" : "Save changes"}
                      </button>
                    </div>
                  </form>
                ) : assignedAccounts.length ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {assignedAccounts.map((account) => (
                      <span
                        key={account._id}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
                      >
                        <span className="font-medium">{formatAccountName(account)}</span>
                        <span className="text-slate-400">· {formatPlatformLabel(account.platform)}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-400">
                    No accounts assigned yet.
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
