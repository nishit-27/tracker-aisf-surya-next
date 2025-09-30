"use client";

function formatNumber(value) {
  if (value === undefined || value === null) {
    return "—";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  if (numeric >= 1_000_000) {
    return `${(numeric / 1_000_000).toFixed(1)}M`;
  }
  if (numeric >= 1_000) {
    return `${(numeric / 1_000).toFixed(1)}K`;
  }
  return numeric.toLocaleString();
}

function resolveMetadataValue(metadata, key) {
  if (!metadata) {
    return null;
  }

  if (typeof metadata.get === "function") {
    const value = metadata.get(key);
    if (value !== undefined) {
      return value;
    }
  }

  if (typeof metadata === "object" && metadata !== null && key in metadata) {
    return metadata[key];
  }

  return null;
}

function resolveProfile(metadata) {
  return resolveMetadataValue(metadata, "profile");
}

function renderMultilineText(text) {
  if (!text) {
    return null;
  }

  return text.split(/\n+/).map((line, index) => (
    <p key={index} className="text-sm text-slate-200">
      {line}
    </p>
  ));
}

function normaliseUrl(url) {
  if (!url) {
    return null;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `https://${url}`;
}

function buildProfileLinks(profile) {
  const links = new Map();

  const addLink = (url, label) => {
    const normalised = normaliseUrl(url);
    if (!normalised) {
      return;
    }

    const key = normalised.toLowerCase();
    if (!links.has(key)) {
      links.set(key, {
        url: normalised,
        label: label || normalised.replace(/^https?:\/\//i, ""),
      });
    }
  };

  if (profile?.external_url) {
    addLink(profile.external_url, profile.external_url);
  }

  if (Array.isArray(profile?.bio_links)) {
    for (const entry of profile.bio_links) {
      if (entry?.url) {
        addLink(entry.url, entry.title || entry.url);
      }
    }
  }

  if (profile?.bioLink?.link) {
    addLink(profile.bioLink.link, profile.bioLink.link);
  }

  return Array.from(links.values());
}

function buildMetricsForProfile(profile, account, platform) {
  const accountStats = account?.stats ?? {};
  const metrics = [];

  if (platform === "instagram") {
    metrics.push(
      { key: "followers", label: "Followers", value: profile?.follower_count ?? accountStats.followers },
      { key: "following", label: "Following", value: profile?.following_count },
      { key: "posts", label: "Posts", value: profile?.media_count },
      { key: "reels", label: "Reels & Clips", value: profile?.total_clips_count }
    );
  } else if (platform === "tiktok") {
    const stats = profile?.stats ?? {};
    metrics.push(
      { key: "followers", label: "Followers", value: stats.followerCount ?? accountStats.followers },
      { key: "following", label: "Following", value: stats.followingCount },
      { key: "likes", label: "Likes", value: stats.heartCount ?? stats.heart },
      { key: "videos", label: "Videos", value: stats.videoCount },
      { key: "friends", label: "Friends", value: stats.friendCount },
      { key: "diggs", label: "Diggs", value: stats.diggCount }
    );
  } else {
    metrics.push(
      { key: "followers", label: "Followers", value: accountStats.followers },
      { key: "views", label: "Views", value: accountStats.totalViews },
      { key: "likes", label: "Likes", value: accountStats.totalLikes },
      { key: "comments", label: "Comments", value: accountStats.totalComments }
    );
  }

  return metrics.filter((metric, index, array) => {
    if (metric.value === null || metric.value === undefined) {
      return false;
    }

    return array.findIndex((item) => item.key === metric.key) === index;
  });
}

function buildBadges(profile, platform) {
  const badges = [];

  if (profile?.is_verified || profile?.verified) {
    badges.push("Verified");
  }

  if (profile?.is_private || profile?.privateAccount) {
    badges.push("Private");
  }

  if (profile?.is_business || profile?.commerceUserInfo?.commerceUser) {
    badges.push("Business");
  }

  if (platform === "instagram" && profile?.show_text_post_app_badge) {
    badges.push(profile?.text_post_app_badge_label || "Badge");
  }

  if (platform === "tiktok" && profile?.profileTab?.showMusicTab) {
    badges.push("Music Tab");
  }

  if (platform === "tiktok" && profile?.profileTab?.showPlayListTab) {
    badges.push("Playlist Tab");
  }

  return badges;
}

function buildTikTokSettings(profile) {
  return [
    { key: "comment", label: "Comments", value: profile?.commentSetting },
    { key: "duet", label: "Duet", value: profile?.duetSetting },
    { key: "stitch", label: "Stitch", value: profile?.stitchSetting },
    { key: "download", label: "Downloads", value: profile?.downloadSetting },
    { key: "following", label: "Following Visibility", value: profile?.followingVisibility },
    { key: "favorites", label: "Favorites", value: profile?.openFavorite },
    { key: "playlist", label: "Playlists", value: profile?.canExpPlaylist },
    { key: "commerce", label: "Commerce", value: profile?.commerceUserInfo?.commerceUser },
  ].filter((item) => item.value !== null && item.value !== undefined);
}

function formatSettingValue(value) {
  if (typeof value === "boolean") {
    return value ? "Enabled" : "Disabled";
  }

  if (value === null || value === undefined) {
    return "—";
  }

  return String(value);
}

function getAvatarUrl(profile) {
  return (
    profile?.profile_pic_url ||
    profile?.hd_profile_pic_url_info?.url ||
    profile?.avatarLarger ||
    profile?.avatarMedium ||
    profile?.avatarThumb ||
    null
  );
}

function ProfileBadge({ children }) {
  return (
    <span className="rounded-full border border-slate-700 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-200">
      {children}
    </span>
  );
}

export default function AccountProfileModal({ account, onClose }) {
  const profile = resolveProfile(account?.metadata);
  const open = Boolean(account && profile);

  if (!open) {
    return null;
  }

  const platform = (profile?.platform || account?.platform || "").toLowerCase();
  const avatarUrl = getAvatarUrl(profile);
  const displayName = profile?.full_name || profile?.nickname || account.displayName || account.username;
  const username = profile?.username || profile?.uniqueId || account.username;
  const badges = buildBadges(profile, platform);
  const metrics = buildMetricsForProfile(profile, account, platform);
  const biographyText = platform === "tiktok" ? profile?.signature : profile?.biography;
  const biographyTitle = platform === "tiktok" ? "Bio" : "Biography";
  const links = buildProfileLinks(profile);
  const shareMeta = resolveMetadataValue(account?.metadata, "shareMeta");
  const settings = platform === "tiktok" ? buildTikTokSettings(profile) : [];

  function handleDismiss(event) {
    event.stopPropagation();
    if (typeof onClose === "function") {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6"
      onClick={handleDismiss}
    >
      <article
        className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-md p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName || username || "Profile picture"}
                className="h-20 w-20 rounded-full border border-slate-700 object-cover"
              />
            ) : null}
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-white">{displayName}</h2>
              <p className="text-sm text-slate-400">@{username}</p>
              <div className="flex flex-wrap items-center gap-2">
                {badges.map((badge) => (
                  <ProfileBadge key={badge}>{badge}</ProfileBadge>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="self-end rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
          >
            Close
          </button>
        </header>

        {metrics.length ? (
          <section className="mb-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.key} className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
                <p className="text-[0.65rem] uppercase tracking-[0.24em] text-slate-500">{metric.label}</p>
                <p className="text-xl font-semibold text-white">{formatNumber(metric.value)}</p>
              </div>
            ))}
          </section>
        ) : null}

        {biographyText ? (
          <section className="mb-6 space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{biographyTitle}</h3>
            <div className="space-y-1 text-sm text-slate-200">{renderMultilineText(biographyText)}</div>
          </section>
        ) : null}

        {shareMeta?.title || shareMeta?.desc ? (
          <section className="mb-6 space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Share Info</h3>
            {shareMeta?.title ? (
              <p className="text-base font-semibold text-white">{shareMeta.title}</p>
            ) : null}
            {shareMeta?.desc ? (
              <div className="space-y-1 text-sm text-slate-200">{renderMultilineText(shareMeta.desc)}</div>
            ) : null}
          </section>
        ) : null}

        {links.length ? (
          <section className="mb-6 space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Links</h3>
            <ul className="space-y-2 text-sm">
              {links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:text-sky-300"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {settings.length ? (
          <section className="mb-6 space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Account Controls</h3>
            <dl className="grid gap-3 sm:grid-cols-2">
              {settings.map((setting) => (
                <div key={setting.key} className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
                  <dt className="text-[0.65rem] uppercase tracking-[0.24em] text-slate-500">{setting.label}</dt>
                  <dd className="text-base font-semibold text-white">{formatSettingValue(setting.value)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <footer className="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>
            Source synced on {account.lastSyncedAt ? new Date(account.lastSyncedAt).toLocaleString() : "Unknown"}
          </div>
          <a
            href={account.profileUrl || `https://www.${account.platform}.com/${username}`}
            target="_blank"
            rel="noreferrer"
            className="text-sky-400 hover:text-sky-300"
          >
            View on {account.platform ? account.platform.charAt(0).toUpperCase() + account.platform.slice(1) : "Platform"}
          </a>
        </footer>
      </article>
    </div>
  );
}
