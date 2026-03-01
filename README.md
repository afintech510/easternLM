# Eastern Landscape & Mason Supply

## Local development
```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase connection
1. Copy `.env.example` to `.env.local`.
2. Fill these values from your Supabase project:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_REF` (for CLI linking)
- `SUPABASE_ACCESS_TOKEN` (for CLI login)
- `GOOGLE_MAPS_API_KEY` (for live distance matrix calls)
- `STRIPE_SECRET_KEY` (for checkout session creation)
- `STRIPE_WEBHOOK_SECRET` (for webhook signature verification)
- `NEXT_PUBLIC_SITE_URL` (used for Stripe success/cancel redirects)
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (for order confirmation emails)

3. Verify from the app:
- `GET /api/health/supabase`
- Expected result is `ok: true` when both public and admin checks pass.

## Supabase CLI (direct control)
```powershell
$env:SUPABASE_ACCESS_TOKEN="your-token"
npx supabase login --token $env:SUPABASE_ACCESS_TOKEN
npx supabase link --project-ref your-project-ref
```

Useful commands:
```bash
npm run supabase:status
npm run supabase:types
```
