"use client";

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

  return (
    <section className={containerClassName}>
      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          Platform
          <select
            value={selectedPlatform}
            onChange={(event) => onPlatformChange(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {platforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform === "all"
                  ? "All Platforms"
                  : platform.charAt(0).toUpperCase() + platform.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          Account
          <select
            value={selectedAccount}
            onChange={(event) => onAccountChange(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {accounts.map((account) => (
              <option key={account.value} value={account.value}>
                {account.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          Date Range
          <select
            value={selectedRange}
            onChange={(event) => onRangeChange(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {rangeOptions.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          Comparison Metric
          <select
            value={comparisonMetric}
            onChange={(event) => onComparisonMetricChange(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {comparisonOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          Sort Media By
          <select
            value={mediaSort}
            onChange={(event) => onMediaSortChange(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
