# Shor plug — chat-first requests (MVP)

**Customers** (errand's address, e.g. nduchat.netlify.app): Shor plug home → **Make a request** →
cozy chat with "Your plug" → they say what they need → give name, phone, address →
get the bill in the chat → pay by bank transfer → tap **I've paid** → see "on the way" / "delivered".

**You** (main site: /team, e.g. nducommunity.netlify.app/team): see every request, reply,
send the bill (items + fare + late night ₦500 + 10+ large items ₦200), confirm payment,
mark "on the way" and "delivered", call or WhatsApp the customer, and **Copy for plug**
to forward the job to a plug.

## Set up (in this order)

1. Unzip into `C:\Users\HP\ndu` and choose **Replace**.

2. Supabase → SQL Editor → New query → paste the CONTENTS of
   `supabase/migrations/20261105090000_shor_plug_requests.sql` → **Run**.

3. Put yourself on the team (use the email you log in to the vendor dashboard with):
   ```sql
   insert into public.team_members (user_id)
   select id from auth.users where email = 'YOUR-LOGIN-EMAIL';
   ```
   It should say "INSERT 0 1". (Add teammates the same way.)

4. Your bank details (shown on every bill):
   ```sql
   update public.settings
   set value = '{"bank": "Opay", "account_name": "Shor Plug Ventures", "account_number": "0123456789"}'
   where key = 'shor_bank';
   ```
   Fares, late-night (₦500), large items (₦200) and the ₦100 commission are in the
   `shor_pricing` row of the same table: change them any time.

5. Push:
   ```
   cd C:\Users\HP\ndu
   git add -A
   git commit -m "Shor plug requests"
   git push
   ```

## Try it end to end

1. Phone: open the customer site → **Make a request** → "2 bottles of Baileys to Marian by 1am" → fill your details.
2. Laptop: log in on the main site, then open **/team** → the request appears (with a ding) → reply → **Send bill**.
3. Phone: the bill appears → **I've paid**.
4. Laptop: **Payment received** → **Plug is on the way** → **Delivered**. The phone shows each step.

## Good to know

- Keep **/team** open (phone or laptop) to hear new requests. Phone notifications come later.
- Customers have no account: their chat is unlocked by a secret code saved on their phone.
  Only team members can see phone numbers and addresses.
- The brand name is in one place: `chat\src\lib\brand.ts`.
- To make the customer link say "shorplug", rename the errand project on Netlify
  (Project configuration → Change project name), e.g. `shorplug` → shorplug.netlify.app.
