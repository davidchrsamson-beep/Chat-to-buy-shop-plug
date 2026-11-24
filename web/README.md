# Shop Plug

Shop Plug runs as one Next.js application. The home page is the vendor-search experience, with the original Errand examples and direct vendor contact. The transportation request service is available at `/find-a-plug` from the main navigation. The separate vendor marketplace remains at `/marketplace` without a public navigation link and is marked `noindex`.

## Project layout

- `web/` — unified Next.js app and Hostinger app root.
- `chat/` — request-service source imported by `web/`; keep this folder beside `web/` when building.
- `supabase/` — shared database migrations.

## Run locally

1. Install Node.js LTS.
2. From `web/`, run `npm install`.
3. Copy `web/.env.example` to `web/.env.local` and fill in the values. Never commit or expose `.env.local`.
4. From `web/`, run `npm run dev` and open `http://localhost:3000`.

## Deploy directly to Hostinger

Upload the entire project folder so both `web/` and `chat/` are present. Configure the Hostinger Node.js app root as `web/`, then run `npm install`, `npm run build`, and `npm run start` from that directory. Set the required environment variables from `.env.example` in Hostinger's app settings; keep server-only keys such as `OPENAI_API_KEY` private.

No Netlify proxy or Git deployment is required for this app.
