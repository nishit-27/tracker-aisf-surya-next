"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function formatValue(value) {
  if (value === undefined || value === null) {
    return "0";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "0";
  }

  if (Math.abs(numeric) >= 1_000_000) {
    return `${(numeric / 1_000_000).toFixed(1)}M`;
  }

  if (Math.abs(numeric) >= 1_000) {
    return `${(numeric / 1_000).toFixed(1)}K`;
  }

  return numeric.toLocaleString();
}

function formatDateLabel(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function OverviewMetricChart({ data, metric = "views", color = "#a855f7" }) {
  if (!data.length) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">
        No metric data available for the selected period.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barSize={18}>
        <CartesianGrid stroke="#131523" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="#64748b"
          tickFormatter={formatDateLabel}
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          stroke="#64748b"
          tickFormatter={formatValue}
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "#1f2335", opacity: 0.35 }}
          wrapperStyle={{ outline: "none" }}
          contentStyle={{
            backgroundColor: "#0b0c16",
            border: "1px solid #1f2335",
            borderRadius: "12px",
            color: "#e2e8f0",
          }}
          labelStyle={{ color: "#94a3b8" }}
          formatter={(value) => formatValue(value)}
          labelFormatter={(value) => formatDateLabel(value)}
        />
        <Bar dataKey={metric} radius={[6, 6, 12, 12]} fill={color} />
      </BarChart>
    </ResponsiveContainer>
  );
}
