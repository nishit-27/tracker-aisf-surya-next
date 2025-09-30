"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const metricLabels = {
  followers: "Followers",
  views: "Views",
  likes: "Likes",
  comments: "Comments",
  engagementRate: "Engagement Rate (%)",
};

function formatValue(value, metric) {
  if (metric === "engagementRate") {
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

export default function PlatformComparisonChart({ data, metric }) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        No platform data available yet.
      </div>
    );
  }

  const label = metricLabels[metric] ?? metric;

  const hasOnlyZeroValues = data.every((entry) => (entry[metric] ?? 0) === 0);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barSize={32}>
        <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
        <XAxis dataKey="platform" stroke="#94a3b8" />
        <YAxis
          stroke="#94a3b8"
          tickFormatter={(value) => formatValue(value, metric)}
          domain={hasOnlyZeroValues ? [0, 1] : ["auto", "auto"]}
        />
        <Tooltip
          cursor={{ fill: "#0f172a", opacity: 0.2 }}
          labelStyle={{ color: "#fff" }}
          contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1f2937" }}
          formatter={(value) => formatValue(value, metric)}
          labelFormatter={(platform) => platform.toUpperCase()}
        />
        <Bar dataKey={metric} fill="#38bdf8" radius={[10, 10, 10, 10]} name={label} />
      </BarChart>
    </ResponsiveContainer>
  );
}
