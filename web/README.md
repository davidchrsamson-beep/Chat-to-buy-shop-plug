# Shop Plug marketplace

The main Shop Plug website is the Errand experience in `chat/`, with Find a Plug at `/find-a-plug`. This separate Next.js app contains the vendor marketplace, storefronts, and vendor-management experience. Deploy `chat/` for the unified Errand and Find a Plug website; see [chat/README.md](../chat/README.md).

## Project layout

- `chat/` — primary Errand and Find a Plug website.
- `web/` — separate vendor marketplace and vendor-management app.
- `supabase/` — shared database migrations.

## Run locally

1. Install Node.js LTS.
2. From `web/`, run `npm install`.
3. Copy `web/.env.example` to `web/.env.local` and fill in the values. Never commit or expose `.env.local`.
4. From `web/`, run `npm run dev` and open `http://localhost:3000`.

## Deploy directly to Hostinger

To deploy this separate vendor marketplace, configure the Hostinger Node.js app root as `web/`, then run `npm install`, `npm run build`, and `npm run start` from that directory. Set its environment variables from `web/.env.example`. For the primary Errand and Find a Plug website, deploy `chat/` instead and follow [chat/README.md](../chat/README.md).

No Netlify proxy or Git deployment is required.
