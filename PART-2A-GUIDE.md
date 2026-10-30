# Ndu — Part 2A: vendor AI assistant

Vendors drop in up to 24 photos at once. The AI groups the angles of each item and writes
the name, product type, details and description, and suggests a moving display line.
The vendor checks each card, types the price, and taps **Publish all**.

Included with listing (paid plans, and everyone during the November launch offer),
capped at 300 photos per vendor per month (change `ai_monthly_photo_cap` in the settings table).

## Set up

1. Unzip into `C:\Users\HP\ndu` and choose **Replace**.
2. Supabase -> SQL Editor -> New query -> paste the CONTENTS of
   `supabase/migrations/20261030090000_ai_usage.sql` -> Run.
3. Add to `web\.env.local` (server-only, never NEXT_PUBLIC_):

```bash
OPENAI_API_KEY=your-key-from-platform.openai.com
OPENAI_MODEL=gpt-5-mini
```

`OPENAI_MODEL` must be a model that can read images. If OpenAI says the model doesn't exist,
pick the cheapest image-capable model listed at platform.openai.com/docs/models and put its exact name here.

4. On platform.openai.com -> Settings -> Limits, set a **monthly budget** so costs can never surprise you.
5. Restart the main site (Ctrl + C, `npm run dev`).

## Try it

Products -> **✨ Add with AI** -> add photos of 2–3 items (3 angles each, any order) ->
**Let AI fill in the details** -> check the cards, add prices -> **Publish all**.

If something fails, the terminal shows a line starting with `AI request failed:` with OpenAI's reason.

## Why it's built this way

- **One AI file** (`web/src/lib/ai.ts`): switching from OpenAI to another provider later changes only that file.
- **Photos are sent at "low detail"**: plenty for naming and describing products, at a fraction of the cost.
- **The AI can only choose product types the store sells**, and every answer is checked before it's shown.
  Any photo the AI misses becomes its own card, so nothing is lost.
- **The AI is told never to invent facts** (brands, "original", sizes) that aren't visible.
- **Prices are always typed by the vendor**, never guessed by the AI.
- **Usage is recorded only after a successful run**, and the monthly cap is checked before each run.

Note for launch: Cloudflare's free `r2.dev` photo address is meant for testing. Before launch we connect
a proper photo address on your own domain (e.g. media.ndu.ng), which is also faster.
