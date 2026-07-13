# Telegram Stars — production setup

## What was added

| Piece | Role |
|--------|------|
| `supabase/migrations/20260713_premium_stars_referrals.sql` | `premium_until`, payments ledger, referrals, streaks, disclaimer |
| `supabase/functions/create-stars-invoice` | Creates XTR invoice links for logged-in users |
| `supabase/functions/telegram-webhook` | `pre_checkout_query` + `successful_payment` + `ref_` deep links |
| Mini App UI | Premium paywall, Settings buy buttons, referral share, doctor PDF gate |

### Catalog (edit in both `src/lib/products.js` and `supabase/functions/_shared/products.ts`)

| Product ID | Stars | Type |
|------------|------:|------|
| `premium_1m` | 250 | Subscription (30 days / 2592000s) |
| `premium_3m` | 600 | One-time (90 days Premium) |
| `doctor_report` | 75 | One-time (1 PDF credit) |

## 1. Apply database migration

```bash
# From repo root, linked project eofhvkiidqyxkrpimwer
npx supabase db push
# or paste SQL from supabase/migrations/20260713_premium_stars_referrals.sql in Dashboard → SQL Editor
```

## 2. Secrets

```bash
npx supabase secrets set BOT_TOKEN=<from @BotFather>
npx supabase secrets set SB_URL=https://eofhvkiidqyxkrpimwer.supabase.co
npx supabase secrets set SB_SERVICE_ROLE_KEY=<service_role>
npx supabase secrets set SB_ANON_KEY=<anon>
# Optional but recommended:
npx supabase secrets set WEBHOOK_SECRET=<long-random-string>
```

## 3. Deploy Edge Functions

```bash
npx supabase functions deploy create-stars-invoice
npx supabase functions deploy telegram-webhook
# existing:
npx supabase functions deploy telegram-auth
npx supabase functions deploy send-notifications
npx supabase functions deploy delete-all-data
```

## 4. BotFather

1. `/mybots` → your bot → **Bot Settings** → enable payments / digital goods as required for Stars.
2. Link Mini App URL (GitHub Pages): `https://gymnasium22.github.io/cycleflow2/`
3. Optional: `/setmenubutton` to open the Mini App.

## 5. Set Telegram webhook

```bash
# Replace TOKEN and SECRET
curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://eofhvkiidqyxkrpimwer.supabase.co/functions/v1/telegram-webhook" \
  -d "secret_token=<WEBHOOK_SECRET>" \
  -d "allowed_updates=[\"message\",\"pre_checkout_query\"]"
```

Verify:

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

## 6. Frontend env

`.env` / GitHub Actions:

```
VITE_SUPABASE_URL=https://eofhvkiidqyxkrpimwer.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_BOT_USERNAME=YourBotUsernameWithoutAt
```

`VITE_BOT_USERNAME` is used for referral deep links: `https://t.me/<bot>?start=ref_<code>`.

## 7. Payment flow (runtime)

1. User taps **Go Premium** → `usePremium.purchase(productId)`.
2. Edge Function `create-stars-invoice` calls `createInvoiceLink` with `currency: "XTR"`, empty `provider_token`.
3. Mini App `Telegram.WebApp.openInvoice(link, callback)`.
4. Bot receives `pre_checkout_query` → answers `ok: true`.
5. User pays Stars → `successful_payment` → webhook sets `profiles.premium_until` / credits and writes `star_payments`.
6. Client polls profile a few times and updates UI.

## 8. Test checklist

- [ ] Invoice opens inside Telegram (not browser-only).
- [ ] Cancel path returns `cancelled` without granting Premium.
- [ ] Paid path: `premium_until` in future; paywall shows days left.
- [ ] `doctor_report` increments `doctor_report_credits`; PDF export decrements when not Premium.
- [ ] Duplicate `telegram_payment_charge_id` does not double-extend Premium.
- [ ] Referral: User B opens `?start=ref_CODE` after User A has code; first paid purchase rewards A with +7 days.
- [ ] Disclaimer modal once; Legal links open Privacy/Terms.
- [ ] Settings auto-save survives tab switch.

## 9. Ads / US-EU launch notes

- Keep **“not medical advice”** visible (disclaimer + Settings footer).
- App Store / Play do not list Mini Apps; acquisition is Telegram Ads, SEO landing, communities.
- Target creatives: privacy, calm UX, Stars one-tap checkout — avoid medical claims (“cures”, “prevents pregnancy”).
- For EU ads: link Privacy Policy; age 16+ messaging.

## 10. Security notes

- Never put `BOT_TOKEN` or `service_role` in the Vite bundle.
- Invoice payload embeds `userId`; webhook trusts payload only after Telegram signs the payment (charge id).
- RLS: users can **read** own `star_payments` / referrals; writes are service-role only via Edge Functions.
