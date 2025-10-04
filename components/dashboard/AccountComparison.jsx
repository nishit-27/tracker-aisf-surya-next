"use client";

import { useState, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import AppDropdown from "../ui/AppDropdown";

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

const comparisonMetrics = [
  { key: "followers", label: "Followers", color: "#3b82f6" },
  { key: "totalViews", label: "Total Views", color: "#10b981" },
  { key: "totalLikes", label: "Total Likes", color: "#f59e0b" },
  { key: "totalComments", label: "Total Comments", color: "#ef4444" },
  { key: "totalShares", label: "Total Shares", color: "#8b5cf6" },
  { key: "engagementRate", label: "Engagement Rate", color: "#06b6d4" },
  { key: "mediaCount", label: "Media Count", color: "#84cc16" },
];

const viewModeOptions = [
  { value: "bar", label: "Bar Chart" },
  { value: "line", label: "Line Chart" },
  { value: "area", label: "Area Chart" },
];

export default function AccountComparison({ accounts, selectedAccounts = [] }) {
  const [selectedMetric, setSelectedMetric] = useState("followers");
  const [viewMode, setViewMode] = useState("bar"); // bar, line, area
  const metricOptions = useMemo(
    () => comparisonMetrics.map((metric) => ({ value: metric.key, label: metric.label })),
    [],
  );

  const comparisonData = useMemo(() => {
    if (selectedAccounts.length < 2) return [];
    
    return selectedAccounts.map(accountId => {
      const account = accounts.find(acc => acc._id === accountId);
      if (!account) return null;
      
      const stats = account.stats || {};
      return {
        name: account.displayName || account.username || account.accountId,
        platform: account.platform,
        followers: stats.followers || 0,
        totalViews: stats.totalViews || 0,
        totalLikes: stats.totalLikes || 0,
        totalComments: stats.totalComments || 0,
        totalShares: stats.totalShares || 0,
        engagementRate: stats.engagementRate || 0,
        mediaCount: account.mediaCount || 0,
      };
    }).filter(Boolean);
  }, [accounts, selectedAccounts]);

  const trendData = useMemo(() => {
    if (selectedAccounts.length < 2) return [];
    
    const dateMap = new Map();
    
    selectedAccounts.forEach(accountId => {
      const account = accounts.find(acc => acc._id === accountId);
      if (!account?.history) return;
      
      account.history.forEach(snapshot => {
        const date = new Date(snapshot.date).toISOString().split("T")[0];
        if (!dateMap.has(date)) {
          dateMap.set(date, { date });
        }
        
        const entry = dateMap.get(date);
        const accountName = account.displayName || account.username || account.accountId;
        
        if (!entry[accountName]) {
          entry[accountName] = 0;
        }
        entry[accountName] += snapshot[selectedMetric] || 0;
      });
    });
    
    return Array.from(dateMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [accounts, selectedAccounts, selectedMetric]);

  if (selectedAccounts.length < 2) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Account Comparison</h3>
          <p className="text-sm text-slate-400">
            Select at least 2 accounts to compare their performance
          </p>
        </div>
      </div>
    );
  }

  const ChartComponent = viewMode === "line" ? LineChart : viewMode === "area" ? AreaChart : BarChart;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Account Comparison</h3>
          <p className="text-xs text-slate-400">
            Compare {selectedAccounts.length} accounts across different metrics
          </p>
        </div>
        
        <div className="flex gap-2">
          <AppDropdown
            value={selectedMetric}
            options={metricOptions}
            onChange={setSelectedMetric}
            className="min-w-[200px]"
            panelClassName="mt-2 min-w-[220px]"
            placeholder=""
          />

          <AppDropdown
            value={viewMode}
            options={viewModeOptions}
            onChange={setViewMode}
            className="min-w-[160px]"
            panelClassName="mt-2 min-w-[200px]"
            placeholder=""
          />
        </div>
      </div>

      {/* Current Comparison */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-slate-300">Current Performance</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent data={comparisonData}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8" 
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={12}
                tickFormatter={(value) => 
                  selectedMetric === "engagementRate" 
                    ? formatPercent(value) 
                    : formatNumber(value)
                }
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: "#0f172a", 
                  border: "1px solid #1f2937",
                  borderRadius: "8px"
                }}
                labelStyle={{ color: "#fff" }}
                formatter={(value) => [
                  selectedMetric === "engagementRate" 
                    ? formatPercent(value) 
                    : formatNumber(value),
                  comparisonMetrics.find(m => m.key === selectedMetric)?.label || selectedMetric
                ]}
              />
              {viewMode === "bar" && (
                <Bar 
                  dataKey={selectedMetric} 
                  fill={comparisonMetrics.find(m => m.key === selectedMetric)?.color || "#3b82f6"}
                  radius={[4, 4, 0, 0]}
                />
              )}
              {viewMode === "line" && (
                <Line 
                  type="monotone" 
                  dataKey={selectedMetric} 
                  stroke={comparisonMetrics.find(m => m.key === selectedMetric)?.color || "#3b82f6"}
                  strokeWidth={2}
                  dot={{ fill: comparisonMetrics.find(m => m.key === selectedMetric)?.color || "#3b82f6", r: 4 }}
                />
              )}
              {viewMode === "area" && (
                <Area
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke={comparisonMetrics.find(m => m.key === selectedMetric)?.color || "#3b82f6"}
                  fill={comparisonMetrics.find(m => m.key === selectedMetric)?.color || "#3b82f6"}
                  fillOpacity={0.3}
                />
              )}
            </ChartComponent>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trend Comparison */}
      {trendData.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-300">Trend Over Time</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12}
                  tickFormatter={(value) => 
                    selectedMetric === "engagementRate" 
                      ? formatPercent(value) 
                      : formatNumber(value)
                  }
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: "#0f172a", 
                    border: "1px solid #1f2937",
                    borderRadius: "8px"
                  }}
                  labelStyle={{ color: "#fff" }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value, name) => [
                    selectedMetric === "engagementRate" 
                      ? formatPercent(value) 
                      : formatNumber(value),
                    name
                  ]}
                />
                {comparisonData.map((account, index) => (
                  <Line
                    key={account.name}
                    type="monotone"
                    dataKey={account.name}
                    stroke={comparisonMetrics[index % comparisonMetrics.length].color}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detailed Metrics Table */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-slate-300">Detailed Metrics</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                  Account
                </th>
                {comparisonMetrics.map(metric => (
                  <th key={metric.key} className="text-right py-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                    {metric.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((account, index) => (
                <tr key={account.name} className="border-b border-slate-800/50">
                  <td className="py-3">
                    <div>
                      <div className="font-medium text-white">{account.name}</div>
                      <div className="text-xs text-slate-400 capitalize">{account.platform}</div>
                    </div>
                  </td>
                  {comparisonMetrics.map(metric => (
                    <td key={metric.key} className="text-right py-3 text-slate-100">
                      {metric.key === "engagementRate" 
                        ? formatPercent(account[metric.key])
                        : formatNumber(account[metric.key])
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
