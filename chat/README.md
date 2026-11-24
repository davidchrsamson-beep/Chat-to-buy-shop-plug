# Shop Plug request service

The Find a Plug request/chat service and the Shop Plug home-screen source live here and are imported by the unified `web/` Next.js app. Both are served from the same Hostinger app:

- `/` — Shop Plug vendor search and discovery.
- `/find-a-plug` — Find a Plug transportation request service.

Deploy the unified app from `web/` as described in [web/README.md](../web/README.md). Keep this `chat/` folder beside `web/` during the build; do not deploy it as a separate Netlify site.
