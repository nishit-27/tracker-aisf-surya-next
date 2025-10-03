"use client";

function StatCard({ title, value, subtitle }) {
  return (
    <div className="flex h-full min-h-[170px] flex-col justify-between rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-slate-900/20 px-6 py-5 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">
        {title}
      </p>
      <p className="mt-5 text-3xl font-semibold text-white">{value}</p>
      {subtitle ? <p className="mt-3 text-xs text-slate-400">{subtitle}</p> : null}
    </div>
  );
}

function formatNumber(value) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return Number(value ?? 0).toLocaleString();
}

export default function OverviewCards({ overview }) {
  const cards = [
    {
      title: "Total Followers",
      value: formatNumber(overview.totalFollowers),
      subtitle: "Combined followers across linked accounts",
    },
    {
      title: "Total Views",
      value: formatNumber(overview.totalViews),
      subtitle: "Lifetime views across all tracked media",
    },
    {
      title: "Avg. Engagement",
      value: `${
        typeof overview.averageEngagementRate === "number"
          ? overview.averageEngagementRate.toFixed(2)
          : Number(overview.averageEngagementRate ?? 0).toFixed(2)
      }%`,
      subtitle: "Average engagement rate across platforms",
    },
    {
      title: "Total Interactions",
      value: formatNumber(
        (overview.totalLikes ?? 0) +
          (overview.totalComments ?? 0) +
          (overview.totalShares ?? 0)
      ),
      subtitle: "Likes, comments, and shares combined",
    },
  ];

  return (
    <section className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <StatCard key={card.title} {...card} />
      ))}
    </section>
  );
}
