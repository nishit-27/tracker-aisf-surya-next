"use client";

import { useMemo, useState } from "react";
import AccountAnalysisModal from "./AccountAnalysisModal";
import AppDropdown from "../ui/AppDropdown";

function formatNumber(value) {
  if (value === undefined || value === null) {
    return "—";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  if (numeric >= 1_000_000) {
    return `${(numeric / 1_000_000).toFixed(1)}M`;
  }
  if (numeric >= 1_000) {
    return `${(numeric / 1_000).toFixed(1)}K`;
  }
  return numeric.toLocaleString();
}

function formatPercent(value) {
  if (value === undefined || value === null) return "0%";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0%";
  return `${numeric.toFixed(2)}%`;
}

export default function FullScreenAccountsGrid({
  accounts,
  media = [],
  onAccountDeleted,
  onAccountRefreshed,
  className = "",
}) {
  const [deletingId, setDeletingId] = useState(null);
  const [refreshingId, setRefreshingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [analysisAccount, setAnalysisAccount] = useState(null);
  const [platformFilter, setPlatformFilter] = useState("all");

  // Get unique platforms from accounts
  const availablePlatforms = [...new Set(accounts.map(account => account.platform).filter(Boolean))];
  const platformOptions = useMemo(
    () => [
      { value: "all", label: "All Platforms" },
      ...availablePlatforms.map((platform) => ({
        value: platform,
        label: platform.charAt(0).toUpperCase() + platform.slice(1),
      })),
    ],
    [availablePlatforms],
  );
  
  // Filter accounts based on platform
  const filteredAccounts = platformFilter === "all" 
    ? accounts 
    : accounts.filter(account => account.platform === platformFilter);

  if (!accounts.length) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">No accounts found. Add an account to get started.</p>
      </div>
    );
  }

  async function handleRefresh(account) {
    if (typeof onAccountRefreshed !== "function") {
      return;
    }

    try {
      setRefreshingId(account._id);
      setErrors((previous) => {
        const next = { ...previous };
        delete next[account._id];
        return next;
      });

      await onAccountRefreshed(account._id);
    } catch (error) {
      setErrors((previous) => ({
        ...previous,
        [account._id]: error.message || "Failed to refresh account.",
      }));
    } finally {
      setRefreshingId(null);
    }
  }

  async function handleDelete(account) {
    const label = account.displayName || account.username || account.accountId;
    const confirmed = window.confirm(
      `Delete ${label}? This will remove the account and all synced media.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(account._id);
      setErrors((previous) => {
        const next = { ...previous };
        delete next[account._id];
        return next;
      });

      const response = await fetch(`/api/accounts/${account._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to delete account.");
      }

      if (typeof onAccountDeleted === "function") {
        await onAccountDeleted(account._id);
      }
    } catch (error) {
      setErrors((previous) => ({
        ...previous,
        [account._id]: error.message || "Failed to delete account.",
      }));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {/* Platform Filter */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-white">All Accounts</h3>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#111327] px-3 py-2 focus-within:border-sky-500 focus-within:shadow-[0_0_0_1px_rgba(14,165,233,0.35)]">
              <span className="text-sm text-slate-400">Platform:</span>
              <AppDropdown
                value={platformFilter}
                options={platformOptions}
                onChange={setPlatformFilter}
                className="min-h-0 min-w-[160px] border-0 bg-transparent px-0 text-sm"
                panelClassName="mt-2 min-w-[200px]"
                placeholder=""
              />
            </div>
          </div>
          <div className="text-sm text-slate-400">
            {filteredAccounts.length} of {accounts.length} accounts
          </div>
        </div>
      </div>

      <div className={`space-y-3 ${className}`.trim()}>
        {filteredAccounts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">No accounts found</h4>
            <p className="text-slate-400">
              {platformFilter === "all" 
                ? "No accounts match the current filter." 
                : `No ${platformFilter} accounts found.`}
            </p>
          </div>
        ) : (
          filteredAccounts.map((account) => {
          const profileImage = account.metadata?.profile?.profilePictureUrl || 
                              account.metadata?.profile?.profile_picture_url ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(account.displayName || account.username)}&background=1f2937&color=fff&size=48`;

          return (
            <div
              key={account._id}
              className="flex items-center gap-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:bg-slate-900/70 transition-colors"
            >
              {/* Profile Picture */}
              <div className="flex-shrink-0">
                <img
                  src={profileImage}
                  alt={account.displayName || account.username}
                  className="h-16 w-16 rounded-full object-cover"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(account.displayName || account.username)}&background=1f2937&color=fff&size=48`;
                  }}
                />
              </div>

              {/* Profile Information */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-white truncate">
                    {account.displayName || account.username || account.accountId}
                  </h3>
                  {/* Verification Badge */}
                  <svg className="h-5 w-5 text-sky-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-base text-slate-400 truncate">@{account.username}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 capitalize">
                    {account.platform}
                  </span>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-8 text-right">
                <div>
                  <div className="text-xl font-semibold text-white">
                    {formatNumber(account.stats?.followers)}
                  </div>
                  <div className="text-sm text-slate-400">Followers</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-white">
                    {formatNumber(account.stats?.totalViews)}
                  </div>
                  <div className="text-sm text-slate-400">Views</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-white">
                    {formatNumber(account.stats?.totalLikes)}
                  </div>
                  <div className="text-sm text-slate-400">Likes</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-white">
                    {formatNumber(account.stats?.totalComments)}
                  </div>
                  <div className="text-sm text-slate-400">Comments</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-white">
                    {formatNumber(account.stats?.totalShares)}
                  </div>
                  <div className="text-sm text-slate-400">Shares</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAnalysisAccount(account)}
                  className="px-4 py-2 text-sm font-medium text-sky-300 bg-sky-900/20 border border-sky-800 rounded-lg hover:bg-sky-900/30 transition-colors"
                >
                  Analyze
                </button>
                <button
                  type="button"
                  onClick={() => handleRefresh(account)}
                  className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                  disabled={refreshingId === account._id}
                >
                  {refreshingId === account._id ? "Refreshing…" : "Refresh"}
                </button>
                <a
                  href={
                    account.profileUrl ||
                    `https://www.${account.platform}.com/${account.username}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  View
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(account)}
                  className="px-4 py-2 text-sm font-medium text-red-300 bg-red-900/20 border border-red-800 rounded-lg hover:bg-red-900/30 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                  disabled={deletingId === account._id || refreshingId === account._id}
                >
                  {deletingId === account._id ? "Deleting…" : "Delete"}
                </button>
              </div>

              {/* Error Message */}
              {errors[account._id] && (
                <div className="absolute top-2 right-2 text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">
                  {errors[account._id]}
                </div>
              )}
            </div>
          );
        })
        )}
      </div>
      <AccountAnalysisModal 
        account={analysisAccount ? {
          ...analysisAccount,
          media: media.filter(item => item.account === analysisAccount._id)
        } : null} 
        isOpen={!!analysisAccount} 
        onClose={() => setAnalysisAccount(null)} 
      />
    </>
  );
}
