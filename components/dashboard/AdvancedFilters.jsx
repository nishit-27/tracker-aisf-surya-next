"use client";

import { useState, useMemo } from "react";

const dateRanges = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "365d", label: "Last 12 months", days: 365 },
  { value: "all", label: "All time", days: null },
];

const sortOptions = [
  { value: "metrics.views", label: "Views" },
  { value: "metrics.likes", label: "Likes" },
  { value: "metrics.comments", label: "Comments" },
  { value: "metrics.shares", label: "Shares" },
  { value: "metrics.engagementRate", label: "Engagement Rate" },
  { value: "publishedAt", label: "Published Date" },
  { value: "title", label: "Title" },
];

const comparisonMetrics = [
  { value: "followers", label: "Followers" },
  { value: "totalViews", label: "Total Views" },
  { value: "totalLikes", label: "Total Likes" },
  { value: "totalComments", label: "Total Comments" },
  { value: "totalShares", label: "Total Shares" },
  { value: "engagementRate", label: "Engagement Rate" },
  { value: "mediaCount", label: "Media Count" },
];

const engagementRanges = [
  { value: "all", label: "All engagement rates" },
  { value: "high", label: "High (5%+)" },
  { value: "medium", label: "Medium (1-5%)" },
  { value: "low", label: "Low (<1%)" },
];

export default function AdvancedFilters({
  platforms,
  accounts,
  selectedPlatform,
  onPlatformChange,
  selectedAccount,
  onAccountChange,
  selectedRange,
  onRangeChange,
  mediaSort,
  onMediaSortChange,
  comparisonMetric,
  onComparisonMetricChange,
  selectedAccounts = [],
  onSelectedAccountsChange,
  engagementFilter,
  onEngagementFilterChange,
  dateFilter,
  onDateFilterChange,
  className = "",
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const accountOptions = useMemo(() => {
    const options = [
      { value: "all", label: "All Accounts" },
      ...accounts.map((account) => ({
        value: account._id,
        label: `${account.displayName || account.username || account.accountId} · ${
          account.platform.charAt(0).toUpperCase() + account.platform.slice(1)
        }`,
        platform: account.platform,
      })),
    ];
    return options;
  }, [accounts]);

  const handleAccountSelection = (accountId, isSelected) => {
    if (isSelected) {
      onSelectedAccountsChange([...selectedAccounts, accountId]);
    } else {
      onSelectedAccountsChange(selectedAccounts.filter(id => id !== accountId));
    }
  };

  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Analysis Controls</h3>
          <p className="text-xs text-slate-400">
            Configure filters and comparison settings for detailed analysis
          </p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-sky-400 hover:text-sky-300 transition-colors"
        >
          {isExpanded ? "Collapse" : "Expand"} Advanced
        </button>
      </div>

      {/* Basic Filters */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Platform
          </label>
          <select
            value={selectedPlatform}
            onChange={(e) => onPlatformChange(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          >
            {platforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform === "all"
                  ? "All Platforms"
                  : platform.charAt(0).toUpperCase() + platform.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Account
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => onAccountChange(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          >
            {accountOptions.map((account) => (
              <option key={account.value} value={account.value}>
                {account.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Date Range
          </label>
          <select
            value={selectedRange}
            onChange={(e) => onRangeChange(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          >
            {dateRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Sort Media By
          </label>
          <select
            value={mediaSort}
            onChange={(e) => onMediaSortChange(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="space-y-6 pt-4 border-t border-slate-800">
          {/* Comparison Metric */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Comparison Metric
            </label>
            <select
              value={comparisonMetric}
              onChange={(e) => onComparisonMetricChange(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            >
              {comparisonMetrics.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Account Selection for Comparison */}
          <div className="space-y-3">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Select Accounts for Comparison ({selectedAccounts.length} selected)
            </label>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => {
                const isSelected = selectedAccounts.includes(account._id);
                return (
                  <label key={account._id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-800 bg-slate-900/70 hover:bg-slate-800/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleAccountSelection(account._id, e.target.checked)}
                      className="rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {account.displayName || account.username || account.accountId}
                      </div>
                      <div className="text-xs text-slate-400 capitalize">
                        {account.platform}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Engagement Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Engagement Rate Filter
            </label>
            <select
              value={engagementFilter}
              onChange={(e) => onEngagementFilterChange(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            >
              {engagementRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Content Date Filter
            </label>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
              <input
                type="date"
                value={dateFilter?.start || ""}
                onChange={(e) => onDateFilterChange({ ...dateFilter, start: e.target.value })}
                className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                placeholder="Start date"
              />
              <input
                type="date"
                value={dateFilter?.end || ""}
                onChange={(e) => onDateFilterChange({ ...dateFilter, end: e.target.value })}
                className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                placeholder="End date"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onSelectedAccountsChange(accounts.map(acc => acc._id))}
              className="px-3 py-1 text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors"
            >
              Select All Accounts
            </button>
            <button
              onClick={() => onSelectedAccountsChange([])}
              className="px-3 py-1 text-xs font-medium text-slate-400 hover:text-slate-300 transition-colors"
            >
              Clear Selection
            </button>
            <button
              onClick={() => onDateFilterChange({ start: "", end: "" })}
              className="px-3 py-1 text-xs font-medium text-slate-400 hover:text-slate-300 transition-colors"
            >
              Clear Date Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
