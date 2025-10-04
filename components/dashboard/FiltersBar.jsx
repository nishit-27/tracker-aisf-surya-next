"use client";

import { useMemo } from "react";
import AppDropdown from "../ui/AppDropdown";

const rangeOptions = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "365d", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

export default function FiltersBar({
  platforms,
  accounts,
  selectedPlatform,
  onPlatformChange,
  selectedAccount,
  onAccountChange,
  selectedRange,
  onRangeChange,
  mediaSort,
  onMediaSortChange,
  comparisonMetric,
  onComparisonMetricChange,
  comparisonOptions,
  sortOptions,
  className = "",
}) {
  const containerClassName = [
    "flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm md:flex-row md:items-center md:justify-between",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const platformOptions = useMemo(
    () =>
      platforms.map((platform) => ({
        value: platform,
        label:
          platform === "all"
            ? "All Platforms"
            : platform.charAt(0).toUpperCase() + platform.slice(1),
      })),
    [platforms],
  );

  return (
    <section className={containerClassName}>
      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          Platform
          <AppDropdown
            value={selectedPlatform}
            options={platformOptions}
            onChange={onPlatformChange}
            className="w-full"
            panelClassName="mt-2 min-w-[220px]"
            placeholder=""
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          Account
          <AppDropdown
            value={selectedAccount}
            options={accounts}
            onChange={onAccountChange}
            className="w-full"
            panelClassName="mt-2 min-w-[260px]"
            placeholder=""
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          Date Range
          <AppDropdown
            value={selectedRange}
            options={rangeOptions}
            onChange={onRangeChange}
            className="w-full"
            panelClassName="mt-2 min-w-[220px]"
            placeholder=""
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          Comparison Metric
          <AppDropdown
            value={comparisonMetric}
            options={comparisonOptions}
            onChange={onComparisonMetricChange}
            className="w-full"
            panelClassName="mt-2 min-w-[220px]"
            placeholder=""
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          Sort Media By
          <AppDropdown
            value={mediaSort}
            options={sortOptions}
            onChange={onMediaSortChange}
            className="w-full"
            panelClassName="mt-2 min-w-[220px]"
            placeholder=""
          />
        </label>
      </div>
    </section>
  );
}
