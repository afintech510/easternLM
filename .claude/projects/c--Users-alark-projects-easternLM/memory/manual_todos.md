---
name: manual_todos
description: Manual action items that require Adam's input — DNS, credentials, third-party configs, and content that can't be automated
type: project
---

# Manual TODOs — Waiting on Adam

## Credentials & Third-Party Setup

- [ ] **Stripe live keys** — Switch from test to live in `.env.local` and VPS container
- [ ] **Resend domain verification** — Verify `send.easternlm.com` in Resend dashboard
- [ ] **Twilio account** — Sign up, get TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, buy a 631 phone number. Add to `.env.local` and VPS.
- [ ] **Google Review URL** — Go to Google Business Profile → Share → "Ask for reviews" → paste URL into `/admin/settings`
- [ ] **Google Search Console** — Add `easternlm.com`, verify ownership, submit sitemap URL (`https://easternlm.com/sitemap.xml`)

## DNS & Domain

- [ ] **Point easternlm.com DNS** — A record → VPS IP `5.161.88.134` (both apex and www)
- [ ] **Point easternbuilding.supply DNS** — A record → VPS IP (for 301 redirects)
- [ ] **SSL certs** — Run `certbot` on VPS for both domains after DNS propagates
- [ ] **Update NEXT_PUBLIC_SITE_URL** — Change from `https://staging.easternlm.com` to `https://easternlm.com`

## VPS Cron Jobs to Add

- [ ] **Follow-up processor** — `*/5 * * * * curl -sf "https://easternlm.com/api/cron/follow-ups?key=elm_cron_2026_secret" > /dev/null`
- [ ] **Campaign processor** — `* * * * * curl -sf "https://easternlm.com/api/cron/campaigns?key=elm_cron_2026_secret" > /dev/null`
- [ ] **Reviews refresh** — `0 6 * * * curl -sf "https://easternlm.com/api/cron/refresh-reviews?key=elm_cron_2026_secret" > /dev/null`
- [ ] **Morning briefing** — `0 6 * * 1-6 curl -sf "https://easternlm.com/api/cron/morning-briefing?key=elm_cron_2026_secret" > /dev/null`
- [ ] **Delivery notifications** — `*/2 * * * * curl -sf "https://easternlm.com/api/cron/delivery-notify?key=elm_cron_2026_secret" > /dev/null`
- [ ] **Supabase keep-alive** — `*/5 * * * * curl -sf "https://easternlm.com/api/health" > /dev/null`

## Content & Media

- [ ] **Product photography** — Replace WC placeholder images with real photos of materials
- [ ] **Gallery photos** — Upload project/yard photos to `/admin/gallery`
- [ ] **GoDaddy order export** — Check GoDaddy dashboard for any orders placed through GoDaddy Commerce; export CSV if any exist
- [ ] **Pre-2023 WooCommerce orders** — Check if WC has data from before April 2023; export CSV if so

## Testing Before Go-Live

- [ ] **Place a real test order** — 2yd mulch, real address, real card (after Stripe live keys)
- [ ] **Test webhook flow** — Verify status transition pending → paid, email delivery
- [ ] **Test failure cases** — Address outside 50mi, order below $125 minimum
- [ ] **Refund test order** — Refund in Stripe, mark cancelled in Supabase

## Admin Setup

- [ ] **Supabase Pro plan** — Decide: upgrade to Pro ($25/mo) or keep free tier with keep-alive cron
- [ ] **Uptime monitor** — Set up free UptimeRobot or Better Stack for `https://easternlm.com`

**Why:** These items all require Adam's credentials, domain access, or manual decisions that can't be automated by Claude Code.

**How to apply:** Work through these after all build prompts are complete. DNS + Stripe live keys are the two biggest go-live blockers.
