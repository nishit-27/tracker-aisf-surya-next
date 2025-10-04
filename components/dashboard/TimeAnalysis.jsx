"use client";

import { useState, useMemo } from "react";
import {
  Line,
  LineChart,
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  Bar,
  BarChart,
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

const timeAnalysisMetrics = [
  { key: "followers", label: "Followers", color: "#3b82f6" },
  { key: "totalViews", label: "Total Views", color: "#10b981" },
  { key: "totalLikes", label: "Total Likes", color: "#f59e0b" },
  { key: "totalComments", label: "Total Comments", color: "#ef4444" },
  { key: "totalShares", label: "Total Shares", color: "#8b5cf6" },
  { key: "engagementRate", label: "Engagement Rate", color: "#06b6d4" },
];

const timePeriods = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
  { key: "365d", label: "Last year", days: 365 },
  { key: "all", label: "All time", days: null },
];

const viewModeOptions = [
  { value: "line", label: "Line Chart" },
  { value: "area", label: "Area Chart" },
  { value: "bar", label: "Bar Chart" },
];

export default function TimeAnalysis({ accounts, selectedAccount, selectedPlatform }) {
  const [selectedMetrics, setSelectedMetrics] = useState(["followers", "totalViews"]);
  const [timePeriod, setTimePeriod] = useState("30d");
  const [viewMode, setViewMode] = useState("line"); // line, area, bar

  const filteredAccounts = useMemo(() => {
    let filtered = accounts;
    
    if (selectedPlatform !== "all") {
      filtered = filtered.filter(account => account.platform === selectedPlatform);
    }
    
    if (selectedAccount !== "all") {
      filtered = filtered.filter(account => account._id === selectedAccount);
    }
    
    return filtered;
  }, [accounts, selectedAccount, selectedPlatform]);

  const timeSeriesData = useMemo(() => {
    const cutoffDays = timePeriods.find(p => p.key === timePeriod)?.days;
    const cutoffDate = cutoffDays ? new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000) : null;
    
    const dateMap = new Map();
    
    filteredAccounts.forEach(account => {
      if (!account.history) return;
      
      account.history.forEach(snapshot => {
        const snapshotDate = new Date(snapshot.date);
        if (cutoffDate && snapshotDate < cutoffDate) return;
        
        const dateKey = snapshotDate.toISOString().split("T")[0];
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, { date: dateKey });
        }
        
        const entry = dateMap.get(dateKey);
        timeAnalysisMetrics.forEach(metric => {
          if (!entry[metric.key]) entry[metric.key] = 0;
          entry[metric.key] += snapshot[metric.key] || 0;
        });
      });
    });
    
    return Array.from(dateMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(entry => {
        // Calculate averages for engagement rate
        if (entry.engagementRate && filteredAccounts.length > 0) {
          entry.engagementRate = entry.engagementRate / filteredAccounts.length;
        }
        return entry;
      });
  }, [filteredAccounts, timePeriod]);

  const growthData = useMemo(() => {
    if (timeSeriesData.length < 2) return [];
    
    const firstEntry = timeSeriesData[0];
    const lastEntry = timeSeriesData[timeSeriesData.length - 1];
    
    return timeAnalysisMetrics.map(metric => {
      const firstValue = firstEntry[metric.key] || 0;
      const lastValue = lastEntry[metric.key] || 0;
      const growth = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
      
      return {
        metric: metric.label,
        firstValue,
        lastValue,
        growth,
        color: metric.color,
      };
    });
  }, [timeSeriesData]);

  const ChartComponent = viewMode === "area" ? AreaChart : viewMode === "bar" ? BarChart : LineChart;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Time-Based Analysis</h3>
          <p className="text-xs text-slate-400">
            Track performance trends and growth over time
          </p>
        </div>
        
        <div className="flex gap-2">
          <AppDropdown
            value={timePeriod}
            options={timePeriods}
            optionLabel="label"
            optionValue="key"
            onChange={setTimePeriod}
            className="min-w-[160px]"
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

      {/* Metric Selection */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-slate-300">Select Metrics to Display</h4>
        <div className="flex flex-wrap gap-2">
          {timeAnalysisMetrics.map(metric => (
            <label key={metric.key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedMetrics.includes(metric.key)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedMetrics([...selectedMetrics, metric.key]);
                  } else {
                    setSelectedMetrics(selectedMetrics.filter(m => m !== metric.key));
                  }
                }}
                className="rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
              />
              <span className="text-sm text-slate-300">{metric.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Time Series Chart */}
      {timeSeriesData.length > 0 && selectedMetrics.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-300">Performance Trends</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ChartComponent data={timeSeriesData}>
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
                  tickFormatter={(value) => formatNumber(value)}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: "#0f172a", 
                    border: "1px solid #1f2937",
                    borderRadius: "8px"
                  }}
                  labelStyle={{ color: "#fff" }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value, name) => [formatNumber(value), name]}
                />
                <Legend wrapperStyle={{ color: "#94a3b8" }} />
                
                {selectedMetrics.map(metricKey => {
                  const metric = timeAnalysisMetrics.find(m => m.key === metricKey);
                  if (!metric) return null;
                  
                  if (viewMode === "line") {
                    return (
                      <Line
                        key={metricKey}
                        type="monotone"
                        dataKey={metricKey}
                        stroke={metric.color}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name={metric.label}
                      />
                    );
                  } else if (viewMode === "area") {
                    return (
                      <Area
                        key={metricKey}
                        type="monotone"
                        dataKey={metricKey}
                        stroke={metric.color}
                        fill={metric.color}
                        fillOpacity={0.3}
                        name={metric.label}
                      />
                    );
                  } else {
                    return (
                      <Bar
                        key={metricKey}
                        dataKey={metricKey}
                        fill={metric.color}
                        name={metric.label}
                        radius={[2, 2, 0, 0]}
                      />
                    );
                  }
                })}
              </ChartComponent>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Growth Analysis */}
      {growthData.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-300">Growth Analysis</h4>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {growthData.map((item, index) => (
              <div key={item.metric} className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium text-slate-300">{item.metric}</h5>
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Start: {formatNumber(item.firstValue)}</span>
                    <span>End: {formatNumber(item.lastValue)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-white">
                      {formatNumber(item.lastValue)}
                    </span>
                    <span className={`text-xs font-medium ${
                      item.growth > 0 ? 'text-green-400' : 
                      item.growth < 0 ? 'text-red-400' : 'text-slate-400'
                    }`}>
                      {item.growth > 0 ? '+' : ''}{item.growth.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {timeSeriesData.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-300">Period Summary</h4>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {timeAnalysisMetrics.slice(0, 4).map(metric => {
              const values = timeSeriesData.map(d => d[metric.key] || 0);
              const max = Math.max(...values);
              const min = Math.min(...values);
              const avg = values.reduce((a, b) => a + b, 0) / values.length;
              
              return (
                <div key={metric.key} className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-medium text-slate-300">{metric.label}</h5>
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: metric.color }}
                    />
                  </div>
                  <div className="space-y-1 text-xs text-slate-400">
                    <div>Max: {formatNumber(max)}</div>
                    <div>Min: {formatNumber(min)}</div>
                    <div>Avg: {formatNumber(avg)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {timeSeriesData.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-slate-400">
            No historical data available for the selected period and filters.
          </p>
        </div>
      )}
    </div>
  );
}
