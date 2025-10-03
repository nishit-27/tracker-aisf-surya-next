"use client";

import { Fragment, useMemo, useState, useCallback } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarClock,
  CheckCircle2,
  Globe2,
  Instagram,
  MoreHorizontal,
  Music2,
  RefreshCw,
  Search,
  Trash2,
  Youtube,
} from "lucide-react";
import AccountAnalysisModal from "./AccountAnalysisModal";

const platformIcons = {
  all: Globe2,
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
};

function formatNumber(value) {
  if (value === undefined || value === null) {
    return "—";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "—";
  }

  const abs = Math.abs(numeric);
  if (abs >= 1_000_000) {
    return `${(numeric / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${(numeric / 1_000).toFixed(1)}K`;
  }
  return numeric.toLocaleString();
}

function formatPercent(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return "0%";
  }
  return `${numeric.toFixed(1)}%`;
}

function formatRelativeTime(dateInput) {
  if (!dateInput) {
    return "N/A";
  }

  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) {
    return "just now";
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `about ${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  }
  const diffYears = Math.floor(diffMonths / 12);
  return `about ${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
}

function buildProfileImage(account) {
  const fallbackName = account.displayName || account.username || account.accountId || "Account";
  return (
    account.metadata?.profile?.profilePictureUrl ||
    account.metadata?.profile?.profile_picture_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=101125&color=ffffff`
  );
}

export default function AccountsTable({
  accounts,
  media = [],
  selectedPlatform = "all",
  onPlatformChange,
  onAccountDeleted,
  onAccountRefreshed,
  onAddAccount,
  platformFilters = ["all"],
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState("all");
  const [sortKey, setSortKey] = useState("followers");
  const [sortDirection, setSortDirection] = useState("desc");
  const [activeMenu, setActiveMenu] = useState(null);
  const [analysisAccount, setAnalysisAccount] = useState(null);
  const [refreshingId, setRefreshingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [errors, setErrors] = useState({});

  const projectOptions = [
    { value: "all", label: "All projects" },
    { value: "launch", label: "Launch Campaign" },
    { value: "ugc", label: "UGC Collaboration" },
    { value: "seasonal", label: "Seasonal Push" },
  ];

  const mediaByAccount = useMemo(() => {
    const map = new Map();
    (media || []).forEach((item) => {
      if (!item?.account) {
        return;
      }
      if (!map.has(item.account)) {
        map.set(item.account, []);
      }
      map.get(item.account).push(item);
    });
    return map;
  }, [media]);

  const processedAccounts = useMemo(() => {
    return (accounts || []).map((account) => {
      const stats = account.stats || {};
      const accountMedia = mediaByAccount.get(account._id) || [];
      const latestMedia = accountMedia.reduce((latest, item) => {
        if (!item?.publishedAt) {
          return latest;
        }
        if (!latest) {
          return item;
        }
        return new Date(item.publishedAt) > new Date(latest.publishedAt) ? item : latest;
      }, null);
      const lastPostAt = latestMedia?.publishedAt || null;
      const mediaCount = Number.isFinite(account.mediaCount) ? account.mediaCount : accountMedia.length;

      return {
        raw: account,
        platform: account.platform || "unknown",
        displayName: account.displayName || account.username || account.accountId || "Untitled account",
        username: account.username || account.accountId || "—",
        followers: stats.followers || 0,
        posts: mediaCount,
        views: stats.totalViews || 0,
        likes: stats.totalLikes || 0,
        comments: stats.totalComments || 0,
        shares: stats.totalShares || 0,
        engagementRate: stats.engagementRate || 0,
        lastPostAt,
        lastSyncedAt: account.lastSyncedAt || account.updatedAt || null,
        profileImage: buildProfileImage(account),
        searchIndex: `${account.displayName || ""} ${account.username || ""} ${account.accountId || ""}`.toLowerCase(),
        media: accountMedia,
      };
    });
  }, [accounts, mediaByAccount]);

  const filteredRows = useMemo(() => {
    return processedAccounts
      .filter((entry) => {
        if (selectedPlatform !== "all" && entry.platform !== selectedPlatform) {
          return false;
        }
        if (searchTerm.trim()) {
          return entry.searchIndex.includes(searchTerm.trim().toLowerCase());
        }
        return true;
      })
      .sort((a, b) => {
        const direction = sortDirection === "asc" ? 1 : -1;
        switch (sortKey) {
          case "followers":
          case "posts":
          case "views":
          case "likes":
          case "comments":
          case "shares":
          case "engagementRate":
            return (a[sortKey] - b[sortKey]) * direction;
          case "platform":
            return a.platform.localeCompare(b.platform) * direction;
          case "lastPostAt": {
            const aTime = a.lastPostAt ? new Date(a.lastPostAt).getTime() : 0;
            const bTime = b.lastPostAt ? new Date(b.lastPostAt).getTime() : 0;
            return (aTime - bTime) * direction;
          }
          case "lastSyncedAt": {
            const aTime = a.lastSyncedAt ? new Date(a.lastSyncedAt).getTime() : 0;
            const bTime = b.lastSyncedAt ? new Date(b.lastSyncedAt).getTime() : 0;
            return (aTime - bTime) * direction;
          }
          default:
            return 0;
        }
      });
  }, [processedAccounts, searchTerm, selectedPlatform, sortKey, sortDirection]);

  const toggleSort = useCallback((key) => {
    setSortKey((currentKey) => {
      if (currentKey === key) {
        setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
        return currentKey;
      }
      setSortDirection("desc");
      return key;
    });
  }, []);

  const handleRefresh = useCallback(
    async (accountId) => {
      if (typeof onAccountRefreshed !== "function" || !accountId) {
        return;
      }
      try {
        setRefreshingId(accountId);
        setErrors((prev) => {
          const next = { ...prev };
          delete next[accountId];
          return next;
        });
        await onAccountRefreshed(accountId);
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          [accountId]: error.message || "Failed to refresh account.",
        }));
      } finally {
        setRefreshingId(null);
      }
    },
    [onAccountRefreshed]
  );

  const handleDelete = useCallback(
    async (account) => {
      if (!account?.raw?._id || typeof onAccountDeleted !== "function") {
        return;
      }
      const label = account.displayName;
      const confirmed = window.confirm(
        `Delete ${label}? This will remove the account and all synced media.`
      );
      if (!confirmed) {
        return;
      }
      try {
        setDeletingId(account.raw._id);
        setErrors((prev) => {
          const next = { ...prev };
          delete next[account.raw._id];
          return next;
        });

        const response = await fetch(`/api/accounts/${account.raw._id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error || "Failed to delete account.");
        }

        await onAccountDeleted(account.raw._id);
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          [account.raw._id]: error.message || "Failed to delete account.",
        }));
      } finally {
        setDeletingId(null);
      }
    },
    [onAccountDeleted]
  );

  const columns = [
    { id: "account", label: "Account", sortable: false, className: "min-w-[220px]" },
    { id: "platform", label: "Platform", sortable: true, sortKey: "platform", className: "min-w-[120px]" },
    { id: "lastPost", label: "Last post", sortable: true, sortKey: "lastPostAt", className: "min-w-[120px]" },
    { id: "followers", label: "Followers", sortable: true, sortKey: "followers", align: "text-right" },
    { id: "posts", label: "Posts", sortable: true, sortKey: "posts", align: "text-right" },
    { id: "views", label: "Views", sortable: true, sortKey: "views", align: "text-right" },
    { id: "likes", label: "Likes", sortable: true, sortKey: "likes", align: "text-right" },
    { id: "comments", label: "Comments", sortable: true, sortKey: "comments", align: "text-right" },
    { id: "engagementRate", label: "Engagement", sortable: true, sortKey: "engagementRate", align: "text-right" },
    { id: "lastSyncedAt", label: "Last sync", sortable: true, sortKey: "lastSyncedAt", align: "text-right", className: "min-w-[120px]" },
    { id: "actions", label: "", sortable: false, className: "w-12" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/5 bg-[#101125] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Accounts</h2>
            <p className="text-sm text-slate-400">
              View and analyse performance metrics for your tracked social media accounts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAddAccount}
              className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              <CheckCircle2 className="h-4 w-4" />
              Track Account
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-[#111327] px-4 py-2">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              type="search"
              placeholder="Search by name…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="min-w-[200px] bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-[#111327] px-4 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
              Select projects
            </span>
            <select
              value={selectedProject}
              onChange={(event) => setSelectedProject(event.target.value)}
              className="bg-transparent text-sm font-semibold text-white focus:outline-none"
            >
              {projectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-[#111327] px-3 py-2">
            {platformFilters.map((platformKey) => {
              const Icon = platformIcons[platformKey] || Globe2;
              const isActive = selectedPlatform === platformKey;
              return (
                <button
                  key={platformKey}
                  type="button"
                  onClick={() => onPlatformChange?.(platformKey)}
                  className={`flex h-9 w-9 items-center justify-center rounded-2xl transition ${
                    isActive ? "bg-sky-500/20 text-sky-300" : "text-slate-400 hover:text-sky-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#0b0c19]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/5">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.28em] text-slate-500">
                {columns.map((column) => {
                  const isActiveSort = column.sortable && sortKey === column.sortKey;
                  return (
                    <th
                      key={column.id}
                      scope="col"
                      className={`whitespace-nowrap px-4 py-4 font-semibold ${column.className || ""} ${column.align || "text-left"}`.trim()}
                    >
                      {column.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column.sortKey)}
                          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 hover:text-slate-200"
                        >
                          {column.label}
                          {isActiveSort ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-600" />
                          )}
                        </button>
                      ) : (
                        <span>{column.label}</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-16 text-center text-sm text-slate-400">
                    No accounts match the current filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((entry) => {
                  const Icon = platformIcons[entry.platform] || Globe2;
                  const accountId = entry.raw._id;
                  const isRefreshing = refreshingId === accountId;
                  const isDeleting = deletingId === accountId;
                  const errorMessage = errors[accountId];

                  return (
                    <Fragment key={accountId}>
                      <tr className="group relative transition hover:bg-white/5">
                        {columns.map((column) => {
                          switch (column.id) {
                          case "account":
                            return (
                              <td key={column.id} className="whitespace-nowrap px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/10 bg-[#131527]">
                                    <img
                                      src={entry.profileImage}
                                      alt={entry.displayName}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-white">{entry.displayName}</p>
                                    <p className="text-xs text-slate-500">{entry.username}</p>
                                  </div>
                                </div>
                              </td>
                            );
                          case "platform":
                            return (
                              <td key={column.id} className="whitespace-nowrap px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white">
                                    <Icon className="h-4 w-4" />
                                  </span>
                                  <span className="text-sm font-medium capitalize text-white">
                                    {entry.platform}
                                  </span>
                                </div>
                              </td>
                            );
                          case "lastPost":
                            return (
                              <td key={column.id} className="whitespace-nowrap px-4 py-4 text-sm text-slate-300">
                                {entry.lastPostAt ? formatRelativeTime(entry.lastPostAt) : "N/A"}
                              </td>
                            );
                          case "followers":
                          case "posts":
                          case "views":
                          case "likes":
                          case "comments":
                          case "shares":
                            return (
                              <td key={column.id} className={`whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-white`}>
                                {formatNumber(entry[column.id])}
                              </td>
                            );
                          case "engagementRate":
                            return (
                              <td key={column.id} className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-emerald-400">
                                {formatPercent(entry.engagementRate)}
                              </td>
                            );
                          case "lastSyncedAt":
                            return (
                              <td key={column.id} className="whitespace-nowrap px-4 py-4 text-right text-sm text-slate-300">
                                {entry.lastSyncedAt ? formatRelativeTime(entry.lastSyncedAt) : "N/A"}
                              </td>
                            );
                          case "actions":
                            return (
                              <td key={column.id} className="px-4 py-4 text-right">
                                <div className="relative inline-flex">
                                  <button
                                    type="button"
                                    onClick={() => setActiveMenu((current) => (current === accountId ? null : accountId))}
                                    className="rounded-full border border-white/10 p-2 text-slate-400 transition hover:border-white/30 hover:text-white"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>
                                  {activeMenu === accountId ? (
                                    <div className="absolute right-0 top-10 z-10 w-40 rounded-2xl border border-white/10 bg-[#131527] p-1 shadow-xl">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAnalysisAccount({ ...entry.raw, media: entry.media });
                                          setActiveMenu(null);
                                        }}
                                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:bg-white/5"
                                      >
                                        <CalendarClock className="h-3.5 w-3.5" />
                                        View insights
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenu(null);
                                          handleRefresh(accountId);
                                        }}
                                        disabled={isRefreshing}
                                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                                        Refresh data
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenu(null);
                                          handleDelete(entry);
                                        }}
                                        disabled={isDeleting}
                                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Remove
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              </td>
                            );
                          default:
                            return null;
                        }
                      })}
                      </tr>
                      {errors[accountId] ? (
                        <tr>
                          <td colSpan={columns.length} className="px-6 pb-4 text-xs text-rose-300">
                            {errorMessage}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AccountAnalysisModal
        account={analysisAccount ? { ...analysisAccount, media: processedAccounts.find((entry) => entry.raw._id === analysisAccount._id)?.media || [] } : null}
        isOpen={Boolean(analysisAccount)}
        onClose={() => setAnalysisAccount(null)}
      />
    </div>
  );
}
