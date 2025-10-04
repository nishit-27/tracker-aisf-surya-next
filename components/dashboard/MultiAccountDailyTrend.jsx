"use client";

import { useMemo } from "react";
import { buildRollingMedianSeries } from "@/lib/utils/dailyPerformance";
import { getPlatformColor } from "@/lib/utils/platformColors";
import {
  LineChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

const DAY_MS = 24 * 60 * 60 * 1000;

function formatNumber(value) {
  if (value === undefined || value === null) {
    return "—";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "—";
  }

  if (numeric >= 1_000_000) {
    return `${(numeric / 1_000_000).toFixed(1)}M`;
  }

  if (numeric >= 1_000) {
    return `${(numeric / 1_000).toFixed(1)}K`;
  }

  if (Number.isInteger(numeric)) {
    return numeric.toLocaleString();
  }

  return numeric.toFixed(1);
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MultiAccountDailyTrend({
  accounts = [],
  media = [],
  selectedAccounts = [],
  rangeDays = null,
}) {
  const selectedEntries = useMemo(() => {
    if (!selectedAccounts?.length) {
      return [];
    }

    return selectedAccounts
      .map((accountId, index) => {
        const account = accounts.find((item) => item._id === accountId);
        if (!account) {
          return null;
        }

        const accountMedia = media
          .filter((item) => item.account === accountId && item?.publishedAt)
          .slice()
          .sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));

        if (!accountMedia.length) {
          return null;
        }

        const referenceDates = Array.from(
          new Set(accountMedia.map((item) => item.publishedAt).filter(Boolean))
        );

        const medianSeries = buildRollingMedianSeries(accountMedia, referenceDates);

        if (!medianSeries.length) {
          return null;
        }

        const label =
          account.displayName || account.username || account.accountId || "Account";

        return {
          id: accountId,
          label,
          platform: account.platform,
          color: getPlatformColor(account.platform, index),
          series: medianSeries,
        };
      })
      .filter(Boolean);
  }, [accounts, media, selectedAccounts]);

  const chartData = useMemo(() => {
    if (!selectedEntries.length) {
      return [];
    }

    const dateSet = new Set();
    const seriesLookups = selectedEntries.map((entry) => {
      const map = new Map();
      entry.series.forEach((point) => {
        if (point?.date) {
          map.set(point.date, point);
          dateSet.add(point.date);
        }
      });
      return { label: entry.label, map };
    });

    const sortedDates = Array.from(dateSet).sort((a, b) => new Date(a) - new Date(b));

    const threshold =
      typeof rangeDays === "number" && Number.isFinite(rangeDays)
        ? Date.now() - rangeDays * DAY_MS
        : null;

    const filteredDates =
      threshold !== null
        ? sortedDates.filter((dateKey) => {
            const parsed = new Date(dateKey);
            if (Number.isNaN(parsed.getTime())) {
              return false;
            }
            return parsed.getTime() >= threshold;
          })
        : sortedDates;

    return filteredDates.map((dateKey) => {
      const row = { date: dateKey };

      seriesLookups.forEach(({ label, map }) => {
        const point = map.get(dateKey);
        row[label] = point ? point.medianViews : null;
        row[`${label}__samples`] = point ? point.sampleSize : 0;
      });

      return row;
    });
  }, [selectedEntries, rangeDays]);

  const hasSelection = selectedAccounts?.length > 0;
  const hasData = chartData.length > 0 && selectedEntries.length > 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-white">Median Views Timeline</h3>
        <p className="text-xs text-slate-400">
          Rolling median of the latest 10 videos per selected account. Platform colours are fixed: YouTube red, TikTok blue, Instagram pink.
        </p>
      </div>

      {!hasSelection ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400">
          Select at least one account above to plot the rolling median views.
        </div>
      ) : hasData ? (
        <div className="h-80 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis stroke="#94a3b8" tickFormatter={formatNumber} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid #1f2937",
                  borderRadius: "8px",
                }}
                cursor={{ stroke: "#1f2937" }}
                formatter={(value, name, payload) => {
                  if (value === null || value === undefined) {
                    return ["—", `${name} median views`];
                  }
                  const samples = payload?.payload?.[`${name}__samples`] ?? 0;
                  const visibleSample = Math.min(samples, 10);
                  return [
                    `${formatNumber(value)} views`,
                    `${name} · last ${visibleSample || samples} videos`,
                  ];
                }}
                labelFormatter={(value) => formatDate(value)}
              />
              <Legend />
              {selectedEntries.map((entry) => (
                <Line
                  key={entry.id}
                  type="monotone"
                  dataKey={entry.label}
                  stroke={entry.color}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: entry.color }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
          No media with view counts found for the selected accounts.
        </div>
      )}
    </div>
  );
}
