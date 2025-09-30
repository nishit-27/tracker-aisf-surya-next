import DashboardClient from "@/components/dashboard/DashboardClient";
import { getOverviewAnalytics } from "@/lib/queries";
import { supportedPlatforms } from "@/lib/platforms";

function normaliseMetadata(metadata) {
  if (!metadata) {
    return {};
  }

  if (typeof metadata.toObject === "function") {
    return metadata.toObject();
  }

  if (metadata instanceof Map) {
    return Object.fromEntries(metadata.entries());
  }

  if (typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata;
  }

  return {};
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getOverviewAnalytics();

  // Ensure plain JSON serialisable data for the client boundary.
  const serialised = {
    overview: data.overview,
    accounts: data.accounts.map((account) => ({
      ...account,
      _id: String(account._id),
      user: account.user ? String(account.user) : null,
      history: (account.history ?? []).map((entry) => ({
        ...entry,
        date: entry.date ? new Date(entry.date).toISOString() : null,
      })),
      createdAt: account.createdAt ? new Date(account.createdAt).toISOString() : null,
      updatedAt: account.updatedAt ? new Date(account.updatedAt).toISOString() : null,
      lastSyncedAt: account.lastSyncedAt
        ? new Date(account.lastSyncedAt).toISOString()
        : null,
      metadata: normaliseMetadata(account.metadata),
    })),
    media: data.media.map((item) => ({
      ...item,
      _id: String(item._id),
      account: item.account ? String(item.account) : null,
      publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString() : null,
      createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
      updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : null,
    })),
  };

  return <DashboardClient data={serialised} platforms={supportedPlatforms} />;
}
