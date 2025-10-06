"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  CheckCircle2,
  Clapperboard,
  FolderKanban,
  Globe2,
  Heart,
  Home,
  Instagram,
  LayoutDashboard,
  LifeBuoy,
  MessageCircle,
  Music2,
  PlayCircle,
  Plus,
  RefreshCw,
  Radar,
  Server,
  Sparkles,
  TrendingUp,
  Users,
  Video,
  Youtube,
  Filter,
} from "lucide-react";
import EngagementTrendChart from "./EngagementTrendChart";
import OverviewMetricChart from "./OverviewMetricChart";
import MediaTable from "./MediaTable";
import AddAccountModal from "./AddAccountModal";
import AccountsTable from "./AccountsTable";
import VideosTable from "./VideosTable";
import AccountComparison from "./AccountComparison";
import TimeAnalysis from "./TimeAnalysis";
import PlatformDeepDive from "./PlatformDeepDive";
import AppDropdown from "../ui/AppDropdown";
import MultiAccountDailyTrend from "./MultiAccountDailyTrend";
import DailyViewsTimeline from "./DailyViewsTimeline";
import FloatingNavbar from "../ui/FloatingNavbar";
import { PlatformImage } from "../../lib/utils/platformImages";

const DAY_MS = 24 * 60 * 60 * 1000;

const dateRanges = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
  "90d": 90,
  "365d": 365,
  all: null,
};

const rangeOptions = [
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "365d", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

const mediaSortOptions = [
  { value: "metrics.views", label: "Views" },
  { value: "metrics.likes", label: "Likes" },
  { value: "metrics.comments", label: "Comments" },
  { value: "metrics.shares", label: "Shares" },
  { value: "metrics.engagementRate", label: "Engagement Rate" },
];

const metricDisplayOptions = [
  { value: "views", label: "Views" },
  { value: "likes", label: "Likes" },
  { value: "comments", label: "Comments" },
  { value: "shares", label: "Shares" },
];

const projectOptions = [
  { value: "all", label: "All projects" },
  { value: "launch", label: "Launch Campaign" },
  { value: "ugc", label: "UGC Collaboration" },
  { value: "seasonal", label: "Seasonal Push" },
];

const sidebarNavigation = [
  {
    title: "Analytics",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "accounts", label: "Accounts", icon: Users },
      { id: "videos", label: "Videos", icon: Clapperboard },
      { id: "tracking", label: "Tracking Options", icon: Radar },
    ],
  },
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
    return "0";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  const abs = Math.abs(numeric);
  if (abs >= 1_000_000) {
    return `${(numeric / 1_000_000).toFixed(1)}M`;
  }

  if (abs >= 1_000) {
    return `${(numeric / 1_000).toFixed(1)}K`;
  }

  if (Number.isInteger(numeric)) {
    return numeric.toLocaleString();
  }

  return numeric.toFixed(1);
}

function formatPercent(value) {
  const numeric = Number(value ?? 0);
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

function formatDelta(current, previous, { isPercent = false, decimals = 1 } = {}) {
  if (previous === undefined || previous === null) {
    return { text: "0", tone: "neutral" };
  }

  const currentValue = Number(current ?? 0);
  const previousValue = Number(previous ?? 0);

  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) {
    return { text: "0", tone: "neutral" };
  }

  const diff = currentValue - previousValue;
  if (Math.abs(diff) < 0.0001) {
    return { text: "0", tone: "neutral" };
  }

  const tone = diff > 0 ? "positive" : "negative";

  if (isPercent) {
    return {
      text: `${diff > 0 ? "+" : ""}${Math.abs(diff).toFixed(decimals)}%`,
      tone,
    };
  }

  return {
    text: `${diff > 0 ? "+" : "-"}${formatNumber(Math.abs(diff))}`,
    tone,
  };
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

function accountDisplayLabel(account) {
  return (
    account.displayName ||
    account.username ||
    account.accountId ||
    "Untitled account"
  );
}

const platformIconMap = {
  all: Globe2,
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
};

function getPlatformIcon(platform) {
  return platformIconMap[platform] || Sparkles;
}

function countActiveAccounts(accounts, start, end) {
  if (!start) {
    return accounts.length;
  }

  return accounts.filter((account) => {
    const history = account.history ?? [];
    return history.some((snapshot) => {
      if (!snapshot?.date) {
        return false;
      }
      const timestamp = new Date(snapshot.date).getTime();
      if (Number.isNaN(timestamp)) {
        return false;
      }
      if (start && timestamp < start.getTime()) {
        return false;
      }
      if (end && timestamp >= end.getTime()) {
        return false;
      }
      return true;
    });
  }).length;
}

function StatCard({ label, value, delta, icon: Icon, accent, description }) {
  const toneClass =
    delta?.tone === "positive"
      ? "text-emerald-400"
      : delta?.tone === "negative"
        ? "text-rose-400"
        : "text-slate-400";

  const DeltaIcon =
    delta?.tone === "positive"
      ? ArrowUpRight
      : delta?.tone === "negative"
        ? ArrowDownRight
        : null;

  return (
    <div
      className={`relative flex h-full min-h-[180px] flex-col justify-between overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br ${accent} px-6 py-6`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
          {label}
        </span>
        {Icon ? (
          <span className="rounded-2xl bg-white/5 p-2 text-white">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <div className="mt-6 flex items-end justify-between">
        <span className="text-3xl font-semibold text-white">{value}</span>
        {delta ? (
          <span className={`flex items-center gap-1 text-xs font-medium ${toneClass}`}>
            {DeltaIcon ? <DeltaIcon className="h-3 w-3" /> : null}
            {delta.text}
          </span>
        ) : null}
      </div>
      {description ? (
        <p className="mt-4 text-xs text-slate-400">{description}</p>
      ) : null}
    </div>
  );
}


export default function DashboardClient({ data, platforms }) {
  const [analyticsData, setAnalyticsData] = useState(data);
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [selectedRange, setSelectedRange] = useState("14d");
  const [mediaSort, setMediaSort] = useState("metrics.views");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const selectionInitialisedRef = useRef(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedProject, setSelectedProject] = useState("all");
  const [primaryMetric, setPrimaryMetric] = useState("views");
  const [trackingRange, setTrackingRange] = useState("90d");
  const mainScrollRef = useRef(null);
  const [accountSearchTerm, setAccountSearchTerm] = useState("");
  const [videoSearchTerm, setVideoSearchTerm] = useState("");

  const platformFilters = useMemo(() => {
    const unique = Array.from(new Set([...(platforms ?? [])]));
    return ["all", ...unique];
  }, [platforms]);

  const accountOptions = useMemo(() => {
    const options = [
      { value: "all", label: "All accounts" },
      ...analyticsData.accounts.map((account) => ({
        value: account._id,
        label: `${accountDisplayLabel(account)} · ${formatPlatformLabel(account.platform)}`,
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

    if (selected.platform && selected.value !== "all" && selectedPlatform !== selected.platform) {
      setSelectedPlatform(selected.platform);
    }
  }, [accountOptions, selectedAccount, selectedPlatform]);

  // Handle platform filter changes - reset account selection if it doesn't match the new platform
  useEffect(() => {
    // Only run when platform changes and we have a specific account selected
    if (selectedPlatform !== "all" && selectedAccount !== "all") {
      const selectedAccountOption = accountOptions.find((option) => option.value === selectedAccount);
      if (selectedAccountOption && selectedAccountOption.platform !== selectedPlatform) {
        setSelectedAccount("all");
      }
    }
  }, [selectedPlatform, selectedAccount, accountOptions]);

  useEffect(() => {
    const availableIds = analyticsData.accounts.map((account) => account._id);

    setSelectedAccounts((prev) => {
      const filtered = prev.filter((id) => availableIds.includes(id));

      if (!selectionInitialisedRef.current) {
        selectionInitialisedRef.current = true;

        if (filtered.length) {
          return filtered.length === prev.length ? prev : filtered;
        }

        if (availableIds.length) {
          return [availableIds[0]];
        }

        return [];
      }

      if (filtered.length !== prev.length) {
        return filtered;
      }

      return prev;
    });
  }, [analyticsData.accounts]);

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

  const baseMediaMatches = useCallback(
    (item) => {
      if (selectedPlatform !== "all" && item.platform !== selectedPlatform) {
        return false;
      }

      if (selectedAccount !== "all" && item.account !== selectedAccount) {
        return false;
      }

      return true;
    },
    [selectedPlatform, selectedAccount]
  );

  const filteredMedia = useMemo(() => {
    const rangeDays = dateRanges[selectedRange];
    const now = Date.now();

    return analyticsData.media
      .filter((item) => baseMediaMatches(item))
      .filter((item) => {
        if (!rangeDays || rangeDays === null) {
          return true;
        }
        if (!item.publishedAt) {
          return false;
        }
        const publishedAt = new Date(item.publishedAt).getTime();
        return publishedAt >= now - rangeDays * DAY_MS;
      })
      .sort((a, b) => extractMetricValue(b, mediaSort) - extractMetricValue(a, mediaSort));
  }, [analyticsData.media, baseMediaMatches, selectedRange, mediaSort]);

  const previousMedia = useMemo(() => {
    const rangeDays = dateRanges[selectedRange];
    if (!rangeDays || rangeDays === null) {
      return [];
    }

    const now = Date.now();
    const currentStart = now - rangeDays * DAY_MS;
    const previousStart = now - rangeDays * 2 * DAY_MS;

    return analyticsData.media.filter((item) => {
      if (!baseMediaMatches(item)) {
        return false;
      }

      if (!item.publishedAt) {
        return false;
      }

      const publishedAt = new Date(item.publishedAt).getTime();
      return publishedAt >= previousStart && publishedAt < currentStart;
    });
  }, [analyticsData.media, baseMediaMatches, selectedRange]);

  const rangeBoundaries = useMemo(() => {
    const days = dateRanges[selectedRange];
    if (!days || days === null) {
      return null;
    }

    const now = Date.now();
    const currentStart = new Date(now - days * DAY_MS);
    const previousStart = new Date(now - days * 2 * DAY_MS);

    return {
      currentStart,
      previousStart,
      now: new Date(now),
    };
  }, [selectedRange]);

  const engagementTrendData = useMemo(() => {
    const historyByDate = new Map();

    filteredAccounts.forEach((account) => {
      (account.history ?? []).forEach((snapshot) => {
        if (!snapshot?.date) {
          return;
        }

        const snapshotDate = new Date(snapshot.date);
        if (rangeBoundaries?.currentStart && snapshotDate < rangeBoundaries.currentStart) {
          return;
        }

        const key = formatDateKey(snapshotDate);
        if (!historyByDate.has(key)) {
          historyByDate.set(key, {
            date: key,
            engagementRateTotal: 0,
            entries: 0,
          });
        }
        const entry = historyByDate.get(key);
        entry.engagementRateTotal += snapshot.engagementRate ?? 0;
        entry.entries += 1;
      });
    });

    return Array.from(historyByDate.values())
      .map((entry) => ({
        date: entry.date,
        engagementRate: entry.entries
          ? Number((entry.engagementRateTotal / entry.entries).toFixed(2))
          : 0,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredAccounts, rangeBoundaries]);

  const metricsTimelineData = useMemo(() => {
    const grouped = new Map();

    filteredMedia.forEach((item) => {
      if (!item?.publishedAt) {
        return;
      }

      const key = formatDateKey(item.publishedAt);
      if (!grouped.has(key)) {
        grouped.set(key, { date: key, views: 0, likes: 0, comments: 0, shares: 0 });
      }

      const entry = grouped.get(key);
      entry.views += item.metrics?.views ?? 0;
      entry.likes += item.metrics?.likes ?? 0;
      entry.comments += item.metrics?.comments ?? 0;
      entry.shares += item.metrics?.shares ?? 0;
    });

    return Array.from(grouped.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredMedia]);

  const topMediaItems = useMemo(() => filteredMedia.slice(0, 5), [filteredMedia]);

  const topAccounts = useMemo(() => {
    return filteredAccounts
      .slice()
      .sort((a, b) => (b.stats?.totalViews ?? 0) - (a.stats?.totalViews ?? 0))
      .slice(0, 5)
      .map((account) => ({
        id: account._id,
        name: accountDisplayLabel(account),
        platform: account.platform,
        views: account.stats?.totalViews ?? 0,
        followers: account.stats?.followers ?? 0,
        engagementRate: account.stats?.engagementRate ?? 0,
      }));
  }, [filteredAccounts]);

  const publishedCount = filteredMedia.length;
  const previousPublishedCount = previousMedia.length;
  const viewsTotal = filteredMedia.reduce(
    (sum, item) => sum + (item.metrics?.views ?? 0),
    0
  );
  const previousViewsTotal = previousMedia.reduce(
    (sum, item) => sum + (item.metrics?.views ?? 0),
    0
  );
  const likesTotal = filteredMedia.reduce(
    (sum, item) => sum + (item.metrics?.likes ?? 0),
    0
  );
  const previousLikesTotal = previousMedia.reduce(
    (sum, item) => sum + (item.metrics?.likes ?? 0),
    0
  );
  const commentsTotal = filteredMedia.reduce(
    (sum, item) => sum + (item.metrics?.comments ?? 0),
    0
  );
  const previousCommentsTotal = previousMedia.reduce(
    (sum, item) => sum + (item.metrics?.comments ?? 0),
    0
  );
  const engagementAverage = filteredMedia.length
    ? filteredMedia.reduce((sum, item) => sum + (item.metrics?.engagementRate ?? 0), 0) /
    filteredMedia.length
    : 0;
  const previousEngagementAverage = previousMedia.length
    ? previousMedia.reduce((sum, item) => sum + (item.metrics?.engagementRate ?? 0), 0) /
    previousMedia.length
    : null;

  const activeAccountsNow = useMemo(() => {
    if (!filteredAccounts.length) {
      return 0;
    }
    if (!rangeBoundaries?.currentStart) {
      return filteredAccounts.length;
    }
    return countActiveAccounts(filteredAccounts, rangeBoundaries.currentStart, rangeBoundaries.now);
  }, [filteredAccounts, rangeBoundaries]);

  const activeAccountsPrev = useMemo(() => {
    if (!rangeBoundaries?.previousStart) {
      return activeAccountsNow;
    }
    return countActiveAccounts(filteredAccounts, rangeBoundaries.previousStart, rangeBoundaries.currentStart);
  }, [filteredAccounts, rangeBoundaries, activeAccountsNow]);

  const trackingDays = dateRanges[trackingRange];

  const trackingMedia = useMemo(() => {
    if (trackingDays === null || trackingDays === undefined) {
      return analyticsData.media;
    }

    const threshold = Date.now() - trackingDays * DAY_MS;

    return analyticsData.media.filter((item) => {
      if (!item?.publishedAt) {
        return false;
      }
      const publishedAt = new Date(item.publishedAt).getTime();
      if (Number.isNaN(publishedAt)) {
        return false;
      }
      return publishedAt >= threshold;
    });
  }, [analyticsData.media, trackingDays]);

  const statCards = useMemo(
    () => [
      {
        id: "published",
        label: "Published Videos",
        value: formatNumber(publishedCount),
        delta: formatDelta(publishedCount, previousPublishedCount),
        icon: Video,
        accent: "from-[#221722] via-[#16111b] to-[#0f0b15]",
        description: "Content posted in the selected range",
      },
      {
        id: "active",
        label: "Active Accounts",
        value: formatNumber(activeAccountsNow),
        delta: formatDelta(activeAccountsNow, activeAccountsPrev),
        icon: Users,
        accent: "from-[#1a2327] via-[#11181d] to-[#0b1116]",
        description: "Accounts with recent activity",
      },
      {
        id: "views",
        label: "Views",
        value: formatNumber(viewsTotal),
        delta: formatDelta(viewsTotal, previousViewsTotal),
        icon: PlayCircle,
        accent: "from-[#1f212a] via-[#14161d] to-[#0d0e16]",
        description: "Total watch volume across content",
      },
      {
        id: "engagement",
        label: "Engagement",
        value: formatPercent(engagementAverage),
        delta: formatDelta(engagementAverage, previousEngagementAverage, {
          isPercent: true,
        }),
        icon: TrendingUp,
        accent: "from-[#1a2621] via-[#111b18] to-[#0b1210]",
        description: "Average engagement rate",
      },
      {
        id: "likes",
        label: "Likes",
        value: formatNumber(likesTotal),
        delta: formatDelta(likesTotal, previousLikesTotal),
        icon: Heart,
        accent: "from-[#261c23] via-[#181117] to-[#100b0f]",
        description: "Audience appreciation across platforms",
      },
      {
        id: "comments",
        label: "Comments",
        value: formatNumber(commentsTotal),
        delta: formatDelta(commentsTotal, previousCommentsTotal),
        icon: MessageCircle,
        accent: "from-[#251f22] via-[#161114] to-[#0f0b0e]",
        description: "Conversations sparked this period",
      },
    ],
    [
      publishedCount,
      previousPublishedCount,
      activeAccountsNow,
      activeAccountsPrev,
      viewsTotal,
      previousViewsTotal,
      engagementAverage,
      previousEngagementAverage,
      likesTotal,
      previousLikesTotal,
      commentsTotal,
      previousCommentsTotal,
    ]
  );


  const activeNavItem = useMemo(() => {
    for (const section of sidebarNavigation) {
      const match = section.items.find((item) => item.id === activeTab);
      if (match) {
        return { ...match, section: section.title };
      }
    }
    return null;
  }, [activeTab]);

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

  const handleAccountAdded = useCallback(async () => {
    try {
      await loadAnalyticsOverview();
    } catch (error) {
      console.error(error);
    }
  }, [loadAnalyticsOverview]);

  const handleAccountDeleted = useCallback(
    async (deletedAccountId) => {
      if (selectedAccount === deletedAccountId) {
        setSelectedAccount("all");
      }
      try {
        await loadAnalyticsOverview();
      } catch (error) {
        console.error(error);
      }
    },
    [selectedAccount, loadAnalyticsOverview]
  );

  const toggleComparisonAccount = useCallback((accountId) => {
    setSelectedAccounts((prev) => {
      const isSelected = prev.includes(accountId);
      if (isSelected) {
        return prev.filter((id) => id !== accountId);
      }
      return [...prev, accountId];
    });
  }, []);



  function renderContent() {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <section className="space-y-4">
              <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
                {statCards.map((card) => (
                  <StatCard key={card.id} {...card} />
                ))}
              </div>
            </section>

            <section className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="flex h-full flex-col rounded-3xl border border-white/5 bg-[#101125] px-6 py-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Metrics</h2>
                    <p className="text-xs text-slate-400">
                      Daily performance across the selected period
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Primary metric</span>
                    <AppDropdown
                      value={primaryMetric}
                      options={metricDisplayOptions}
                      onChange={setPrimaryMetric}
                      className="min-h-0 min-w-[160px] rounded-full"
                      panelClassName="mt-2 min-w-[200px]"
                      placeholder=""
                    />
                  </div>
                </div>
                <OverviewMetricChart data={metricsTimelineData} metric={primaryMetric} />
              </div>

              <div className="flex h-full flex-col rounded-3xl border border-white/5 bg-[#101125] px-6 py-6">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-white">Engagement</h2>
                  <p className="text-xs text-slate-400">
                    Engagement rate trend across your selected scope
                  </p>
                </div>
                <EngagementTrendChart data={engagementTrendData} />
              </div>
            </section>

            <section className="grid items-stretch gap-6 xl:grid-cols-2">
              <div className="flex h-full flex-col rounded-3xl border border-white/5 bg-[#101125] px-6 py-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Top Videos</h2>
                    <p className="text-xs text-slate-400">
                      Best performing content by {mediaSortOptions.find((opt) => opt.value === mediaSort)?.label?.toLowerCase()}
                    </p>
                  </div>
                  <AppDropdown
                    value={mediaSort}
                    options={mediaSortOptions}
                    onChange={setMediaSort}
                    className="min-h-0 min-w-[160px] rounded-full"
                    panelClassName="mt-2 min-w-[200px]"
                    placeholder=""
                  />
                </div>

                {topMediaItems.length ? (
                  <div className="flex flex-1 flex-col gap-3">
                    {topMediaItems.map((item, index) => (
                      <div
                        key={`${item.platform}-${item.externalId || item._id}-${index}`}
                        className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-400">#{index + 1}</span>
                          <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/10 bg-[#16182c]">
                            {item.thumbnailUrl ? (
                              <Image
                                src={item.thumbnailUrl}
                                alt={item.title || "Video thumbnail"}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-500">
                                {formatPlatformLabel(item.platform).slice(0, 2)}
                              </div>
                            )}
                          </div>
                          <div className="max-w-[220px]">
                            <p className="truncate text-sm font-semibold text-white">{item.title || "Untitled"}</p>
                            <p className="text-xs text-slate-400">
                              {formatPlatformLabel(item.platform)} • {formatShortDate(item.publishedAt)}
                            </p>
                          </div>
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
                  <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-slate-400">
                    No content matches the current filters.
                  </div>
                )}
              </div>

              <div className="flex h-full flex-col rounded-3xl border border-white/5 bg-[#101125] px-6 py-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Top Accounts</h2>
                    <p className="text-xs text-slate-400">
                      Accounts ranked by total views
                    </p>
                  </div>
                </div>

                {topAccounts.length ? (
                  <div className="flex flex-1 flex-col gap-3">
                    {topAccounts.map((account, index) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-400">#{index + 1}</span>
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#16182c] text-sm font-semibold text-sky-300">
                            {account.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{account.name}</p>
                            <p className="text-xs text-slate-400">
                              {formatPlatformLabel(account.platform)} · {formatNumber(account.followers)} followers
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">{formatNumber(account.views)}</p>
                          <p className="text-xs text-slate-400">{formatPercent(account.engagementRate)} avg. engagement</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-slate-400">
                    No accounts match the current filters.
                  </div>
                )}
              </div>
            </section>
          </div>
        );
      case "accounts":
        return (
          <AccountsTable
            accounts={analyticsData.accounts}
            media={analyticsData.media}
            selectedPlatform={selectedPlatform}
            onPlatformChange={setSelectedPlatform}
            onAccountDeleted={handleAccountDeleted}
            onAccountRefreshed={refreshAccount}
            onAddAccount={() => setIsModalOpen(true)}
            platformFilters={platformFilters}
            searchTerm={accountSearchTerm}
          />
        );
      case "videos":
        return (
          <VideosTable
            media={filteredMedia}
            accounts={analyticsData.accounts}
            accountOptions={accountOptions}
            selectedAccount={selectedAccount}
            onAccountChange={setSelectedAccount}
            selectedPlatform={selectedPlatform}
            onPlatformChange={setSelectedPlatform}
            selectedRange={selectedRange}
            onRangeChange={setSelectedRange}
            selectedProject={selectedProject}
            onProjectChange={setSelectedProject}
            onTrackVideo={() => setIsModalOpen(true)}
            platformFilters={platformFilters}
            searchTerm={videoSearchTerm}
          />
        );
      case "tracking":
        return (
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/5 bg-[#101125] p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">Choose Accounts</h2>
                <p className="text-xs text-slate-400">
                  Pick the accounts you want to track. Select multiple to compare them side-by-side.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {analyticsData.accounts.map((account) => {
                  const isSelected = selectedAccounts.includes(account._id);
                  const Icon = getPlatformIcon(account.platform);
                  return (
                    <button
                      key={account._id}
                      type="button"
                      onClick={() => toggleComparisonAccount(account._id)}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${isSelected
                          ? "border-sky-400/60 bg-sky-400/10 text-white"
                          : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
                        }`}
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          {accountDisplayLabel(account)}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatPlatformLabel(account.platform)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {isSelected ? <CheckCircle2 className="h-4 w-4 text-sky-300" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/5 bg-[#101125] px-4 py-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Tracking Range</h3>
                <p className="text-xs text-slate-400">Applies to the views vs time and median views timelines.</p>
              </div>
              <AppDropdown
                value={trackingRange}
                options={rangeOptions}
                onChange={setTrackingRange}
                className="min-h-0 min-w-[160px] rounded-full"
                panelClassName="mt-2 min-w-[200px]"
                placeholder=""
              />
            </div>
            <DailyViewsTimeline
              accounts={analyticsData.accounts}
              media={trackingMedia}
              selectedAccount={selectedAccount}
              selectedPlatform={selectedPlatform}
              selectedAccounts={selectedAccounts}
            />
            <MultiAccountDailyTrend
              accounts={analyticsData.accounts}
              media={analyticsData.media}
              selectedAccounts={selectedAccounts}
              rangeDays={trackingDays}
            />
            <AccountComparison accounts={analyticsData.accounts} selectedAccounts={selectedAccounts} />
            <TimeAnalysis
              accounts={analyticsData.accounts}
              selectedAccount={selectedAccount}
              selectedPlatform={selectedPlatform}
            />
            <PlatformDeepDive
              accounts={analyticsData.accounts}
              media={filteredMedia}
              selectedPlatform={selectedPlatform}
            />
          </div>
        );
      case "projects":
        return (
          <div className="rounded-3xl border border-white/5 bg-[#101125] p-10 text-center">
            <h2 className="text-xl font-semibold text-white">Projects Dashboard</h2>
            <p className="mt-3 text-sm text-slate-400">
              Project management insights are coming soon. Let us know which views would help your team most.
            </p>
          </div>
        );
      case "server":
        return (
          <div className="rounded-3xl border border-white/5 bg-[#101125] p-10 text-center">
            <h2 className="text-xl font-semibold text-white">MCP Server</h2>
            <p className="mt-3 text-sm text-slate-400">
              Connect your MCP server to stream live metrics and alerts directly into this workspace.
            </p>
          </div>
        );
      default:
        return null;
    }
  }

  // Create floating nav items for major filters
  const floatingNavItems = useMemo(() => {
    const selectedAccountLabel = accountOptions.find(opt => opt.value === selectedAccount)?.label || "All accounts";
    const selectedProjectLabel = projectOptions.find(opt => opt.value === selectedProject)?.label || "All projects";
    const selectedRangeLabel = rangeOptions.find(opt => opt.value === selectedRange)?.label || "Last 30 days";

    return [
      {
        name: "Accounts",
        placeholder: "Select account...",
        icon: <Users className="h-4 w-4" />,
        hasDropdown: true,
        selectedValue: accountOptions.find(opt => opt.value === selectedAccount)?.label || "All accounts",
        dropdownOptions: accountOptions.map(option => ({
          label: option.label,
          onClick: () => setSelectedAccount(option.value)
        }))
      },
      {
        name: "Platforms",
        placeholder: "Select platform...",
        icon: <Filter className="h-4 w-4" />,
        hasDropdown: false,
        platformOptions: platformFilters.map(platformKey => {
          const getPlatformImage = (platform) => {
            switch (platform) {
              case "instagram": return "/instagram-svgrepo-com.svg";
              case "youtube": return "/youtube-svgrepo-com.svg";
              case "tiktok": return "/tiktok-logo-logo-svgrepo-com.svg";
              default: return "/globe.svg";
            }
          };

          return {
            value: platformKey,
            label: platformKey === "all" ? "All Platforms" : platformKey.charAt(0).toUpperCase() + platformKey.slice(1),
            imageSrc: getPlatformImage(platformKey),
            isActive: selectedPlatform === platformKey,
            onClick: () => setSelectedPlatform(platformKey)
          };
        })
      },
      {
        name: "Date Range",
        placeholder: "Select date range...",
        icon: <CalendarRange className="h-4 w-4" />,
        hasDropdown: true,
        selectedValue: rangeOptions.find(opt => opt.value === selectedRange)?.label || "Last 30 days",
        dropdownOptions: rangeOptions.map(option => ({
          label: option.label,
          onClick: () => setSelectedRange(option.value)
        }))
      },
    ];
  }, [selectedAccount, selectedProject, selectedPlatform, selectedRange, accountOptions, projectOptions, platformFilters]);

  return (
    <div className="flex min-h-screen max-w-screen w-screen bg-[#05060f] text-white overflow-hidden">
      <aside className="hidden w-[80px] flex-col border-r border-white/5 bg-[#070714] px-3 py-6 lg:flex fixed left-0 top-0 h-screen z-40">
        <div className="flex flex-col items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-300">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>

        <nav className="mt-8 space-y-2">
          {sidebarNavigation.map((section) => (
            <div key={section.title}>
              <div className="space-y-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`flex w-full items-center justify-center rounded-2xl p-3 transition ${isActive
                          ? "bg-sky-500/20 text-white"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      title={item.label}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto" />
      </aside>

      <div className="flex flex-1 overflow-auto flex-col min-w-0 ml-[80px]">
        <main ref={mainScrollRef} className="flex-1 overflow-y-auto bg-[#05060f]">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            {activeTab !== "tracking" && (
              <FloatingNavbar 
                navItems={floatingNavItems} 
                activeNavItem={activeNavItem}
                onAddAccount={() => setIsModalOpen(true)}
                onRefresh={refreshAnalytics}
                isRefreshing={isRefreshing}
                accountSearchTerm={accountSearchTerm}
                setAccountSearchTerm={setAccountSearchTerm}
                videoSearchTerm={videoSearchTerm}
                setVideoSearchTerm={setVideoSearchTerm}
              />
            )}
            {refreshError ? (
              <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {refreshError}
              </div>
            ) : null}


            <div className="mt-6 pt-20">{renderContent()}</div>
          </div>
        </main>
      </div>

      <AddAccountModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAccountAdded={handleAccountAdded}
      />
    </div>
  );
}
