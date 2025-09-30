// Placeholder YouTube provider using mock data. Replace with YouTube Data API integration.
export async function fetchYouTubeData() {
  const timestamp = new Date();

  return {
    account: {
      accountId: "yt_246810",
      username: "mock.youtube.channel",
      displayName: "Mock YouTube Channel",
      profileUrl: "https://www.youtube.com/@mockyoutubechannel",
      stats: {
        followers: 182000,
        totalViews: 7850000,
        totalLikes: 215000,
        totalComments: 48500,
        totalShares: 0,
        totalImpressions: 9100000,
        engagementRate: 6.4,
      },
      lastSyncedAt: timestamp,
    },
    media: [
      {
        externalId: "yt_video_1",
        title: "How We Plan Content in 2025",
        caption: "",
        url: "https://www.youtube.com/watch?v=yt_video_1",
        thumbnailUrl: "https://picsum.photos/seed/yt1/400/225",
        publishedAt: new Date(timestamp.getTime() - 1000 * 60 * 60 * 24 * 10),
        metrics: {
          views: 420000,
          likes: 18500,
          comments: 2400,
          shares: 0,
          saves: 0,
          impressions: 560000,
          engagementRate: 4.9,
        },
      },
      {
        externalId: "yt_video_2",
        title: "Monthly Performance Review",
        caption: "",
        url: "https://www.youtube.com/watch?v=yt_video_2",
        thumbnailUrl: "https://picsum.photos/seed/yt2/400/225",
        publishedAt: new Date(timestamp.getTime() - 1000 * 60 * 60 * 24 * 20),
        metrics: {
          views: 375000,
          likes: 16400,
          comments: 2200,
          shares: 0,
          saves: 0,
          impressions: 480000,
          engagementRate: 4.7,
        },
      },
    ],
  };
}
