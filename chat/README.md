# Shop Plug main site

This Next.js app serves the unified Errand and Shop Plug experience:

- `/` — Errand, the main Shop Plug experience.
- `/find-a-plug` — Find a Plug request and chat service, linked from the main navigation.
- `/admin`, `/privacy`, and `/terms` — request-service admin and legal pages.

## Run locally

1. Install Node.js LTS.
2. From `chat/`, run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in the values. Never commit or expose `.env.local`.
4. From `chat/`, run `npm run dev` and open `http://localhost:3001`.

## Deploy to Hostinger

Set the Hostinger Node.js app root to `chat/`, then run `npm install`, `npm run build`, and `npm run start` from that directory. Set the required environment variables from `.env.example` in Hostinger's app settings; keep server-only keys such as `OPENAI_API_KEY` private.

The separate `web/` app contains the vendor marketplace and vendor-management experience. The shared database migrations are in `supabase/`.
