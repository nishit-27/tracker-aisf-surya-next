"use client";

import { Fragment, useMemo, useState, useCallback } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarRange,
  Download,
  Eye,
  Gauge,
  Heart,
  MessageCircle,
  MoreHorizontal,
  PlayCircle,
  Search,
  Timer,
} from "lucide-react";
import AppDropdown from "../ui/AppDropdown";
import { PlatformImage } from "../../lib/utils/platformImages";

const rangeOptions = [
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "365d", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

const projectOptions = [
  { value: "all", label: "All projects" },
  { value: "launch", label: "Launch Campaign" },
  { value: "ugc", label: "UGC Collaboration" },
  { value: "seasonal", label: "Seasonal Push" },
];

function formatNumber(value) {
  if (value === undefined || value === null) {
    return "—";
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "—";
  }
  const abs = Math.abs(numeric);
  if (abs >= 1_000_000) {
    return `${(numeric / 1_000_000).toFixed(1)}m`;
  }
  if (abs >= 1_000) {
    return `${(numeric / 1_000).toFixed(1)}k`;
  }
  return numeric.toLocaleString();
}

function formatPercent(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return "0%";
  }
  const fixed = Number(numeric.toFixed(1));
  return `${fixed}%`;
}

function formatRelativeTime(dateInput) {
  if (!dateInput) {
    return "N/A";
  }
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) {
    return "just now";
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `about ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `about ${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `about ${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  }
  const diffYears = Math.floor(diffMonths / 12);
  return `about ${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(seconds) {
  if (!seconds || !Number.isFinite(seconds)) {
    return "—";
  }
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remaining = totalSeconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function normaliseMetadata(metadata) {
  if (!metadata) {
    return {};
  }
  if (metadata instanceof Map) {
    return Object.fromEntries(metadata.entries());
  }
  return metadata;
}

export default function VideosTable({
  media,
  accounts,
  accountOptions = [],
  selectedAccount = "all",
  onAccountChange,
  selectedPlatform = "all",
  onPlatformChange,
  selectedRange = "30d",
  onRangeChange,
  selectedProject = "all",
  onProjectChange,
  onTrackVideo,
  platformFilters = ["all"],
  searchTerm = "",
}) {
  const [sortKey, setSortKey] = useState("views");
  const [sortDirection, setSortDirection] = useState("desc");
  const [activeMenu, setActiveMenu] = useState(null);

  const accountMap = useMemo(() => {
    const map = new Map();
    (accounts || []).forEach((account) => {
      map.set(account._id, account);
    });
    return map;
  }, [accounts]);

  const processedMedia = useMemo(() => {
    const items = (media || []).map((item) => {
      const account = accountMap.get(item.account) || {};
      const metadata = normaliseMetadata(item.metadata);
      const metrics = item.metrics || {};
      const publishedAt = item.publishedAt ? new Date(item.publishedAt) : null;
      const updatedAt = item.updatedAt ? new Date(item.updatedAt) : null;
      const durationSeconds = Number(
        metadata.durationSeconds ??
          metadata.duration ??
          (metadata.durationMs ? metadata.durationMs / 1000 : null),
      );
      const hoursSincePublished = publishedAt
        ? Math.max((Date.now() - publishedAt.getTime()) / (1000 * 60 * 60), 0.25)
        : null;
      const views = metrics.views ?? 0;
      const viewRate = hoursSincePublished ? views / hoursSincePublished : null;

      return {
        raw: item,
        platform: item.platform || "unknown",
        title: item.title || "Untitled video",
        accountName:
          account.displayName || account.username || account.accountId || "Unknown account",
        accountHandle: account.username || account.accountId || "—",
        thumbnailUrl: item.thumbnailUrl || null,
        publishedAt,
        publishedAtMs: publishedAt ? publishedAt.getTime() : 0,
        updatedAt,
        updatedAtMs: updatedAt ? updatedAt.getTime() : 0,
        durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
        views,
        likes: metrics.likes ?? 0,
        comments: metrics.comments ?? 0,
        shares: metrics.shares ?? 0,
        saves: metrics.saves ?? 0,
        engagementRate: metrics.engagementRate ?? 0,
        viewRate,
      };
    });

    const rates = items
      .map((item) => item.viewRate)
      .filter((rate) => Number.isFinite(rate) && rate > 0);
    const averageRate = rates.length
      ? rates.reduce((sum, value) => sum + value, 0) / rates.length
      : null;

    return items.map((item) => ({
      ...item,
      velocity: averageRate && Number.isFinite(item.viewRate)
        ? item.viewRate / averageRate
        : null,
    }));
  }, [media, accountMap]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const rows = processedMedia
      .filter((item) => {
        if (selectedPlatform !== "all" && item.platform !== selectedPlatform) {
          return false;
        }
        if (!term) {
          return true;
        }
        return (
          item.title.toLowerCase().includes(term) ||
          item.accountName.toLowerCase().includes(term) ||
          item.accountHandle.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const direction = sortDirection === "asc" ? 1 : -1;

        const compareNumeric = (first, second) => {
          const aValue = Number.isFinite(first) ? first : -Infinity;
          const bValue = Number.isFinite(second) ? second : -Infinity;
          return (aValue - bValue) * direction;
        };

        switch (sortKey) {
          case "views":
            return compareNumeric(a.views, b.views);
          case "likes":
            return compareNumeric(a.likes, b.likes);
          case "comments":
            return compareNumeric(a.comments, b.comments);
          case "shares":
            return compareNumeric(a.shares, b.shares);
          case "saves":
            return compareNumeric(a.saves, b.saves);
          case "engagementRate":
            return compareNumeric(a.engagementRate, b.engagementRate);
          case "velocity":
            return compareNumeric(a.velocity, b.velocity);
          case "publishedAt":
            return compareNumeric(a.publishedAtMs, b.publishedAtMs);
          case "updatedAt":
            return compareNumeric(a.updatedAtMs, b.updatedAtMs);
          case "duration":
            return compareNumeric(a.durationSeconds, b.durationSeconds);
          case "platform": {
            const aPlatform = a.platform?.toString().toLowerCase() ?? "";
            const bPlatform = b.platform?.toString().toLowerCase() ?? "";
            return aPlatform.localeCompare(bPlatform) * direction;
          }
          default:
            return 0;
        }
      });

    return rows;
  }, [processedMedia, selectedPlatform, searchTerm, sortKey, sortDirection]);

  const toggleSort = useCallback((key) => {
    setSortKey((currentKey) => {
      if (currentKey === key) {
        setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
        return currentKey;
      }
      setSortDirection("desc");
      return key;
    });
  }, []);

  const columns = [
    { id: "video", label: "Video", sortable: false, className: "min-w-[260px]" },
    { id: "account", label: "Account", sortable: false, className: "min-w-[200px]" },
    { id: "platform", label: "Platform", sortable: true, sortKey: "platform", className: "min-w-[120px]" },
    { id: "publishedAt", label: "Posted", sortable: true, sortKey: "publishedAt", className: "min-w-[120px]" },
    {
      id: "duration",
      label: "Duration",
      sortable: true,
      sortKey: "duration",
      align: "text-right",
      icon: Timer,
      srLabel: "Duration",
      className: "min-w-[90px] text-right hidden xl:table-cell",
    },
    {
      id: "views",
      label: "Views",
      sortable: true,
      sortKey: "views",
      align: "text-right",
      icon: Eye,
      srLabel: "Views",
      className: "min-w-[100px] text-right",
    },
    {
      id: "likes",
      label: "Likes",
      sortable: true,
      sortKey: "likes",
      align: "text-right",
      icon: Heart,
      srLabel: "Likes",
      className: "min-w-[90px] text-right",
    },
    {
      id: "comments",
      label: "Comments",
      sortable: true,
      sortKey: "comments",
      align: "text-right",
      icon: MessageCircle,
      srLabel: "Comments",
      className: "min-w-[100px] text-right",
    },
    {
      id: "engagementRate",
      label: "Engagement",
      sortable: true,
      sortKey: "engagementRate",
      align: "text-right",
      icon: Activity,
      srLabel: "Engagement rate",
      className: "min-w-[110px] text-right hidden lg:table-cell",
    },
    {
      id: "velocity",
      label: "Velocity",
      sortable: true,
      sortKey: "velocity",
      align: "text-right",
      icon: Gauge,
      srLabel: "Velocity",
      className: "min-w-[110px] text-right hidden 2xl:table-cell",
    },
    {
      id: "updatedAt",
      label: "Last refresh",
      sortable: true,
      sortKey: "updatedAt",
      align: "text-right",
      className: "min-w-[130px] text-right",
    },
    { id: "actions", label: "", sortable: false, className: "w-12 text-right" },
  ];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#0b0c19]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/5">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.28em] text-slate-500">
                {columns.map((column) => {
                  const sortKeyValue = column.sortKey ?? column.id;
                  const isActiveSort = column.sortable && sortKey === sortKeyValue;
                  const headerContent = column.icon ? (
                    <span className="inline-flex items-center gap-2">
                      <column.icon className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="sr-only">{column.srLabel || column.label}</span>
                    </span>
                  ) : (
                    column.label
                  );

                  return (
                    <th
                      key={column.id}
                      scope="col"
                      className={`whitespace-nowrap px-4 py-4 font-semibold ${column.className || ""} ${column.align || "text-left"}`.trim()}
                    >
                      {column.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(sortKeyValue)}
                          className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 transition hover:text-slate-200 ${
                            column.align === "text-right" ? "justify-end" : ""
                          }`}
                        >
                          {headerContent}
                          {isActiveSort ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-600" />
                          )}
                        </button>
                      ) : (
                        <span className="text-slate-400">{headerContent}</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-16 text-center text-sm text-slate-400">
                    No videos match the current filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((item, index) => {
                  const accountId = item.raw?._id || `${item.platform}-${index}`;
                  const isActiveMenu = activeMenu === accountId;

                  const velocityTone = (() => {
                    if (!Number.isFinite(item.velocity)) {
                      return "bg-white/5 text-slate-300";
                    }
                    if (item.velocity >= 1.5) {
                      return "bg-emerald-500/20 text-emerald-300";
                    }
                    if (item.velocity >= 0.8) {
                      return "bg-white/10 text-white";
                    }
                    return "bg-amber-500/20 text-amber-300";
                  })();

                  const velocityLabel = Number.isFinite(item.velocity)
                    ? `${item.velocity >= 10 ? item.velocity.toFixed(0) : item.velocity.toFixed(1)}x`
                    : "—";

                  return (
                    <Fragment key={accountId}>
                      <tr className="group transition hover:bg-white/5">
                        {columns.map((column) => {
                          const columnClassName = column.className ? ` ${column.className}` : "";
                          switch (column.id) {
                            case "video": {
                              const videoUrl = item.raw?.url;
                              const Wrapper = videoUrl ? "a" : "div";
                              const wrapperClasses = `flex min-w-0 items-start gap-3${videoUrl ? " group" : ""}`;
                              return (
                                <td key={column.id} className={`px-4 py-4 align-top${columnClassName}`}>
                                  <Wrapper
                                    className={wrapperClasses}
                                    {...(videoUrl
                                      ? {
                                          href: videoUrl,
                                          target: "_blank",
                                          rel: "noreferrer",
                                        }
                                      : {})}
                                  >
                                    <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#131527]">
                                      {item.thumbnailUrl ? (
                                        <img
                                          src={item.thumbnailUrl}
                                          alt={item.title}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                                          No preview
                                        </div>
                                      )}
                                      <span className="absolute bottom-1 left-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70">
                                        <PlatformImage platform={item.platform} className="h-3.5 w-3.5" />
                                      </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p
                                        className="mb-1 truncate text-sm font-semibold text-white transition-colors group-hover:text-sky-300"
                                        title={item.title}
                                      >
                                        {item.title.length > 70 ? `${item.title.substring(0, 70)}…` : item.title}
                                      </p>
                                      <p className="flex items-center gap-1 text-xs text-slate-500" title={item.accountName}>
                                        <PlayCircle className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                                        <span className="truncate">{item.accountName}</span>
                                      </p>
                                    </div>
                                  </Wrapper>
                                </td>
                              );
                            }
                            case "account":
                              return (
                                <td key={column.id} className={`px-4 py-4${columnClassName}`}>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-white">{item.accountName}</p>
                                    <p className="truncate text-xs text-slate-400">{item.accountHandle ? `@${item.accountHandle}` : "—"}</p>
                                  </div>
                                </td>
                              );
                            case "platform":
                              return (
                                <td key={column.id} className={`px-4 py-4${columnClassName}`}>
                                  <div className="flex items-center gap-2">
                                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/5 text-white">
                                      <PlatformImage platform={item.platform} className="h-4 w-4" />
                                    </span>
                                    <span className="text-sm font-medium capitalize text-white">{item.platform}</span>
                                  </div>
                                </td>
                              );
                            case "publishedAt":
                              return (
                                <td key={column.id} className={`px-4 py-4 text-sm text-slate-300${columnClassName}`}>
                                  {formatDateTime(item.publishedAt)}
                                </td>
                              );
                            case "duration":
                              return (
                                <td key={column.id} className={`px-4 py-4 text-right text-sm text-slate-300${columnClassName}`}>
                                  {formatDuration(item.durationSeconds)}
                                </td>
                              );
                            case "views":
                              return (
                                <td key={column.id} className={`px-4 py-4 text-right text-sm font-semibold text-white${columnClassName}`}>
                                  {formatNumber(item.views)}
                                </td>
                              );
                            case "likes":
                              return (
                                <td key={column.id} className={`px-4 py-4 text-right text-sm font-semibold text-white${columnClassName}`}>
                                  {formatNumber(item.likes)}
                                </td>
                              );
                            case "comments":
                              return (
                                <td key={column.id} className={`px-4 py-4 text-right text-sm font-semibold text-white${columnClassName}`}>
                                  {formatNumber(item.comments)}
                                </td>
                              );
                            case "engagementRate":
                              return (
                                <td key={column.id} className={`px-4 py-4 text-right text-sm font-semibold text-emerald-400${columnClassName}`}>
                                  {formatPercent(item.engagementRate)}
                                </td>
                              );
                            case "velocity":
                              return (
                                <td key={column.id} className={`px-4 py-4 text-right text-sm${columnClassName}`}>
                                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${velocityTone}`}>
                                    {velocityLabel}
                                  </span>
                                </td>
                              );
                            case "updatedAt":
                              return (
                                <td key={column.id} className={`px-4 py-4 text-right text-sm text-slate-300${columnClassName}`}>
                                  {formatRelativeTime(item.updatedAt)}
                                </td>
                              );
                            case "actions":
                              return (
                                <td key={column.id} className={`px-4 py-4 text-right${columnClassName}`}>
                                  <div className="relative inline-flex">
                                    <button
                                      type="button"
                                      onClick={() => setActiveMenu((current) => (current === accountId ? null : accountId))}
                                      className="rounded-full border border-white/10 p-2 text-slate-400 transition hover:border-white/30 hover:text-white"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                    {isActiveMenu ? (
                                      <div className="absolute right-0 top-10 z-10 w-40 rounded-2xl border border-white/10 bg-[#131527] p-1 shadow-xl">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveMenu(null);
                                            if (item.raw?.url) {
                                              window.open(item.raw.url, "_blank", "noopener,noreferrer");
                                            }
                                          }}
                                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:bg-white/5"
                                        >
                                          Open post
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveMenu(null);
                                            if (item.raw?.url) {
                                              navigator.clipboard?.writeText(item.raw.url).catch(() => {});
                                            }
                                          }}
                                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:bg-white/5"
                                        >
                                          Copy link
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                </td>
                              );
                            default:
                              return null;
                          }
                        })}
                      </tr>
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
