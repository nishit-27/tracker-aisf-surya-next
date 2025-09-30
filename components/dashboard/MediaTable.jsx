"use client";

function formatNumber(value) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return Number(value ?? 0).toLocaleString();
}

function formatDate(date) {
  if (!date) {
    return "—";
  }
  const parsed = new Date(date);
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const headers = [
  { key: "platform", label: "Platform" },
  { key: "title", label: "Content" },
  { key: "publishedAt", label: "Published" },
  { key: "views", label: "Views" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "shares", label: "Shares" },
  { key: "engagementRate", label: "Engagement" },
];

export default function MediaTable({ media, sortField, sortOptions }) {
  const limit = 20;
  const rows = media.slice(0, limit);

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold">Content Leaderboard</h2>
          <p className="text-xs text-slate-400">
            Ranked by {sortOptions.find((option) => option.value === sortField)?.label ?? "Views"}.
          </p>
        </div>
        <p className="text-xs text-slate-500">
          Showing {rows.length} of {media.length} posts
        </p>
      </div>

      <div className="overflow-x-auto -mx-6 px-6">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead>
            <tr>
              {headers.map((header) => (
                <th
                  key={header.key}
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400"
                >
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((item) => (
              <tr key={`${item.platform}-${item.externalId}`} className="hover:bg-slate-800/40">
                <td className="px-3 py-3 align-middle text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                  {item.platform}
                </td>
                <td className="max-w-[260px] px-3 py-3 align-middle text-sm font-medium text-slate-100">
                  <div className="flex flex-col">
                    <span className="truncate">{item.title || "Untitled"}</span>
                    <a
                      className="text-xs text-sky-400 hover:text-sky-300"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View post
                    </a>
                  </div>
                </td>
                <td className="px-3 py-3 align-middle text-xs text-slate-300">
                  {formatDate(item.publishedAt)}
                </td>
                <td className="px-3 py-3 align-middle text-sm font-semibold text-slate-100">
                  {formatNumber(item.metrics?.views)}
                </td>
                <td className="px-3 py-3 align-middle text-sm font-semibold text-slate-100">
                  {formatNumber(item.metrics?.likes)}
                </td>
                <td className="px-3 py-3 align-middle text-sm font-semibold text-slate-100">
                  {formatNumber(item.metrics?.comments)}
                </td>
                <td className="px-3 py-3 align-middle text-sm font-semibold text-slate-100">
                  {formatNumber(item.metrics?.shares)}
                </td>
                <td className="px-3 py-3 align-middle text-sm font-semibold text-slate-100">
                  {`${Number(item.metrics?.engagementRate ?? 0).toFixed(2)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {media.length > limit ? (
        <p className="mt-3 text-xs text-slate-500">
          Showing top {limit} results. Apply filters to focus on specific date ranges or platforms.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-slate-400">
          No media items match the selected filters.
        </div>
      ) : null}
    </section>
  );
}
