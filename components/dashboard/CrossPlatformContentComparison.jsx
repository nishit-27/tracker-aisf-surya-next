"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import AppDropdown from "../ui/AppDropdown";

const platformColors = {
  instagram: "#ec4899",
  tiktok: "#3b82f6",
  youtube: "#ef4444",
  facebook: "#1877F2",
  twitter: "#1DA1F2",
  linkedin: "#0077B5",
};

function toDateKey(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().split("T")[0];
}

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

function formatPercent(value) {
  if (value === undefined || value === null) {
    return "0%";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "0%";
  }

  return `${numeric.toFixed(1)}%`;
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

function buildDefaultAccountSelection(accounts = []) {
  const seenPlatforms = new Set();
  const selection = [];

  for (const account of accounts) {
    if (!account?._id) {
      continue;
    }

    const platform = account.platform ?? "";
    if (!seenPlatforms.has(platform)) {
      selection.push(account._id);
      seenPlatforms.add(platform);
    }

    if (selection.length >= 3) {
      break;
    }
  }

  return selection;
}

function buildVideoLabel(account, video) {
  const name = account?.displayName || account?.username || account?.accountId || "Account";
  const platform = account?.platform || "Platform";
  const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
  return `${name} (${platformLabel})`;
}

export default function CrossPlatformContentComparison({ accounts = [], media = [] }) {
  const accountMediaMap = useMemo(() => {
    const map = new Map();

    media.forEach((item) => {
      if (!item?.account) {
        return;
      }

      if (!map.has(item.account)) {
        map.set(item.account, []);
      }

      map.get(item.account).push(item);
    });

    map.forEach((items) => {
      items.sort((a, b) => {
        const aDate = new Date(a.publishedAt || a.createdAt || 0).getTime();
        const bDate = new Date(b.publishedAt || b.createdAt || 0).getTime();
        return bDate - aDate;
      });
    });

    return map;
  }, [media]);

  const accountedDefaults = useMemo(
    () => buildDefaultAccountSelection(accounts),
    [accounts]
  );

  const [selectedAccountIds, setSelectedAccountIds] = useState(accountedDefaults);
  const [selectedMediaMap, setSelectedMediaMap] = useState({});

  useEffect(() => {
    if (!selectedAccountIds.length && accountedDefaults.length) {
      setSelectedAccountIds(accountedDefaults);
    }
  }, [accountedDefaults, selectedAccountIds.length]);

  useEffect(() => {
    setSelectedMediaMap((previous) => {
      const next = {};

      selectedAccountIds.forEach((accountId) => {
        const items = accountMediaMap.get(accountId) || [];
        if (!items.length) {
          return;
        }

        const current = previous[accountId];
        if (current && items.some((item) => item._id === current)) {
          next[accountId] = current;
        } else {
          next[accountId] = items[0]._id;
        }
      });

      return next;
    });
  }, [selectedAccountIds, accountMediaMap]);

  const selectedEntries = useMemo(() => {
    return selectedAccountIds
      .map((accountId) => {
        const account = accounts.find((acc) => acc._id === accountId);
        if (!account) {
          return null;
        }

        const videos = accountMediaMap.get(accountId) || [];
        if (!videos.length) {
          return {
            account,
            label: buildVideoLabel(account, null),
            media: null,
            platform: account.platform,
            color: platformColors[account.platform] || "#38bdf8",
          };
        }

        const mediaId = selectedMediaMap[accountId] || videos[0]._id;
        const mediaItem = videos.find((item) => item._id === mediaId) || videos[0];

        return {
          account,
          label: buildVideoLabel(account, mediaItem),
          media: mediaItem,
          platform: account.platform,
          color: platformColors[account.platform] || "#38bdf8",
        };
      })
      .filter(Boolean);
  }, [selectedAccountIds, accounts, accountMediaMap, selectedMediaMap]);

  const chartData = useMemo(() => {
    if (!selectedEntries.length) {
      return [];
    }

    const dateSet = new Set();
    const seriesMap = new Map();

    selectedEntries.forEach((entry) => {
      const mediaItem = entry.media;
      const label = entry.label;
      const valuesByDate = new Map();

      if (mediaItem?.history?.length) {
        mediaItem.history.forEach((snapshot) => {
          const dateKey = toDateKey(snapshot?.date || mediaItem.publishedAt || mediaItem.updatedAt);
          if (!dateKey) {
            return;
          }

          const views = Number(snapshot?.views ?? 0);
          valuesByDate.set(dateKey, views);
          dateSet.add(dateKey);
        });
      } else {
        const fallbackDate = toDateKey(mediaItem?.publishedAt || mediaItem?.updatedAt || mediaItem?.createdAt);
        if (fallbackDate) {
          const views = Number(mediaItem?.metrics?.views ?? 0);
          valuesByDate.set(fallbackDate, views);
          dateSet.add(fallbackDate);
        }
      }

      seriesMap.set(label, valuesByDate);
    });

    const sortedDates = Array.from(dateSet).sort((a, b) => new Date(a) - new Date(b));
    const lastValues = new Map();

    return sortedDates.map((date) => {
      const row = { date };

      selectedEntries.forEach((entry) => {
        const label = entry.label;
        const series = seriesMap.get(label) || new Map();
        const value = series.get(date);

        if (value !== undefined) {
          row[label] = value;
          lastValues.set(label, value);
        } else if (lastValues.has(label)) {
          row[label] = lastValues.get(label);
        } else {
          row[label] = null;
        }
      });

      return row;
    });
  }, [selectedEntries]);

  const performanceSummary = useMemo(() => {
    return selectedEntries.map((entry) => {
      const metrics = entry.media?.metrics ?? {};
      return {
        key: entry.label,
        platform: entry.platform,
        platformColor: entry.color,
        title: entry.media?.title || entry.media?.externalId || "Untitled",
        url: entry.media?.url || null,
        publishedAt: entry.media?.publishedAt || entry.media?.createdAt || null,
        stats: {
          views: metrics.views ?? 0,
          likes: metrics.likes ?? 0,
          comments: metrics.comments ?? 0,
          shares: metrics.shares ?? 0,
          engagementRate: metrics.engagementRate ?? 0,
        },
      };
    });
  }, [selectedEntries]);

  const bestPerformer = useMemo(() => {
    if (!performanceSummary.length) {
      return null;
    }

    return [...performanceSummary].sort((a, b) => b.stats.views - a.stats.views)[0];
  }, [performanceSummary]);

  const handleAccountToggle = (accountId) => {
    setSelectedAccountIds((current) => {
      const isSelected = current.includes(accountId);

      if (isSelected) {
        return current.filter((id) => id !== accountId);
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, accountId];
    });
  };

  const handleVideoChange = (accountId, mediaId) => {
    setSelectedMediaMap((current) => ({
      ...current,
      [accountId]: mediaId,
    }));
  };

  const accountSelectionMessage = useMemo(() => {
    if (!selectedAccountIds.length) {
      return "Select up to three accounts to compare the same creative across platforms.";
    }

    if (selectedAccountIds.length < 3) {
      return "Add another platform account to complete the side-by-side comparison (max 3).";
    }

    return "You can swap accounts below to compare different platform variations of the same content.";
  }, [selectedAccountIds.length]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-white">Cross-Platform Content Comparison</h3>
        <p className="text-xs text-slate-400">
          Analyse how the same creative performed on each platform. Choose up to three accounts and
          pick the matching video to see relative reach and watch the performance over time on a single chart.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-slate-200">1. Pick accounts (max 3)</h4>
            <p className="text-xs text-slate-400">{accountSelectionMessage}</p>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {accounts.map((account) => {
              const isSelected = selectedAccountIds.includes(account._id);
              const isDisabled = !isSelected && selectedAccountIds.length >= 3;

              return (
                <label
                  key={account._id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                    isSelected
                      ? "border-sky-500 bg-sky-500/20"
                      : "border-slate-800 bg-slate-900/70 hover:bg-slate-800/50"
                  } ${isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={() => handleAccountToggle(account._id)}
                    className="rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {account.displayName || account.username || account.accountId}
                    </div>
                    <div className="text-xs text-slate-400 capitalize">
                      {account.platform}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400">
            Tip: choose the matching Instagram, TikTok, and YouTube accounts to compare the same creative across
            platforms. You can switch videos per account below to analyse different posts.
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-4">
            {selectedEntries.map((entry) => {
              const videos = accountMediaMap.get(entry.account._id) || [];
              const hasVideos = videos.length > 0;
              const videoOptions = hasVideos
                ? videos.map((video) => ({
                    value: video._id,
                    label: `${video.title || video.externalId || "Untitled"}${
                      video.publishedAt ? ` · ${formatDate(video.publishedAt)}` : ""
                    }`,
                  }))
                : [];

              return (
                <div
                  key={entry.account._id}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {entry.account.displayName || entry.account.username || entry.account.accountId}
                      </div>
                      <div className="text-xs text-slate-400 capitalize">
                        {entry.platform}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      {hasVideos
                        ? `${videos.length.toLocaleString()} video${videos.length === 1 ? "" : "s"} available`
                        : "No media found for this account"}
                    </div>
                  </div>

                  {hasVideos ? (
                    <div className="mt-3">
                      <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                        Select video
                      </label>
                      <AppDropdown
                        value={selectedMediaMap[entry.account._id] || videos[0]._id}
                        options={videoOptions}
                        onChange={(nextValue) => handleVideoChange(entry.account._id, nextValue)}
                        className="mt-1 w-full"
                        panelClassName="mt-2 min-w-[260px]"
                        placeholder=""
                      />
                    </div>
                  ) : (
                    <div className="mt-3 rounded-md border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-400">
                      Add media for this account to include it in the comparison.
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-slate-200">2. Watch performance over time</h4>
              <p className="text-xs text-slate-400">
                Views are plotted on the same timeline so you can spot the platform that picked up momentum first.
              </p>
            </div>

            {chartData.length && selectedEntries.some((entry) => entry.media) ? (
              <div className="h-80 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="date"
                      stroke="#94a3b8"
                      tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    />
                    <YAxis stroke="#94a3b8" tickFormatter={(value) => formatNumber(value)} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #1f2937",
                        borderRadius: "8px",
                      }}
                      formatter={(value, name) => [formatNumber(value), name]}
                      labelFormatter={(value) => formatDate(value)}
                    />
                    <Legend />
                    {selectedEntries.map((entry) => (
                      <Line
                        key={entry.label}
                        type="monotone"
                        dataKey={entry.label}
                        stroke={entry.color}
                        strokeWidth={2}
                        dot={{ r: 3, fill: entry.color }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
                Select at least one video with historical metrics to draw the timeline.
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-slate-200">3. Compare final results</h4>
              <p className="text-xs text-slate-400">
                Views, engagement, and reaction mix for the selected creative on each platform.
              </p>
            </div>

            {performanceSummary.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-sm">
                  <thead className="bg-slate-900/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Platform
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Video
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Views
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Likes
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Comments
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Shares
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Engagement
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {performanceSummary.map((entry) => (
                      <tr key={entry.key} className="hover:bg-slate-900/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: entry.platformColor }}
                            />
                            <span className="text-sm font-medium text-white capitalize">
                              {entry.platform}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-200">
                          <div className="flex flex-col">
                            {entry.url ? (
                              <a
                                href={entry.url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-white transition-colors hover:text-sky-300 truncate max-w-[240px]"
                                title={entry.title}
                              >
                                {entry.title}
                              </a>
                            ) : (
                              <span className="font-medium text-white truncate max-w-[240px]">
                                {entry.title}
                              </span>
                            )}
                            <span className="text-xs text-slate-400">{formatDate(entry.publishedAt)}</span>
                            {entry.url ? (
                              <a
                                href={entry.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-sky-400 hover:text-sky-300"
                              >
                                View post
                              </a>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-white">
                          {formatNumber(entry.stats.views)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-200">
                          {formatNumber(entry.stats.likes)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-200">
                          {formatNumber(entry.stats.comments)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-200">
                          {formatNumber(entry.stats.shares)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-200">
                          {formatPercent(entry.stats.engagementRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
                Select at least one account with media to view the comparison summary.
              </div>
            )}
          </div>

          {bestPerformer ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Insight</div>
              <p className="mt-2">
                {bestPerformer.platform.charAt(0).toUpperCase() + bestPerformer.platform.slice(1)} captured the highest
                view volume for the selected creative with {formatNumber(bestPerformer.stats.views)} views and an
                engagement rate of {formatPercent(bestPerformer.stats.engagementRate)}.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
