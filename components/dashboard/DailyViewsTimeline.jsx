"use client";

import { useMemo } from "react";
import buildDailyPerformance from "@/lib/utils/dailyPerformance";
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
  return numeric.toLocaleString();
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

function expandDates(seriesList = []) {
  if (!seriesList.length) {
    return [];
  }

  let minDate = null;
  let maxDate = null;

  seriesList.forEach((series) => {
    series.forEach((point) => {
      const parsed = new Date(point.date);
      if (Number.isNaN(parsed.getTime())) {
        return;
      }
      if (!minDate || parsed < minDate) {
        minDate = parsed;
      }
      if (!maxDate || parsed > maxDate) {
        maxDate = parsed;
      }
    });
  });

  if (!minDate || !maxDate) {
    return [];
  }

  const cursor = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), minDate.getUTCDate()));
  const end = new Date(Date.UTC(maxDate.getUTCFullYear(), maxDate.getUTCMonth(), maxDate.getUTCDate()));
  const days = [];

  while (cursor <= end) {
    days.push(cursor.toISOString().split("T")[0]);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

export default function DailyViewsTimeline({
  accounts = [],
  media = [],
  selectedAccount = "all",
  selectedPlatform = "all",
  selectedAccounts = [],
}) {
  const effectiveAccountIds = useMemo(() => {
    if (selectedAccounts?.length) {
      return selectedAccounts
        .map((accountId) => accounts.find((account) => account._id === accountId))
        .filter(Boolean)
        .map((account) => account._id);
    }

    let filtered = accounts;

    if (selectedPlatform !== "all") {
      filtered = filtered.filter((account) => account.platform === selectedPlatform);
    }

    if (selectedAccount !== "all") {
      const match = filtered.find((account) => account._id === selectedAccount);
      return match ? [match._id] : [];
    }

    return filtered.map((account) => account._id);
  }, [accounts, selectedAccount, selectedPlatform, selectedAccounts]);

  const selectedEntries = useMemo(() => {
    return effectiveAccountIds
      .map((accountId, index) => {
        const account = accounts.find((item) => item._id === accountId);
        if (!account) {
          return null;
        }

        const accountMedia = media.filter((item) => item.account === accountId);
        if (!accountMedia.length) {
          return null;
        }

        const performance = buildDailyPerformance(accountMedia);
        if (!performance.trendSeries?.length) {
          return null;
        }

        const label =
          account.displayName || account.username || account.accountId || "Account";

        return {
          id: accountId,
          label,
          platform: account.platform,
          color: getPlatformColor(account.platform, index),
          trend: performance.trendSeries.map((entry) => ({
            date: entry.date,
            views: entry.views,
          })),
        };
      })
      .filter(Boolean);
  }, [effectiveAccountIds, accounts, media]);

  const chartData = useMemo(() => {
    if (!selectedEntries.length) {
      return [];
    }

    const allSeries = selectedEntries.map((entry) => entry.trend);
    const days = expandDates(allSeries);
    if (!days.length) {
      return [];
    }

    const lookups = selectedEntries.map((entry) => {
      const map = new Map();
      entry.trend.forEach((point) => {
        map.set(point.date, point.views);
      });
      return { label: entry.label, map };
    });

    return days.map((day) => {
      const row = { date: day };

      lookups.forEach(({ label, map }) => {
        row[label] = map.get(day) ?? 0;
      });

      return row;
    });
  }, [selectedEntries]);

  const hasSelection = effectiveAccountIds.length > 0;
  const hasData = chartData.length > 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-white">Views vs Time</h3>
        <p className="text-xs text-slate-400">
          Totals calculated per day using the latest media refresh. Pick accounts via the primary selector or the comparison toggles above.
        </p>
      </div>

      {!hasSelection ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400">
          No accounts match the current filters. Adjust the Account selector above or toggle comparison accounts.
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
                formatter={(value, name) => [
                  value === null || value === undefined ? "—" : `${formatNumber(value)} views`,
                  name,
                ]}
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
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
          No daily view data found for the selected accounts.
        </div>
      )}
    </div>
  );
}
