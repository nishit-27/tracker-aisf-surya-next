"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

const METRIC_COLORS = {
  none: "#64748b",
  views: "#38bdf8",
  likes: "#f472b6",
  comments: "#facc15",
  shares: "#a855f7",
  followers: "#10b981",
};

const METRIC_LABELS = {
  none: "None",
  views: "Views",
  likes: "Likes",
  comments: "Comments",
  shares: "Shares",
  followers: "Followers",
};

function lightenColor(hex, amount = 0.25) {
  if (!hex || typeof hex !== "string") {
    return hex;
  }

  const normalised = hex.replace("#", "");
  if (normalised.length !== 6) {
    return hex;
  }

  const num = Number.parseInt(normalised, 16);
  if (Number.isNaN(num)) {
    return hex;
  }

  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;

  const mix = (channel) => {
    const blended = channel + (255 - channel) * amount;
    return Math.min(255, Math.max(0, Math.round(blended)));
  };

  const nextR = mix(r).toString(16).padStart(2, "0");
  const nextG = mix(g).toString(16).padStart(2, "0");
  const nextB = mix(b).toString(16).padStart(2, "0");

  return `#${nextR}${nextG}${nextB}`;
}

export default function OverviewMetricChart({
  data,
  primaryMetric = "views",
  secondaryMetric = null,
}) {
  if (!data.length) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">
        No metric data available for the selected period.
      </div>
    );
  }

  // Handle "none" case - show message instead of chart
  if (primaryMetric === "none" && (secondaryMetric === "none" || !secondaryMetric)) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">
        No metrics selected. Choose primary and secondary metrics to display the chart.
      </div>
    );
  }

  const primaryColor = METRIC_COLORS[primaryMetric] ?? "#a855f7";
  const hasSecondaryMetric = Boolean(secondaryMetric) && secondaryMetric !== "none";
  const secondaryColorBase = hasSecondaryMetric
    ? METRIC_COLORS[secondaryMetric] ?? "#38bdf8"
    : null;
  const secondaryColor = hasSecondaryMetric
    ? secondaryMetric === primaryMetric
      ? lightenColor(primaryColor, 0.35)
      : secondaryColorBase
    : null;

  const primaryLabel = METRIC_LABELS[primaryMetric] || primaryMetric;
  const secondaryLabel = hasSecondaryMetric
    ? METRIC_LABELS[secondaryMetric] || secondaryMetric
    : null;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} barSize={18}>
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
          yAxisId="left"
          stroke={primaryColor}
          tickFormatter={formatValue}
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        {hasSecondaryMetric ? (
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke={secondaryColor}
            tickFormatter={formatValue}
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
        ) : null}
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
          formatter={(value, _name, chartItem) => {
            if (!chartItem || chartItem?.name === undefined) {
              return [formatValue(value)];
            }
            return [formatValue(value), chartItem.name];
          }}
          labelFormatter={(value) => formatDateLabel(value)}
        />
        <Legend
          wrapperStyle={{ color: "#94a3b8" }}
          iconType="circle"
          formatter={(value) => value}
        />
        {primaryMetric !== "none" && (
          <Bar
            yAxisId="left"
            dataKey={primaryMetric}
            radius={[6, 6, 12, 12]}
            fill={primaryColor}
            name={primaryLabel}
            fillOpacity={0.85}
          />
        )}
        {hasSecondaryMetric ? (
          <Line
            yAxisId="right"
            type="monotone"
            dataKey={secondaryMetric}
            stroke={secondaryColor}
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 0, fill: secondaryColor }}
            activeDot={{ r: 5, stroke: "#0b0c16", strokeWidth: 2 }}
            strokeDasharray={secondaryMetric === primaryMetric ? "6 3" : undefined}
            name={secondaryLabel}
          />
        ) : null}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
