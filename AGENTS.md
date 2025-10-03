# Repository Guidelines

## Project Structure & Module Organization
- `app/` drives the Next.js App Router (`layout.js`, `page.js`, `globals.css`) and houses API routes under `app/api/*/route.js`.
- Presentation logic lives in `components/dashboard`, while persistence and integrations reside in `lib/` (`lib/models`, `lib/platforms`, `lib/services`, `lib/utils`).
- Static assets sit in `public/`; the `@/` path alias maps to repo root via `jsconfig.json` for imports.

## Build, Test, and Development Commands
- `npm install` after each dependency bump to sync Tailwind v4 and Next.js toolchain.
- `npm run dev` serves the Turbopack dev build on `http://localhost:3000`; `npm run build` produces the optimized bundle used by CI/CD.
- `npm run start` runs the production server locally. Use `node test-insane-websites.js` to exercise Instagram ingestion when RapidAPI env vars are present.

## Coding Style & Naming Conventions
- Keep two-space indentation, semicolons omitted per existing code, and prefer double quotes in modules, single quotes in JSX only when required.
- React components are PascalCase and colocate with related hooks; helper utilities stay camelCase. Constants and env keys remain UPPER_SNAKE_CASE.
- Favor Tailwind utility classes and tokens defined in `app/globals.css`; only add custom CSS when a design token is missing.

## Testing Guidelines
- No formal runner is configured; add focused Node-based checks beside new features or introduce Jest/Vitest if broader coverage is needed.
- Test ingestion and database flows with `.env.local` providing `RAPIDAPI_KEY`, `RAPIDAPI_HOST_INSTAGRAM`, and `MONGODB_URI`.
- Log meaningful identifiers in any diagnostic scripts (`test-*.js`) so failures are traceable in shared environments.

## Commit & Pull Request Guidelines
- Follow the existing short, imperative subject style (`fixed yt refresh`); add optional detail in the body when context extends beyond the summary.
- Every PR should describe scope, list manual or automated tests, and include screenshots or clips for UI changes.
- Link related issues, call out env/config updates, and request review from someone owning the affected surface before merging.

## Security & Configuration Tips
- Never commit secrets; manage credentials through `.env.local` locally and deployment-specific secrets in hosting.
- `lib/mongodb.js` caches the connection—reuse it inside API routes to avoid exhausting pools.
- `lib/platforms/instagram.js` builds an axios client per RapidAPI host; rotate keys and hosts per environment via environment variables.
