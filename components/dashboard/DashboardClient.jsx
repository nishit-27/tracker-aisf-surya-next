"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import PlatformComparisonChart from "./PlatformComparisonChart";
import EngagementTrendChart from "./EngagementTrendChart";
import AdvancedFilters from "./AdvancedFilters";
import OverviewCards from "./OverviewCards";
import MediaTable from "./MediaTable";
import AddAccountModal from "./AddAccountModal";
import AccountsGrid from "./AccountsGrid";
import AccountComparison from "./AccountComparison";
import TimeAnalysis from "./TimeAnalysis";
import PlatformDeepDive from "./PlatformDeepDive";
import FullScreenAccountsGrid from "./FullScreenAccountsGrid";

const dateRanges = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "365d": 365,
  all: null,
};

const mediaSortOptions = [
  { value: "metrics.views", label: "Views" },
  { value: "metrics.likes", label: "Likes" },
  { value: "metrics.comments", label: "Comments" },
  { value: "metrics.shares", label: "Shares" },
  { value: "metrics.engagementRate", label: "Engagement Rate" },
];

const comparisonMetricOptions = [
  { value: "followers", label: "Followers" },
  { value: "views", label: "Views" },
  { value: "likes", label: "Likes" },
  { value: "comments", label: "Comments" },
  { value: "engagementRate", label: "Engagement Rate" },
];

function extractMetricValue(mediaItem, path) {
  const [scope, field] = path.split(".");
  if (scope && field && mediaItem[scope]) {
    return mediaItem[scope][field] ?? 0;
  }
  return mediaItem[path] ?? 0;
}

function formatDateKey(value) {
  return new Date(value).toISOString().split("T")[0];
}

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
  if (numeric % 1 === 0) {
    return numeric.toLocaleString();
  }
  return numeric.toFixed(2);
}

function formatPercent(value) {
  if (value === undefined || value === null) {
    return "0%";
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "0%";
  }
  return `${numeric.toFixed(1)}%`;
}

function formatShortDate(value) {
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPlatformLabel(value) {
  if (!value) {
    return "Unknown";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normaliseAnalyticsPayload(payload = {}) {
  return {
    overview: payload.overview ?? {},
    accounts: (payload.accounts ?? []).map((account) => ({
      ...account,
      _id: String(account._id),
      user: account.user ? String(account.user) : null,
      history: (account.history ?? []).map((entry) => ({
        ...entry,
        date: entry.date ? new Date(entry.date).toISOString() : null,
      })),
      createdAt: account.createdAt ? new Date(account.createdAt).toISOString() : null,
      updatedAt: account.updatedAt ? new Date(account.updatedAt).toISOString() : null,
      lastSyncedAt: account.lastSyncedAt
        ? new Date(account.lastSyncedAt).toISOString()
        : null,
    })),
    media: (payload.media ?? []).map((item) => ({
      ...item,
      _id: String(item._id),
      account: item.account ? String(item.account) : null,
      publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString() : null,
      createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
      updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : null,
    })),
  };
}

export default function DashboardClient({ data, platforms }) {
  const [analyticsData, setAnalyticsData] = useState(data);
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [selectedRange, setSelectedRange] = useState("30d");
  const [comparisonMetric, setComparisonMetric] = useState("engagementRate");
  const [mediaSort, setMediaSort] = useState("metrics.views");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [engagementFilter, setEngagementFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });
  const [activeTab, setActiveTab] = useState("overview");

  const accountOptions = useMemo(() => {
    const options = [
      { value: "all", label: "All Accounts" },
      ...analyticsData.accounts.map((account) => ({
        value: account._id,
        label: `${account.displayName || account.username || account.accountId} · ${
          account.platform.charAt(0).toUpperCase() + account.platform.slice(1)
        }`,
        platform: account.platform,
      })),
    ];
    return options;
  }, [analyticsData.accounts]);

  useEffect(() => {
    const selected = accountOptions.find((option) => option.value === selectedAccount);
    if (!selected) {
      setSelectedAccount("all");
      return;
    }

    if (selected.platform && selectedPlatform !== selected.platform && selected.value !== "all") {
      setSelectedPlatform(selected.platform);
    }
  }, [accountOptions, selectedAccount, selectedPlatform]);

  const filteredAccounts = useMemo(() => {
    let accounts = analyticsData.accounts;

    if (selectedPlatform !== "all") {
      accounts = accounts.filter((account) => account.platform === selectedPlatform);
    }

    if (selectedAccount !== "all") {
      accounts = accounts.filter((account) => account._id === selectedAccount);
    }

    return accounts;
  }, [analyticsData.accounts, selectedPlatform, selectedAccount]);

  const filteredMedia = useMemo(() => {
    const cutoffDays = dateRanges[selectedRange];

    const cutoffDate = cutoffDays
      ? new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000)
      : null;

    return analyticsData.media
      .filter((item) => {
        if (selectedPlatform !== "all" && item.platform !== selectedPlatform) {
          return false;
        }

        if (selectedAccount !== "all" && item.account !== selectedAccount) {
          return false;
        }

        if (cutoffDate && item.publishedAt) {
          const publishedAt = new Date(item.publishedAt);
          return publishedAt >= cutoffDate;
        }

        // Engagement filter
        if (engagementFilter !== "all") {
          const engagementRate = item.metrics?.engagementRate || 0;
          switch (engagementFilter) {
            case "high":
              if (engagementRate < 5) return false;
              break;
            case "medium":
              if (engagementRate < 1 || engagementRate >= 5) return false;
              break;
            case "low":
              if (engagementRate >= 1) return false;
              break;
          }
        }

        // Date filter
        if (dateFilter.start && item.publishedAt) {
          const publishedAt = new Date(item.publishedAt);
          const startDate = new Date(dateFilter.start);
          if (publishedAt < startDate) return false;
        }

        if (dateFilter.end && item.publishedAt) {
          const publishedAt = new Date(item.publishedAt);
          const endDate = new Date(dateFilter.end);
          if (publishedAt > endDate) return false;
        }

        return true;
      })
      .sort((a, b) => extractMetricValue(b, mediaSort) - extractMetricValue(a, mediaSort));
  }, [analyticsData.media, selectedPlatform, selectedAccount, selectedRange, mediaSort, engagementFilter, dateFilter]);

  const overview = useMemo(() => {
    const metrics = {
      totalFollowers: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalImpressions: 0,
      averageEngagementRate: 0,
      platformBreakdown: {},
    };

    if (!filteredAccounts.length) {
      return metrics;
    }

    for (const account of filteredAccounts) {
      const stats = account.stats ?? {};
      const platform = account.platform;

      metrics.totalFollowers += stats.followers ?? 0;
      metrics.totalViews += stats.totalViews ?? 0;
      metrics.totalLikes += stats.totalLikes ?? 0;
      metrics.totalComments += stats.totalComments ?? 0;
      metrics.totalShares += stats.totalShares ?? 0;
      metrics.totalImpressions += stats.totalImpressions ?? 0;

      if (!metrics.platformBreakdown[platform]) {
        metrics.platformBreakdown[platform] = {
          platform,
          followers: 0,
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          engagementRate: 0,
          impressions: 0,
          mediaCount: 0,
        };
      }

      const breakdown = metrics.platformBreakdown[platform];
      breakdown.followers += stats.followers ?? 0;
      breakdown.views += stats.totalViews ?? 0;
      breakdown.likes += stats.totalLikes ?? 0;
      breakdown.comments += stats.totalComments ?? 0;
      breakdown.shares += stats.totalShares ?? 0;
      breakdown.impressions += stats.totalImpressions ?? 0;
      breakdown.engagementRate += stats.engagementRate ?? 0;
    }

    const platformsList = Object.keys(metrics.platformBreakdown);

    if (platformsList.length) {
      metrics.averageEngagementRate = Number(
        (
          platformsList.reduce((sum, platform) => {
            const value = metrics.platformBreakdown[platform].engagementRate;
            return sum + (value || 0);
          }, 0) / platformsList.length
        ).toFixed(2)
      );
    }

    for (const platform of platformsList) {
      const breakdown = metrics.platformBreakdown[platform];
      const mediaForPlatform = filteredMedia.filter((item) => item.platform === platform);
      breakdown.mediaCount = mediaForPlatform.length;
      if (mediaForPlatform.length) {
        const totalRate = mediaForPlatform.reduce(
          (sum, item) => sum + (item.metrics?.engagementRate ?? 0),
          0
        );
        breakdown.engagementRate = Number((totalRate / mediaForPlatform.length).toFixed(2));
      } else {
        breakdown.engagementRate = Number((breakdown.engagementRate || 0).toFixed(2));
      }
    }

    return metrics;
  }, [filteredAccounts, filteredMedia]);

  const platformComparisonData = useMemo(() => {
    return Object.values(overview.platformBreakdown).map((item) => ({
      platform: item.platform,
      followers: item.followers,
      views: item.views,
      likes: item.likes,
      comments: item.comments,
      engagementRate: item.engagementRate,
      shares: item.shares,
      mediaCount: item.mediaCount,
    }));
  }, [overview.platformBreakdown]);

  const engagementTrendData = useMemo(() => {
    const historyByDate = new Map();

    for (const account of filteredAccounts) {
      for (const snapshot of account.history ?? []) {
        const key = formatDateKey(snapshot.date);
        if (!historyByDate.has(key)) {
          historyByDate.set(key, {
            date: key,
            followers: 0,
            views: 0,
            likes: 0,
            comments: 0,
            engagementRateTotal: 0,
            entries: 0,
          });
        }
        const entry = historyByDate.get(key);
        entry.followers += snapshot.followers ?? 0;
        entry.views += snapshot.totalViews ?? 0;
        entry.likes += snapshot.totalLikes ?? 0;
        entry.comments += snapshot.totalComments ?? 0;
        entry.engagementRateTotal += snapshot.engagementRate ?? 0;
        entry.entries += 1;
      }
    }

    const formatted = Array.from(historyByDate.values())
      .map((entry) => ({
        date: entry.date,
        followers: entry.followers,
        views: entry.views,
        likes: entry.likes,
        comments: entry.comments,
        engagementRate: entry.entries
          ? Number((entry.engagementRateTotal / entry.entries).toFixed(2))
          : 0,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return formatted;
  }, [filteredAccounts]);

  const loadAnalyticsOverview = useCallback(async () => {
    const response = await fetch("/api/analytics/overview", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.error || "Failed to refresh analytics.");
    }

    setAnalyticsData(normaliseAnalyticsPayload(payload));
    return payload;
  }, []);

  const refreshAnalytics = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setRefreshError(null);

      const refreshResponse = await fetch("/api/accounts/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const refreshPayload = await refreshResponse.json().catch(() => ({}));

      if (!refreshResponse.ok) {
        throw new Error(refreshPayload?.error || "Failed to refresh accounts.");
      }

      const failedRefreshes = (refreshPayload?.results ?? []).filter((item) => item?.error);
      if (failedRefreshes.length) {
        const platforms = Array.from(new Set(failedRefreshes.map((item) => item.platform))).join(", ");
        setRefreshError(`Some accounts failed to refresh (${platforms}). Latest data may be stale.`);
      }

      await loadAnalyticsOverview();
    } catch (error) {
      setRefreshError(error.message || "Failed to refresh analytics.");
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [loadAnalyticsOverview]);

  const refreshAccount = useCallback(
    async (accountId) => {
      if (!accountId) {
        throw new Error("Account id is required to refresh.");
      }

      const response = await fetch(`/api/accounts/${accountId}/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to refresh account.");
      }

      await loadAnalyticsOverview();
      return payload;
    },
    [loadAnalyticsOverview]
  );

  async function handleAccountAdded() {
    try {
      // Just reload the analytics overview to show the new account
      // No need to refresh all accounts - the new account was already synced during addition
      await loadAnalyticsOverview();
    } catch (error) {
      // Error already captured in state; swallow to avoid unhandled rejection.
    }
  }

  async function handleAccountDeleted(deletedAccountId) {
    if (selectedAccount === deletedAccountId) {
      setSelectedAccount("all");
    }
    try {
      // Just reload the analytics overview to remove the deleted account
      // No need to refresh all accounts - the account was already deleted
      await loadAnalyticsOverview();
    } catch (error) {
      // Error already captured in state; swallow to avoid unhandled rejection.
    }
  }

  const platformInsights = useMemo(() => {
    const totalFollowers = overview.totalFollowers || 0;
    return platformComparisonData.map((entry) => ({
      ...entry,
      share: totalFollowers ? Number(((entry.followers / totalFollowers) * 100).toFixed(1)) : 0,
    }));
  }, [platformComparisonData, overview.totalFollowers]);

  const topMediaItems = useMemo(() => filteredMedia.slice(0, 5), [filteredMedia]);

  const currentSortLabel = useMemo(() => {
    return (
      mediaSortOptions.find((option) => option.value === mediaSort)?.label ?? "Views"
    );
  }, [mediaSort]);

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "accounts", label: "All Accounts", icon: "👥" },
    { id: "comparison", label: "Account Comparison", icon: "⚖️" },
    { id: "time", label: "Time Analysis", icon: "📈" },
    { id: "platforms", label: "Platform Deep Dive", icon: "🔍" },
    { id: "content", label: "Content Analysis", icon: "📝" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold sm:text-3xl">
              Social Media Analytics
            </h1>
            <p className="text-sm text-slate-400">
              Comprehensive cross-platform performance analysis
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400"
            >
              Add Account
            </button>
            <button
              type="button"
              onClick={refreshAnalytics}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </header>

        {/* Error Message */}
        {refreshError ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {refreshError}
          </div>
        ) : null}

        {/* Overview Cards */}
        <OverviewCards overview={overview} />

        {/* Advanced Filters */}
        <AdvancedFilters
          platforms={["all", ...platforms]}
          accounts={analyticsData.accounts}
          selectedPlatform={selectedPlatform}
          onPlatformChange={(value) => {
            setSelectedPlatform(value);
            if (value !== "all") {
              const selected = accountOptions.find(
                (option) => option.value === selectedAccount
              );
              if (selected && selected.platform && selected.platform !== value) {
                setSelectedAccount("all");
              }
            }
          }}
          selectedAccount={selectedAccount}
          onAccountChange={setSelectedAccount}
          selectedRange={selectedRange}
          onRangeChange={setSelectedRange}
          mediaSort={mediaSort}
          onMediaSortChange={setMediaSort}
          comparisonMetric={comparisonMetric}
          onComparisonMetricChange={setComparisonMetric}
          selectedAccounts={selectedAccounts}
          onSelectedAccountsChange={setSelectedAccounts}
          engagementFilter={engagementFilter}
          onEngagementFilterChange={setEngagementFilter}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
        />

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-sky-500 text-sky-400"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === "overview" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-white">Account Insights</h2>
                    <p className="text-xs text-slate-400">
                      Detailed account performance and health metrics
                    </p>
                  </div>
                  <AccountsGrid
                    accounts={analyticsData.accounts}
                    onAccountDeleted={handleAccountDeleted}
                    onAccountRefreshed={refreshAccount}
                  />
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-white">Platform Comparison</h2>
                    <p className="text-xs text-slate-400">
                      Compare performance across different platforms
                    </p>
                  </div>
                  <PlatformComparisonChart
                    data={platformComparisonData}
                    metric={comparisonMetric}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-white">Engagement Trends</h2>
                    <p className="text-xs text-slate-400">
                      Track engagement and follower growth over time
                    </p>
                  </div>
                  <EngagementTrendChart data={engagementTrendData} />
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-white">Top Content</h2>
                    <p className="text-xs text-slate-400">
                      Best performing content by {currentSortLabel.toLowerCase()}
                    </p>
                  </div>
                  {topMediaItems.length ? (
                    <div className="space-y-3">
                      {topMediaItems.map((item, index) => (
                        <div
                          key={`${item.platform}-${item.externalId}`}
                          className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/70"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">
                              #{index + 1} {item.title || "Untitled"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatPlatformLabel(item.platform)} • {formatShortDate(item.publishedAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">
                              {formatNumber(item.metrics?.views)}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatPercent(item.metrics?.engagementRate)} engagement
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-slate-400">
                      No content matches current filters
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "accounts" && (
            <FullScreenAccountsGrid
              accounts={analyticsData.accounts}
              media={analyticsData.media}
              onAccountDeleted={handleAccountDeleted}
              onAccountRefreshed={refreshAccount}
            />
          )}

          {activeTab === "comparison" && (
            <AccountComparison
              accounts={analyticsData.accounts}
              selectedAccounts={selectedAccounts}
            />
          )}

          {activeTab === "time" && (
            <TimeAnalysis
              accounts={analyticsData.accounts}
              selectedAccount={selectedAccount}
              selectedPlatform={selectedPlatform}
            />
          )}

          {activeTab === "platforms" && (
            <PlatformDeepDive
              accounts={analyticsData.accounts}
              media={filteredMedia}
              selectedPlatform={selectedPlatform}
            />
          )}

          {activeTab === "content" && (
            <MediaTable
              media={filteredMedia}
              sortField={mediaSort}
              sortOptions={mediaSortOptions}
            />
          )}
        </div>
      </div>

      <AddAccountModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAccountAdded={handleAccountAdded}
      />
    </div>
  );
}
