"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatMetric(value, isPercentage = false) {
  if (isPercentage) {
    return `${Number(value ?? 0).toFixed(2)}%`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return Number(value ?? 0).toLocaleString();
}

export default function EngagementTrendChart({ data }) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        No historical engagement data available yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data}>
        <defs>
          <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
        <XAxis dataKey="date" stroke="#94a3b8" hide={data.length > 16} />
        <YAxis
          yAxisId="left"
          stroke="#94a3b8"
          tickFormatter={(value) => formatMetric(value, true)}
          domain={[0, "auto"]}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#94a3b8"
          tickFormatter={(value) => formatMetric(value)}
          domain={[0, "auto"]}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1f2937" }}
          labelStyle={{ color: "#fff" }}
          formatter={(value, label) =>
            label === "engagementRate"
              ? [formatMetric(value, true), "Engagement Rate"]
              : [formatMetric(value), label.charAt(0).toUpperCase() + label.slice(1)]
          }
        />
        <Legend wrapperStyle={{ color: "#94a3b8" }} />
        <Area
          type="monotone"
          dataKey="engagementRate"
          stroke="#38bdf8"
          fillOpacity={1}
          fill="url(#colorEngagement)"
          yAxisId="left"
          name="Engagement Rate"
        />
        <Line
          type="monotone"
          dataKey="followers"
          stroke="#a855f7"
          strokeWidth={2}
          dot={false}
          yAxisId="right"
          name="Followers"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
