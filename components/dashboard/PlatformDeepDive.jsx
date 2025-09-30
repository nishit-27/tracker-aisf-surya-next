"use client";

import { useState, useMemo } from "react";
import buildDailyPerformance from "@/lib/utils/dailyPerformance";
import {
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  LineChart,
  Area,
  AreaChart,
} from "recharts";

function formatNumber(value) {
  if (value === undefined || value === null) return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  
  if (numeric >= 1_000_000) return `${(numeric / 1_000_000).toFixed(1)}M`;
  if (numeric >= 1_000) return `${(numeric / 1_000).toFixed(1)}K`;
  return numeric.toLocaleString();
}

function formatPercent(value) {
  if (value === undefined || value === null) return "0%";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0%";
  return `${numeric.toFixed(1)}%`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const platformColors = {
  instagram: "#E4405F",
  tiktok: "#000000",
  youtube: "#FF0000",
  twitter: "#1DA1F2",
  facebook: "#1877F2",
  linkedin: "#0077B5",
};

const platformMetrics = [
  { key: "followers", label: "Followers", color: "#3b82f6" },
  { key: "totalViews", label: "Total Views", color: "#10b981" },
  { key: "totalLikes", label: "Total Likes", color: "#f59e0b" },
  { key: "totalComments", label: "Total Comments", color: "#ef4444" },
  { key: "totalShares", label: "Total Shares", color: "#8b5cf6" },
  { key: "engagementRate", label: "Engagement Rate", color: "#06b6d4" },
  { key: "mediaCount", label: "Media Count", color: "#84cc16" },
];

export default function PlatformDeepDive({ accounts, media, selectedPlatform }) {
  const [selectedMetric, setSelectedMetric] = useState("followers");
  const [viewMode, setViewMode] = useState("pie"); // pie, bar, line

  const platformData = useMemo(() => {
    const platformStats = {};
    
    accounts.forEach(account => {
      const platform = account.platform;
      if (!platformStats[platform]) {
        platformStats[platform] = {
          platform,
          followers: 0,
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          engagementRate: 0,
          mediaCount: 0,
          accountCount: 0,
          color: platformColors[platform] || "#6b7280",
        };
      }
      
      const stats = account.stats || {};
      const breakdown = platformStats[platform];
      breakdown.followers += stats.followers || 0;
      breakdown.totalViews += stats.totalViews || 0;
      breakdown.totalLikes += stats.totalLikes || 0;
      breakdown.totalComments += stats.totalComments || 0;
      breakdown.totalShares += stats.totalShares || 0;
      breakdown.engagementRate += stats.engagementRate || 0;
      breakdown.mediaCount += account.mediaCount || 0;
      breakdown.accountCount += 1;
    });
    
    // Calculate average engagement rate
    Object.values(platformStats).forEach(platform => {
      if (platform.accountCount > 0) {
        platform.engagementRate = platform.engagementRate / platform.accountCount;
      }
    });
    
    return Object.values(platformStats);
  }, [accounts]);

  const mediaByPlatform = useMemo(() => {
    const mediaStats = {};
    
    media.forEach(item => {
      const platform = item.platform;
      if (!mediaStats[platform]) {
        mediaStats[platform] = {
          platform,
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          engagementRate: 0,
          postCount: 0,
          color: platformColors[platform] || "#6b7280",
        };
      }
      
      const metrics = item.metrics || {};
      const stats = mediaStats[platform];
      stats.totalViews += metrics.views || 0;
      stats.totalLikes += metrics.likes || 0;
      stats.totalComments += metrics.comments || 0;
      stats.totalShares += metrics.shares || 0;
      stats.engagementRate += metrics.engagementRate || 0;
      stats.postCount += 1;
    });
    
    // Calculate average engagement rate
    Object.values(mediaStats).forEach(platform => {
      if (platform.postCount > 0) {
        platform.engagementRate = platform.engagementRate / platform.postCount;
      }
    });
    
    return Object.values(mediaStats);
  }, [media]);

  const dailyPerformanceByPlatform = useMemo(() => {
    const grouped = new Map();

    (media || []).forEach((item) => {
      if (!item?.platform) {
        return;
      }

      if (!grouped.has(item.platform)) {
        grouped.set(item.platform, []);
      }

      grouped.get(item.platform).push(item);
    });

    return Array.from(grouped.entries()).map(([platform, items]) => ({
      platform,
      color: platformColors[platform] || "#6b7280",
      ...buildDailyPerformance(items),
    }));
  }, [media]);

  const aggregatedDailyPerformance = useMemo(() => {
    const result = buildDailyPerformance(media || []);
    return {
      platform: "all",
      color: "#38bdf8",
      ...result,
    };
  }, [media]);

  const filteredDailyPerformance = useMemo(() => {
    if (selectedPlatform && selectedPlatform !== "all") {
      const match = dailyPerformanceByPlatform.find(
        (entry) => entry.platform === selectedPlatform
      );

      return {
        aggregated: null,
        entries: match ? [match] : [],
      };
    }

    return {
      aggregated: aggregatedDailyPerformance.groups?.length
        ? aggregatedDailyPerformance
        : null,
      entries: dailyPerformanceByPlatform,
    };
  }, [selectedPlatform, aggregatedDailyPerformance, dailyPerformanceByPlatform]);

  const aggregatedDaily = filteredDailyPerformance.aggregated;
  const dailyEntries = filteredDailyPerformance.entries || [];
  const showDailyDrivers = Boolean(
    (aggregatedDaily && aggregatedDaily.trendSeries?.length) ||
      dailyEntries.some((entry) => entry.trendSeries?.length)
  );
  const latestAggregatedGroup = aggregatedDaily?.groups?.[0] || null;

  const topPerformingContent = useMemo(() => {
    return media
      .filter(item => selectedPlatform === "all" || item.platform === selectedPlatform)
      .sort((a, b) => (b.metrics?.views || 0) - (a.metrics?.views || 0))
      .slice(0, 10);
  }, [media, selectedPlatform]);

  const platformTrends = useMemo(() => {
    const dateMap = new Map();
    
    accounts.forEach(account => {
      if (!account.history) return;
      
      account.history.forEach(snapshot => {
        const date = new Date(snapshot.date).toISOString().split("T")[0];
        if (!dateMap.has(date)) {
          dateMap.set(date, { date });
        }
        
        const entry = dateMap.get(date);
        if (!entry[account.platform]) {
          entry[account.platform] = 0;
        }
        entry[account.platform] += snapshot[selectedMetric] || 0;
      });
    });
    
    return Array.from(dateMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30); // Last 30 data points
  }, [accounts, selectedMetric]);

  const ChartComponent = viewMode === "bar" ? BarChart : viewMode === "line" ? LineChart : PieChart;

  function DailyViewsTooltip({ active, payload, label }) {
    if (!active || !payload?.length) {
      return null;
    }

    const data = payload[0]?.payload || {};
    const delta = Number.isFinite(data.viewsDelta) ? data.viewsDelta : null;
    const deltaPct = Number.isFinite(data.viewsDeltaPct) ? data.viewsDeltaPct : null;
    const share = Number.isFinite(data.topDriverShare) ? data.topDriverShare : null;

    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/90 p-3 text-xs text-slate-300 shadow-xl">
        <div className="font-semibold text-white">{formatDate(label)}</div>
        <div className="mt-1 text-sm text-white">{formatNumber(data.views)} views</div>
        {delta !== null ? (
          <div
            className={`mt-1 text-[11px] ${
              delta >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {delta >= 0 ? "+" : "-"}
            {formatNumber(Math.abs(delta))}
            {deltaPct !== null ? (
              <>
                {" "}({deltaPct >= 0 ? "+" : "-"}
                {Math.abs(deltaPct).toFixed(1)}%)
              </>
            ) : null}
            <span className="ml-1 text-slate-500">vs previous day</span>
          </div>
        ) : null}
        {data.topDriverTitle ? (
          <div className="mt-2 text-[11px] leading-snug text-slate-300">
            Top driver: <span className="text-white">{data.topDriverTitle}</span>
            {share !== null ? (
              <span className="text-slate-400"> ({share.toFixed(1)}% of daily views)</span>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Platform Deep Dive</h3>
          <p className="text-xs text-slate-400">
            Comprehensive analysis across all platforms
          </p>
        </div>
        
        <div className="flex gap-2">
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          >
            {platformMetrics.map(metric => (
              <option key={metric.key} value={metric.key}>
                {metric.label}
              </option>
            ))}
          </select>
          
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          >
            <option value="pie">Pie Chart</option>
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
          </select>
        </div>
      </div>

      {/* Platform Distribution */}
      {platformData.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-300">Platform Distribution</h4>
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ChartComponent data={platformData}>
                  {viewMode === "pie" ? (
                    <>
                      <Pie
                        dataKey={selectedMetric}
                        data={platformData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ platform, value }) => `${platform}: ${formatNumber(value)}`}
                      >
                        {platformData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: "#0f172a", 
                          border: "1px solid #1f2937",
                          borderRadius: "8px"
                        }}
                        formatter={(value) => [formatNumber(value), platformMetrics.find(m => m.key === selectedMetric)?.label]}
                      />
                      <Legend />
                    </>
                  ) : viewMode === "bar" ? (
                    <>
                      <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                      <XAxis dataKey="platform" stroke="#94a3b8" />
                      <YAxis 
                        stroke="#94a3b8" 
                        tickFormatter={(value) => formatNumber(value)}
                      />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: "#0f172a", 
                          border: "1px solid #1f2937",
                          borderRadius: "8px"
                        }}
                        formatter={(value) => [formatNumber(value), platformMetrics.find(m => m.key === selectedMetric)?.label]}
                      />
                      <Bar 
                        dataKey={selectedMetric} 
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                    </>
                  ) : (
                    <>
                      <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                      <XAxis dataKey="platform" stroke="#94a3b8" />
                      <YAxis 
                        stroke="#94a3b8" 
                        tickFormatter={(value) => formatNumber(value)}
                      />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: "#0f172a", 
                          border: "1px solid #1f2937",
                          borderRadius: "8px"
                        }}
                        formatter={(value) => [formatNumber(value), platformMetrics.find(m => m.key === selectedMetric)?.label]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey={selectedMetric} 
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </>
                  )}
                </ChartComponent>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-3">
              {platformData.map(platform => (
                <div key={platform.platform} className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/70">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: platform.color }}
                    />
                    <div>
                      <div className="text-sm font-medium text-white capitalize">
                        {platform.platform}
                      </div>
                      <div className="text-xs text-slate-400">
                        {platform.accountCount} account{platform.accountCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">
                      {formatNumber(platform[selectedMetric])}
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatPercent((platform[selectedMetric] / platformData.reduce((sum, p) => sum + p[selectedMetric], 0)) * 100)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
      </div>
    </div>
  )}

  {/* Media Performance by Platform */}
  {mediaByPlatform.length > 0 && (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-slate-300">Content Performance by Platform</h4>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={mediaByPlatform}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
            <XAxis dataKey="platform" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{ 
                backgroundColor: "#0f172a", 
                border: "1px solid #1f2937",
                borderRadius: "8px"
              }}
            />
            <Bar dataKey="totalViews" fill="#10b981" name="Total Views" />
            <Bar dataKey="totalLikes" fill="#f59e0b" name="Total Likes" />
            <Bar dataKey="totalComments" fill="#ef4444" name="Total Comments" />
            <Bar dataKey="totalShares" fill="#8b5cf6" name="Total Shares" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )}

  {/* Daily View Drivers */}
  {showDailyDrivers && (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-slate-300">Daily View Drivers</h4>

      {aggregatedDaily?.trendSeries?.length ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div>
              <h5 className="text-sm font-semibold text-white">Entire Channel</h5>
              <p className="text-xs text-slate-400">Combined views across every tracked platform</p>
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={aggregatedDaily.trendSeries}>
                <defs>
                  <linearGradient id="daily-all-platforms" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  }
                />
                <YAxis stroke="#94a3b8" tickFormatter={(value) => formatNumber(value)} />
                <Tooltip content={<DailyViewsTooltip />} />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fill="url(#daily-all-platforms)"
                  name="Views"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {latestAggregatedGroup ? (
            <div className="flex flex-col gap-1 border-t border-slate-800 px-4 py-3 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
              <div>
                Latest day {formatDate(latestAggregatedGroup.date)} • {formatNumber(latestAggregatedGroup.totals.views)} views
              </div>
              {latestAggregatedGroup.topPost ? (
                <div className="text-xs text-slate-400">
                  Top driver: <span className="text-white">{latestAggregatedGroup.topPost.title || latestAggregatedGroup.topPost.externalId || "Untitled"}</span>
                  {" • "}
                  {formatNumber(latestAggregatedGroup.topPost.metrics?.views)} views
                  {Number.isFinite(latestAggregatedGroup.topPost.viewShare)
                    ? ` (${latestAggregatedGroup.topPost.viewShare.toFixed(1)}% of the day)`
                    : ""}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {dailyEntries.map((entry) => {
        if (!entry.trendSeries?.length) {
          return null;
        }

        const gradientId = `daily-${String(entry.platform)
          .replace(/[^a-z0-9]+/gi, "-")
          .toLowerCase()}-gradient`;
        const latestGroup = entry.groups?.[0] || null;
        const platformLabel = entry.platform.charAt(0).toUpperCase() + entry.platform.slice(1);

        return (
          <div
            key={`daily-platform-${entry.platform}`}
            className="rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div>
                <h5 className="text-sm font-semibold text-white">{platformLabel}</h5>
                <p className="text-xs text-slate-400">
                  {latestGroup
                    ? `${latestGroup.totals.postCount} post${latestGroup.totals.postCount === 1 ? "" : "s"} on ${formatDate(latestGroup.date)}`
                    : "Daily totals across tracked content"}
                </p>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={entry.trendSeries}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={entry.color} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={entry.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    }
                  />
                  <YAxis stroke="#94a3b8" tickFormatter={(value) => formatNumber(value)} />
                  <Tooltip content={<DailyViewsTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke={entry.color}
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                    name="Views"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {latestGroup ? (
              <div className="flex flex-col gap-1 border-t border-slate-800 px-4 py-3 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
                <div>
                  {formatNumber(latestGroup.totals.views)} views • {formatNumber(latestGroup.totals.likes)} likes • {formatNumber(latestGroup.totals.comments)} comments
                </div>
                {latestGroup.topPost ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>
                      Top driver: <span className="text-white">{latestGroup.topPost.title || latestGroup.topPost.externalId || "Untitled"}</span>
                      {" • "}
                      {formatNumber(latestGroup.topPost.metrics?.views)} views
                      {Number.isFinite(latestGroup.topPost.viewShare)
                        ? ` (${latestGroup.topPost.viewShare.toFixed(1)}% of the day)`
                        : ""}
                    </span>
                    {latestGroup.topPost.url ? (
                      <a
                        href={latestGroup.topPost.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-300 hover:text-sky-200"
                      >
                        View post
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  )}

  {/* Platform Trends */}
  {platformTrends.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-300">Platform Trends Over Time</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={platformTrends}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: "#0f172a", 
                    border: "1px solid #1f2937",
                    borderRadius: "8px"
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                {platformData.map(platform => (
                  <Line
                    key={platform.platform}
                    type="monotone"
                    dataKey={platform.platform}
                    stroke={platform.color}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Performing Content */}
      {topPerformingContent.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-300">Top Performing Content</h4>
          <div className="space-y-2">
            {topPerformingContent.slice(0, 5).map((item, index) => (
              <div key={`${item.platform}-${item.externalId}`} className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/70">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium text-slate-400">#{index + 1}</div>
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: platformColors[item.platform] || "#6b7280" }}
                  />
                  <div>
                    <div className="text-sm font-medium text-white truncate max-w-[200px]">
                      {item.title || "Untitled"}
                    </div>
                    <div className="text-xs text-slate-400 capitalize">
                      {item.platform} • {new Date(item.publishedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">
                    {formatNumber(item.metrics?.views)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatPercent(item.metrics?.engagementRate)} engagement
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
