# RedCard — World Cup 2026 forfeit sweepstakes

Predict every match with your group. Locked at kickoff, scored automatically from
live data. Bottom of the table at the end of each stage does a forfeit — on camera.

Mobile-first Next.js 15 + Supabase. No real money, no gambling.

## What's in this v1 (deliberately cut)

| In | Out (v1.1+) |
|---|---|
| Google sign-in (with WhatsApp in-app-browser escape hatch) | Apple sign-in (needs a $99/yr Apple dev account) |
| Groups + invite links/codes + tier consent flow | Side bets, tournament-long bets |
| Score predictions, locked at kickoff (DB-enforced) | Custom forfeits + AI filter + voting |
| Auto-scoring (5/3/1, 90-min result) + leaderboard | Proof uploads + reactions (WhatsApp does this better) |
| Forfeit assignment, 3-tier library, one veto, red-card reveal screen | Push notifications, in-app chat |
| Under-18 hard cap at Tier 1 (DOB at onboarding) | |

## Setup (≈20 minutes)

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. SQL Editor → run `supabase/schema.sql`, then `supabase/seed.sql`.
3. Authentication → Providers → enable **Google**.
   - Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
     (OAuth client ID → Web application).
   - Authorized redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
   - Paste client ID + secret into Supabase.
4. Authentication → URL Configuration → add your site URL and
   `https://your-app.vercel.app/**` to redirect URLs (plus `http://localhost:3000/**` for dev).

### 2. football-data.org
1. Free token: https://www.football-data.org/client/register
2. Free tier includes the World Cup at 10 calls/min. The app makes at most
   **one** upstream call per 60 seconds total (server-side throttle), so you will
   never hit the limit no matter how many users you have.

### 3. Env vars
Copy `.env.example` → `.env.local` and fill in. On Vercel, add the same vars in
Project Settings → Environment Variables. `SUPABASE_SERVICE_ROLE_KEY` and
`FOOTBALL_DATA_TOKEN` are server-only — never expose them with `NEXT_PUBLIC_`.

### 4. Run
```bash
npm install
npm run dev
```
Then run `curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/sync`
once to pull all WC 2026 fixtures into your DB.

### 5. Deploy
Push to GitHub → import on Vercel → add env vars → deploy.

## Keeping scores live

Vercel Hobby crons only run once per day, which is useless during matches.
The fix is already built in:

- Every group-page load fires a background sync, throttled to one real API call
  per minute. If anyone in any group has the app open during a match, scores flow.
- For belt-and-braces during match days, point a free pinger
  ([cron-job.org](https://cron-job.org)) at
  `https://your-app.vercel.app/api/sync` every 2 minutes, with a custom header
  `Authorization: Bearer YOUR_CRON_SECRET`.

## Decisions you should know about

- **Scoring uses the 90-minute result** for knockout games (extra time and
  penalties don't change prediction points). This is stated in the UI. Standard
  practice; prevents arguments.
- **Prediction lock is enforced in the database** (RLS policy checks `kickoff > now()`),
  not just the UI. Nobody can sneak a prediction in via the API after kickoff.
- **One prediction per user per match, shared across groups.** Simpler, and how
  people actually play. Per-group predictions are a schema change away if you want them.
- **Predictions are hidden from other members until kickoff** (RLS), so nobody copies
  the group genius.
- **Veto runs through a security-definer SQL function** so the loser can't pick
  their own replacement forfeit.
- **The cinnamon challenge was replaced with a wasabi spoon** in `seed.sql`. Dry
  cinnamon is an aspiration/choking hazard with a real hospitalization record — it
  fails the spec's own Hard Bans. Wasabi hurts just as much and is safe.
- **Proof lives in your WhatsApp group.** The host marks forfeits completed in-app.
  Uploads, reactions, and reporting come back in v1.1 if you still want them.

## Legal note (not legal advice)

Ship a real Terms page before public launch: voluntary participation, own-risk
acknowledgment, 18+ for Tier 2/3, right to refuse any forfeit. Remember waivers
generally do not cover gross negligence, and minors cannot waive liability — the
Tier 1 under-18 cap is what actually protects you there.

## Project map

```
src/
  app/
    page.tsx                     landing
    login/                       Google OAuth + in-app-browser escape hatch
    onboarding/                  display name + DOB (age gate)
    auth/callback/               OAuth code exchange
    groups/, groups/new/         dashboard + group creation (tier pick)
    join/[code]/                 invite landing + consent flow
    g/[id]/                      fixtures / table / forfeits tabs
    g/[id]/forfeit/[fid]/        red-card reveal screen
    api/sync/                    fixture + score sync (throttled)
    api/forfeit/{assign,veto,complete}/
  components/                    MatchCard, Leaderboard, ForfeitsPanel, RevealCard…
  lib/
    football.ts                  football-data.org sync + scoring trigger
    scoring.ts                   5/3/1 rules
    supabase/                    browser / server / admin clients
supabase/
  schema.sql                     tables, RLS, RPCs, leaderboard view
  seed.sql                       forfeit library (3 tiers)
```
