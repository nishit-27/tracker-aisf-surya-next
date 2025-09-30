"use client";

import { useState } from "react";
import AccountProfileModal from "./AccountProfileModal";

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

export default function AccountsGrid({
  accounts,
  onAccountDeleted,
  onAccountRefreshed,
  className = "",
}) {
  const [deletingId, setDeletingId] = useState(null);
  const [refreshingId, setRefreshingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [profileAccount, setProfileAccount] = useState(null);

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
      <div className={`space-y-3 ${className}`.trim()}>
        {accounts.map((account) => {
          const profileImage = account.metadata?.profile?.profilePictureUrl || 
                              account.metadata?.profile?.profile_picture_url ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(account.displayName || account.username)}&background=1f2937&color=fff&size=48`;

          return (
            <div
              key={account._id}
              className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 hover:bg-slate-900/70 transition-colors"
            >
              {/* Profile Picture */}
              <div className="flex-shrink-0">
                <img
                  src={profileImage}
                  alt={account.displayName || account.username}
                  className="h-12 w-12 rounded-full object-cover"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(account.displayName || account.username)}&background=1f2937&color=fff&size=48`;
                  }}
                />
              </div>

              {/* Profile Information */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-white truncate">
                    {account.displayName || account.username || account.accountId}
                  </h3>
                  {/* Verification Badge */}
                  <svg className="h-4 w-4 text-sky-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm text-slate-400 truncate">@{account.username}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 capitalize">
                    {account.platform}
                  </span>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-6 text-right">
                <div>
                  <div className="text-lg font-semibold text-white">
                    {formatNumber(account.stats?.followers)}
                  </div>
                  <div className="text-xs text-slate-400">Followers</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-white">
                    {formatNumber(account.stats?.totalViews)}
                  </div>
                  <div className="text-xs text-slate-400">Views</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-white">
                    {formatNumber(account.stats?.totalLikes)}
                  </div>
                  <div className="text-xs text-slate-400">Likes</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRefresh(account)}
                  className="px-3 py-1 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
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
                  className="px-3 py-1 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  View
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(account)}
                  className="px-3 py-1 text-xs font-medium text-red-300 bg-red-900/20 border border-red-800 rounded-lg hover:bg-red-900/30 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
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
        })}
      </div>
      <AccountProfileModal account={profileAccount} onClose={() => setProfileAccount(null)} />
    </>
  );
}
