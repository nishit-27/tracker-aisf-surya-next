"use client";

import { useState, useMemo } from "react";
import buildDailyPerformance from "@/lib/utils/dailyPerformance";
import {
  Line,
  LineChart,
  Area,
  AreaChart,
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
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
  return `${numeric.toFixed(2)}%`;
}

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

export default function AccountAnalysisModal({ account, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [chartType, setChartType] = useState("line");
  const [sortBy, setSortBy] = useState("publishedAt");

  const profileImage = account?.metadata?.profile?.profilePictureUrl || 
                      account?.metadata?.profile?.profile_picture_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(account?.displayName || account?.username || '')}&background=1f2937&color=fff&size=64`;

  const stats = account?.stats || {};
  const history = account?.history || [];

  const historyData = useMemo(() => {
    if (!history.length) return [];
    
    return history
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(entry => ({
        date: new Date(entry.date).toISOString().split("T")[0],
        followers: entry.followers || 0,
        totalViews: entry.totalViews || 0,
        totalLikes: entry.totalLikes || 0,
        totalComments: entry.totalComments || 0,
        totalShares: entry.totalShares || 0,
        engagementRate: entry.engagementRate || 0,
      }));
  }, [history]);

  const mediaStats = useMemo(() => {
    const media = account?.media || [];
    const totalViews = media.reduce((sum, item) => sum + (item.metrics?.views || 0), 0);
    const totalLikes = media.reduce((sum, item) => sum + (item.metrics?.likes || 0), 0);
    const totalComments = media.reduce((sum, item) => sum + (item.metrics?.comments || 0), 0);
    const totalShares = media.reduce((sum, item) => sum + (item.metrics?.shares || 0), 0);
    const avgEngagement = media.length > 0 
      ? media.reduce((sum, item) => sum + (item.metrics?.engagementRate || 0), 0) / media.length 
      : 0;

    // Calculate median views of last 10 posts
    const last10Posts = media
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
      .slice(0, 10)
      .map(post => post.metrics?.views || 0)
      .sort((a, b) => a - b);
    
    const medianViews = last10Posts.length > 0 
      ? last10Posts.length % 2 === 0
        ? (last10Posts[last10Posts.length / 2 - 1] + last10Posts[last10Posts.length / 2]) / 2
        : last10Posts[Math.floor(last10Posts.length / 2)]
      : 0;

    return {
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      avgEngagement,
      postCount: media.length,
      avgViewsPerPost: media.length > 0 ? totalViews / media.length : 0,
      medianViewsLast10: medianViews,
    };
  }, [account?.media]);

  const sortedMedia = useMemo(() => {
    const media = account?.media || [];
    if (!media.length) return [];

    return [...media].sort((a, b) => {
      switch (sortBy) {
        case "publishedAt":
          return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
        case "views":
          return (b.metrics?.views || 0) - (a.metrics?.views || 0);
        case "likes":
          return (b.metrics?.likes || 0) - (a.metrics?.likes || 0);
        case "comments":
          return (b.metrics?.comments || 0) - (a.metrics?.comments || 0);
        case "engagementRate":
          return (b.metrics?.engagementRate || 0) - (a.metrics?.engagementRate || 0);
        default:
          return 0;
      }
    });
  }, [account?.media, sortBy]);

  const dailyPerformance = useMemo(
    () => buildDailyPerformance(account?.media || []),
    [account?.media]
  );

  const dailyGroups = dailyPerformance.groups || [];
  const dailyTrendSeries = dailyPerformance.trendSeries || [];

  function DailyTrendTooltip({ active, payload, label }) {
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

  if (!isOpen || !account) return null;

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "trends", label: "Trends", icon: "📈" },
    { id: "content", label: "Content", icon: "📝" },
    { id: "daily", label: "Daily Matrix", icon: "📅" },
    { id: "posts", label: "All Posts", icon: "📋" },
    { id: "insights", label: "Insights", icon: "💡" },
  ];

  const ChartComponent = chartType === "area" ? AreaChart : chartType === "bar" ? BarChart : LineChart;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        
        <div className="relative w-full max-w-6xl bg-slate-900/95 backdrop-blur-sm rounded-2xl border border-slate-800 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <img
                src={profileImage}
                alt={account.displayName || account.username}
                className="h-16 w-16 rounded-full object-cover"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(account.displayName || account.username)}&background=1f2937&color=fff&size=64`;
                }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-white">
                    {account.displayName || account.username || account.accountId}
                  </h2>
                  <svg className="h-5 w-5 text-sky-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-slate-400">@{account.username} • {account.platform.charAt(0).toUpperCase() + account.platform.slice(1)}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-800 bg-slate-900/30">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-sky-500 text-sky-400 bg-slate-800/50"
                    : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/30"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto bg-slate-900/30">
            {activeTab === "overview" && (
              <div className="space-y-6">
                 {/* Key Metrics */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                     <div className="text-2xl font-bold text-white">{formatNumber(stats.followers)}</div>
                     <div className="text-sm text-slate-400">Followers</div>
                   </div>
                   <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                     <div className="text-2xl font-bold text-white">{formatNumber(stats.totalViews)}</div>
                     <div className="text-sm text-slate-400">Total Views</div>
                   </div>
                   <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                     <div className="text-2xl font-bold text-white">{formatPercent(stats.engagementRate)}</div>
                     <div className="text-sm text-slate-400">Engagement Rate</div>
                   </div>
                   <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                     <div className="text-2xl font-bold text-white">{formatNumber(mediaStats.postCount)}</div>
                     <div className="text-sm text-slate-400">Posts</div>
                   </div>
                 </div>

                 {/* Performance Insights */}
                 <div className="grid md:grid-cols-2 gap-6">
                   <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                     <h3 className="text-lg font-semibold text-white mb-4">View Performance</h3>
                     <div className="space-y-4">
                       <div className="flex items-center justify-between">
                         <div>
                           <div className="text-sm text-slate-400">Average per Post</div>
                           <div className="text-xl font-semibold text-white">{formatNumber(mediaStats.avgViewsPerPost)}</div>
                         </div>
                         <div className="w-12 h-12 rounded-full bg-sky-500/20 flex items-center justify-center">
                           <svg className="w-6 h-6 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                           </svg>
                         </div>
                       </div>
                       <div className="flex items-center justify-between">
                         <div>
                           <div className="text-sm text-slate-400">Median (Last 10)</div>
                           <div className="text-xl font-semibold text-white">{formatNumber(mediaStats.medianViewsLast10)}</div>
                         </div>
                         <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                           <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                           </svg>
                         </div>
                       </div>
                     </div>
                   </div>

                   <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                     <h3 className="text-lg font-semibold text-white mb-4">Engagement Breakdown</h3>
                     <div className="space-y-4">
                       <div className="flex items-center justify-between">
                         <div>
                           <div className="text-sm text-slate-400">Total Likes</div>
                           <div className="text-xl font-semibold text-white">{formatNumber(stats.totalLikes)}</div>
                         </div>
                         <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                           <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                           </svg>
                         </div>
                       </div>
                       <div className="flex items-center justify-between">
                         <div>
                           <div className="text-sm text-slate-400">Total Comments</div>
                           <div className="text-xl font-semibold text-white">{formatNumber(stats.totalComments)}</div>
                         </div>
                         <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                           <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                           </svg>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>

                {/* Account Details */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Platform:</span>
                        <span className="text-white capitalize">{account.platform}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Username:</span>
                        <span className="text-white">@{account.username}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Account ID:</span>
                        <span className="text-white font-mono text-sm">{account.accountId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Added:</span>
                        <span className="text-white">{formatDate(account.createdAt)}</span>
                      </div>
                       <div className="flex justify-between">
                         <span className="text-slate-400">Last Synced:</span>
                         <div className="flex items-center gap-2">
                           <span className="text-white">{formatDate(account.lastSyncedAt)}</span>
                           <div className="w-2 h-2 rounded-full bg-green-400"></div>
                         </div>
                       </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Performance Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Likes:</span>
                        <span className="text-white">{formatNumber(stats.totalLikes)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Comments:</span>
                        <span className="text-white">{formatNumber(stats.totalComments)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Shares:</span>
                        <span className="text-white">{formatNumber(stats.totalShares)}</span>
                      </div>
                       <div className="flex justify-between">
                         <span className="text-slate-400">Avg Views/Post:</span>
                         <span className="text-white">{formatNumber(mediaStats.avgViewsPerPost)}</span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "trends" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Performance Trends</h3>
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                  >
                    <option value="line">Line Chart</option>
                    <option value="area">Area Chart</option>
                    <option value="bar">Bar Chart</option>
                  </select>
                </div>

                {historyData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ChartComponent data={historyData}>
                        <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#94a3b8" 
                          fontSize={12}
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: "#0f172a", 
                            border: "1px solid #1f2937",
                            borderRadius: "8px"
                          }}
                          labelStyle={{ color: "#fff" }}
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <Legend wrapperStyle={{ color: "#94a3b8" }} />
                        
                        {chartType === "line" ? (
                          <>
                            <Line type="monotone" dataKey="followers" stroke="#3b82f6" strokeWidth={2} name="Followers" />
                            <Line type="monotone" dataKey="totalViews" stroke="#10b981" strokeWidth={2} name="Views" />
                            <Line type="monotone" dataKey="totalLikes" stroke="#f59e0b" strokeWidth={2} name="Likes" />
                          </>
                        ) : chartType === "area" ? (
                          <>
                            <Area type="monotone" dataKey="followers" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Followers" />
                            <Area type="monotone" dataKey="totalViews" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Views" />
                            <Area type="monotone" dataKey="totalLikes" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="Likes" />
                          </>
                        ) : (
                          <>
                            <Bar dataKey="followers" fill="#3b82f6" name="Followers" />
                            <Bar dataKey="totalViews" fill="#10b981" name="Views" />
                            <Bar dataKey="totalLikes" fill="#f59e0b" name="Likes" />
                          </>
                        )}
                      </ChartComponent>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-slate-400">No historical data available for this account.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "content" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Content Performance</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                    <h4 className="text-md font-semibold text-white mb-4">Media Statistics</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Posts:</span>
                        <span className="text-white">{mediaStats.postCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Views:</span>
                        <span className="text-white">{formatNumber(mediaStats.totalViews)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Likes:</span>
                        <span className="text-white">{formatNumber(mediaStats.totalLikes)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Comments:</span>
                        <span className="text-white">{formatNumber(mediaStats.totalComments)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Shares:</span>
                        <span className="text-white">{formatNumber(mediaStats.totalShares)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                    <h4 className="text-md font-semibold text-white mb-4">Averages</h4>
                    <div className="space-y-3">
                       <div className="flex justify-between">
                         <span className="text-slate-400">Avg Views/Post:</span>
                         <span className="text-white">{formatNumber(mediaStats.avgViewsPerPost)}</span>
                       </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Avg Likes/Post:</span>
                        <span className="text-white">{formatNumber(mediaStats.totalLikes / Math.max(mediaStats.postCount, 1))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Avg Comments/Post:</span>
                        <span className="text-white">{formatNumber(mediaStats.totalComments / Math.max(mediaStats.postCount, 1))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Avg Engagement:</span>
                        <span className="text-white">{formatPercent(mediaStats.avgEngagement)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "daily" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Daily Performance Matrix</h3>
                  <p className="text-xs text-slate-400">
                    Compare how each post performed against others published on the same day and review combined reach.
                  </p>
                </div>

                {dailyGroups.length ? (
                  <div className="space-y-6">
                    {dailyTrendSeries.length ? (
                      <div className="rounded-lg border border-slate-800 bg-slate-900/50 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-200">Daily Views Trend</h4>
                            <p className="text-xs text-slate-400">
                              Track total views per day and highlight the post that drove performance.
                            </p>
                          </div>
                        </div>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyTrendSeries}>
                              <defs>
                                <linearGradient id="dailyViewsGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                              <XAxis
                                dataKey="date"
                                stroke="#94a3b8"
                                tickFormatter={(value) =>
                                  new Date(value).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })
                                }
                              />
                              <YAxis stroke="#94a3b8" tickFormatter={(value) => formatNumber(value)} />
                              <Tooltip content={<DailyTrendTooltip />} />
                              <Area
                                type="monotone"
                                dataKey="views"
                                stroke="#38bdf8"
                                strokeWidth={2}
                                fill="url(#dailyViewsGradient)"
                                name="Views"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-lg border border-slate-800 bg-slate-900/50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-800">
                        <h4 className="text-sm font-semibold text-slate-200">Daily Totals</h4>
                        <p className="text-xs text-slate-400">Aggregated metrics across all posts published each day.</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-800 text-sm">
                          <thead className="bg-slate-900/60">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Date</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Posts</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Views</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Likes</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Comments</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Shares</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Avg Engagement</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Top Driver</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {dailyGroups.map((group) => (
                              <tr key={group.date} className="hover:bg-slate-900/60">
                                <td className="px-4 py-3 text-sm text-slate-200">{formatDate(group.date)}</td>
                                <td className="px-4 py-3 text-sm text-slate-200">{group.totals.postCount}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-white">{formatNumber(group.totals.views)}</td>
                                <td className="px-4 py-3 text-sm text-slate-200">{formatNumber(group.totals.likes)}</td>
                                <td className="px-4 py-3 text-sm text-slate-200">{formatNumber(group.totals.comments)}</td>
                                <td className="px-4 py-3 text-sm text-slate-200">{formatNumber(group.totals.shares)}</td>
                                <td className="px-4 py-3 text-sm text-slate-200">{formatPercent(group.totals.averageEngagement)}</td>
                                <td className="px-4 py-3 text-sm text-slate-200">
                                  {group.topPost ? (
                                    <div className="flex flex-col">
                                      <span className="font-medium text-white truncate max-w-[240px]">{group.topPost.title || group.topPost.externalId || "Untitled"}</span>
                                      <span className="text-xs text-slate-400">
                                        {formatNumber(group.topPost.metrics?.views)} views • {Number.isFinite(group.topPost.viewShare)
                                          ? `${group.topPost.viewShare.toFixed(1)}%`
                                          : "0%"} of the day
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-500">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {dailyGroups.map((group) => (
                        <div key={group.date} className="rounded-xl border border-slate-800 bg-slate-900/40">
                          <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-4 md:flex-row md:items-center md:justify-between">
                            <div>
                              <h4 className="text-base font-semibold text-white">{formatDate(group.date)}</h4>
                              <p className="text-xs text-slate-400">{group.totals.postCount} post{group.totals.postCount === 1 ? "" : "s"} published</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-right sm:grid-cols-4 lg:grid-cols-5">
                              <div>
                                <div className="text-sm text-slate-400">Total Views</div>
                                <div className="text-lg font-semibold text-white">{formatNumber(group.totals.views)}</div>
                              </div>
                              <div>
                                <div className="text-sm text-slate-400">Likes</div>
                                <div className="text-lg font-semibold text-white">{formatNumber(group.totals.likes)}</div>
                              </div>
                              <div>
                                <div className="text-sm text-slate-400">Comments</div>
                                <div className="text-lg font-semibold text-white">{formatNumber(group.totals.comments)}</div>
                              </div>
                              <div>
                                <div className="text-sm text-slate-400">Shares</div>
                                <div className="text-lg font-semibold text-white">{formatNumber(group.totals.shares)}</div>
                              </div>
                              <div>
                                <div className="text-sm text-slate-400">Avg Engagement</div>
                                <div className="text-lg font-semibold text-white">{formatPercent(group.totals.averageEngagement)}</div>
                              </div>
                            </div>
                          </div>

                          {group.topPost ? (
                            <div className="flex flex-col gap-2 border-b border-slate-800/80 bg-sky-900/10 px-4 py-3 text-xs text-sky-100 md:flex-row md:items-center md:justify-between">
                              <div>
                                <span className="font-semibold text-sky-200">Top driver:</span>{" "}
                                <span className="text-sky-100">{group.topPost.title || group.topPost.externalId || "Untitled"}</span>
                                <span className="text-slate-400">
                                  {" "}• {formatNumber(group.topPost.metrics?.views)} views
                                  {Number.isFinite(group.topPost.viewShare)
                                    ? ` (${group.topPost.viewShare.toFixed(1)}% of the day)`
                                    : ""}
                                </span>
                              </div>
                              {group.topPost.url ? (
                                <a
                                  href={group.topPost.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-medium text-sky-300 hover:text-sky-200"
                                >
                                  View post
                                </a>
                              ) : null}
                            </div>
                          ) : null}

                          <div className="space-y-3 p-4">
                            {group.posts.map((post) => (
                              <div
                                key={post.id}
                                className="flex flex-col gap-4 rounded-lg border border-slate-800/60 bg-slate-900/60 p-4 transition-colors hover:border-slate-700 lg:flex-row lg:items-center"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-sm font-semibold text-slate-300">
                                    #{post.rank}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {post.thumbnailUrl ? (
                                      <img
                                        src={post.thumbnailUrl}
                                        alt={post.title || post.externalId}
                                        className="h-12 w-12 rounded-lg object-cover"
                                      />
                                    ) : null}
                                    <div>
                                      <div className="text-sm font-semibold text-white max-w-[340px] truncate">
                                        {post.title || post.externalId || "Untitled"}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <span>{formatDate(post.publishedAt)}</span>
                                        {post.url && (
                                          <a
                                            href={post.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-sky-400 hover:text-sky-300"
                                          >
                                            View post
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-1 flex-wrap gap-4 lg:justify-end">
                                  <div className="text-right">
                                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Views</div>
                                    <div className="text-lg font-semibold text-white">{formatNumber(post.metrics?.views)}</div>
                                    <div className="text-xs text-slate-400">{post.viewShare.toFixed(2)}% of daily views</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Likes</div>
                                    <div className="text-lg font-semibold text-white">{formatNumber(post.metrics?.likes)}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Comments</div>
                                    <div className="text-lg font-semibold text-white">{formatNumber(post.metrics?.comments)}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Shares</div>
                                    <div className="text-lg font-semibold text-white">{formatNumber(post.metrics?.shares)}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Engagement</div>
                                    <div className="text-lg font-semibold text-white">{formatPercent(post.metrics?.engagementRate)}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center text-sm text-slate-400">
                    No published posts found to build a daily matrix.
                  </div>
                )}
              </div>
            )}

            {activeTab === "posts" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">All Posts ({sortedMedia.length})</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Sort by:</span>
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                    >
                      <option value="publishedAt">Published Date</option>
                      <option value="views">Views</option>
                      <option value="likes">Likes</option>
                      <option value="comments">Comments</option>
                      <option value="engagementRate">Engagement Rate</option>
                    </select>
                  </div>
                </div>

                {sortedMedia && sortedMedia.length > 0 ? (
                  <div className="space-y-3">
                    {sortedMedia.map((post, index) => (
                      <div key={post._id || index} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 hover:bg-slate-900/70 transition-colors">
                        <div className="flex items-start gap-4">
                          {/* Post Thumbnail/Preview */}
                          <div className="flex-shrink-0">
                            {post.thumbnailUrl || post.imageUrl ? (
                              <img
                                src={post.thumbnailUrl || post.imageUrl}
                                alt={post.title || "Post thumbnail"}
                                className="h-20 w-20 rounded-lg object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="h-20 w-20 rounded-lg bg-slate-800 flex items-center justify-center">
                                <svg className="h-8 w-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* Post Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-lg font-semibold text-white truncate">
                                  {post.title || "Untitled Post"}
                                </h4>
                                <p className="text-sm text-slate-400 mt-1">
                                  {formatDate(post.publishedAt)} • {post.platform?.charAt(0).toUpperCase() + post.platform?.slice(1)}
                                </p>
                                {post.description && (
                                  <p className="text-sm text-slate-300 mt-2 line-clamp-2">
                                    {post.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <a
                                  href={post.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1 text-xs font-medium text-sky-300 bg-sky-900/20 border border-sky-800 rounded-lg hover:bg-sky-900/30 transition-colors"
                                >
                                  View Post
                                </a>
                              </div>
                            </div>

                            {/* Post Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                              <div className="text-center">
                                <div className="text-lg font-semibold text-white">
                                  {formatNumber(post.metrics?.views)}
                                </div>
                                <div className="text-xs text-slate-400">Views</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-white">
                                  {formatNumber(post.metrics?.likes)}
                                </div>
                                <div className="text-xs text-slate-400">Likes</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-white">
                                  {formatNumber(post.metrics?.comments)}
                                </div>
                                <div className="text-xs text-slate-400">Comments</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-white">
                                  {formatNumber(post.metrics?.shares)}
                                </div>
                                <div className="text-xs text-slate-400">Shares</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-white">
                                  {formatPercent(post.metrics?.engagementRate)}
                                </div>
                                <div className="text-xs text-slate-400">Engagement</div>
                              </div>
                            </div>

                            {/* Additional Post Info */}
                            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                              <span>ID: {post.externalId}</span>
                              {post.type && <span>Type: {post.type}</span>}
                              {post.duration && <span>Duration: {post.duration}s</span>}
                              {post.hashtags && post.hashtags.length > 0 && (
                                <span>Hashtags: {post.hashtags.length}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="h-12 w-12 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-slate-400">No posts found for this account.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "insights" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Account Insights</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                    <h4 className="text-md font-semibold text-white mb-4">Growth Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Follower Growth:</span>
                        <span className="text-white">{formatNumber(stats.followers)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Engagement Rate:</span>
                        <span className="text-white">{formatPercent(stats.engagementRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Content Velocity:</span>
                        <span className="text-white">{formatNumber(mediaStats.postCount)} posts</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                    <h4 className="text-md font-semibold text-white mb-4">Platform Performance</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Platform:</span>
                        <span className="text-white capitalize">{account.platform}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Account Health:</span>
                        <span className="text-green-400">Active</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sync Status:</span>
                        <span className="text-green-400">Up to date</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
