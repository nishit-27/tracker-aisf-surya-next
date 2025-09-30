# Social Media Engagement Tracker

Full-stack Next.js dashboard that unifies Instagram, TikTok, and YouTube engagement insights. The app fetches metrics via RapidAPI and the YouTube Data API, stores results in MongoDB, and visualises performance with Tailwind CSS and Recharts.

> **Quick start:** The UI ships with rich mock data so you can explore the dashboard immediately. Configure the environment variables in `.env.local` when you are ready to connect real APIs and MongoDB.

## Features

- Cross-platform overview with total followers, views, and engagement rate
- Platform-level comparisons and historical engagement trends
- Detailed media table with filtering, sorting, and deep links to each post
- Add unlimited accounts straight from the dashboard UI with an auto-detecting onboarding modal
- Account-level filters that let you drill into a single profile or compare platform rollups
- Next.js API routes to ingest data per platform, onboard new accounts from profile URLs, and a unified `/api/sync-all` endpoint for scheduled refreshes
- MongoDB + Mongoose schemas that persist accounts, media items, and historical snapshots
- Tailwind CSS 4 design system and Recharts visualisations

## Local Development

```bash
npm install
npm run dev
```

Without any environment variables, the dashboard falls back to deterministic mock data sourced from the provider stubs in `lib/platforms`. This lets you iterate on the UI before wiring up live APIs.

## Environment Variables

Copy `.env.example` to `.env.local` and populate the values that apply to your setup:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Connection string for your MongoDB Atlas cluster or self-hosted Mongo instance. |
| `RAPIDAPI_KEY` | Shared RapidAPI key used for both Instagram and TikTok endpoints. |
| `RAPIDAPI_HOST_INSTAGRAM` | Host name for the Instagram RapidAPI endpoint (e.g. `instagram-looter2.p.rapidapi.com`). |
| `RAPIDAPI_HOST_TIKTOK` | Host name for the TikTok RapidAPI endpoint (e.g. `tiktok-api23.p.rapidapi.com`). |
| `INSTAGRAM_USER_ID` | The Instagram Business/Creator account identifier you want to track. |
| `TIKTOK_USER_ID` | TikTok account identifier to hydrate requests. |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key. |
| `YOUTUBE_CHANNEL_ID` | Channel ID used when fetching channel statistics and videos. |
| `SYNC_WEBHOOK_SECRET` | Optional bearer token to protect the `/api/sync-all` cron endpoint. |

## Directory Overview

```
app/
  api/
    analytics/        → Overview + platform-specific analytics routes
    media/            → Filterable media listing API
    sync/             → Platform-specific ingestion routes (Instagram/TikTok/YouTube)
    sync-all/         → Unified ingestion entry point for cron jobs
  page.js             → Loads analytics server-side and renders the dashboard UI
components/dashboard/ → Reusable dashboard widgets and Recharts wrappers
lib/
  models/             → Mongoose schemas for users, platform accounts, and media items
  platforms/          → Integration clients (RapidAPI + YouTube Data API)
  services/           → Sync service that upserts data + overview aggregations
  jobs/               → Helper to trigger sync for all platforms
  queries.js          → Shared data loader used by pages and API routes
```

## Wiring Real Integrations

1. **MongoDB** – supply a valid `MONGODB_URI` in `.env.local`. All API routes will immediately persist data instead of using mock records.
2. **RapidAPI (Instagram & TikTok)**
   - Instagram is wired to RapidAPI via axios (`lib/platforms/instagram.js`). Swap the TikTok provider to use the endpoints you will supply, following the same axios pattern.
   - Include the RapidAPI headers:
     ```js
     const response = await fetch(rapidEndpoint, {
       headers: {
         "x-rapidapi-key": process.env.RAPIDAPI_KEY,
         "x-rapidapi-host": process.env.RAPIDAPI_HOST_INSTAGRAM,
       },
     });
     ```
   - Map the API response fields to the `{ account, media }` structure expected by `upsertPlatformData`.
3. **YouTube Data API** – set `YOUTUBE_API_KEY`; the provider resolves handles to channel IDs, fetches uploads, and stores the ID for efficient refreshes.
4. **Authentication** – if the upstream API requires OAuth (e.g., Instagram Graph API), store any tokens or secrets in the environment and inject them into the provider modules above.

### Onboarding a new Instagram account

1. Ensure `RAPIDAPI_KEY` and `RAPIDAPI_HOST_INSTAGRAM` are configured.
2. Use the “Add Account” button in the dashboard (or `POST /api/accounts`) with a JSON body including the Instagram profile URL (e.g. `{ "url": "https://www.instagram.com/javan/" }`).
3. The API detects the platform, resolves the Instagram user id, exhausts the RapidAPI `reels` pagination via axios, and persists the account + media documents to MongoDB.
4. Subsequent syncs reuse the stored user id for more efficient refreshes.
5. Repeat for as many profiles as you need—the overview, account cards, and filters will automatically include every stored account.

## Scheduled Refresh

- Deploy on Vercel and configure a [Cron Job](https://vercel.com/docs/cron-jobs) to `POST https://your-domain/api/sync-all`.
- Set the `SYNC_WEBHOOK_SECRET` environment variable and supply it via the `Authorization: Bearer <secret>` header to protect the route.
- The helper in `lib/jobs/syncAllPlatforms.js` loops through all supported platforms and updates MongoDB records in sequence.

## API Reference (development mocks)

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/api/sync/[platform]` | Fetches data for a single platform (`instagram`, `tiktok`, or `youtube`) and upserts into MongoDB. |
| `GET` | `/api/sync/[platform]` | Returns the most recent account + media records for the platform. |
| `POST` | `/api/accounts` | Detects the platform (`instagram`, `tiktok`, `youtube`) from a profile URL, resolves identifiers, and ingests the account. |
| `POST` | `/api/sync-all` | Triggers ingestion for every supported platform. Protect with the optional bearer token. |
| `GET` | `/api/analytics/overview` | Aggregated totals across platforms. |
| `GET` | `/api/analytics/platform/[platform]` | Aggregated analytics for a single platform. |
| `GET` | `/api/media?platform=&startDate=&endDate=` | Filterable list of media items, sorted by the requested metric. |

## Next Steps

- Swap the mock provider implementations with live API calls and schedule periodic refreshes.
- Add authentication/authorization if multiple end-users will manage their own accounts.
- Expand the historical model if you need day-level growth charts beyond the snapshot arrays included today.
- Layer in automated tests (e.g., API contract tests) once the data sources are finalised.

## Useful Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server with Turbopack. |
| `npm run build` | Production build. Requires all environment variables to be present. |
| `npm run start` | Run the production build locally. |
