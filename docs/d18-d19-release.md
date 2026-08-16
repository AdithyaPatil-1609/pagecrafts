# D18 production config, D19 freeze

Owner: Adithya (E1 / R4). Written on D19. Everything here is either a command you
can run or a step someone has to perform — nothing in it is a promise.

---

## The kill-switch drill (D18)

The switch lives in Redis, so it takes effect **without a redeploy**. That is the
whole point: an emergency stop that needs a build is not an emergency stop.

**Engage.** Upstash console → the Pagecraft database → Data Browser → add:

```
key    ai:kill-switch
value  drill 2026-08-14
```

**Confirm what a person sees.** Sign in on pagecrafts.in and try to generate a site.
Expected:

> Site generation is paused right now. Please try again later.

The value you set is the reason string; it is logged, not shown to the user.

**Release.** Delete the key. Generation works again on the next request.

**Record** how long each direction took. Both should be under a minute.

There is also `AI_KILL_SWITCH=1` as an environment variable, checked before Redis.
It needs a redeploy, so it is the wrong tool in an incident — it exists so the switch
still works if Redis itself is the thing that is broken.

**Note the asymmetry, deliberately.** The rate limiter fails *closed* — if Redis is
unreachable, requests are refused, because the alternative is unmetered spend. The
kill switch fails *off* — if Redis is unreachable, generation continues, because a
broken cache must not silently pause the product.

---

## Production configuration (D18)

```
npm run check:config
```

Reads `.env.example` as the list of what the app expects and reports anything missing
or still holding a placeholder. Run it locally, and again in a Vercel shell against
production.

As of writing, production is missing the whole hosting block:

```
HOSTING_PROVIDER
HOSTING_API_BASE
HOSTING_ACCOUNT_ID
HOSTING_CREDENTIAL_KEY_ID
HOSTING_DEPLOY_CREDENTIAL
PAGECRAFT_ROOT_DOMAIN
```

Publishing cannot work until these are set. `HOSTING_DEPLOY_CREDENTIAL` is not the
raw token — seal it first with `npm run deploy:seal`, which needs `SECRET_MASTER_KEY`.

`PAGECRAFT_ROOT_DOMAIN` matters more than it looks: unset, the code falls back to
`pagecraft.in`, singular, which is not a domain we own. Published sites would be
given addresses that do not resolve.

---

## What is frozen (D19)

Frozen means: changes to these need a second pair of eyes and a stated reason.

- `supabase/migrations/` — no new migrations except to fix a live fault
- `src/lib/contracts/` — the shared shapes all five of us build against
- `src/lib/errors/` — the error catalogue; adding a code touches four files
- `src/lib/limits/` — the rate, spend and concurrency guards
- `src/lib/security/headers.ts` — a wrong CSP is a white screen, not an error
- `.github/workflows/ci.yml`
- `next.config.ts`

Still open, because launch will need them:

- copy and wording anywhere
- template designs and content
- prompt text
- anything under `docs/`

---

## How to undo each moving part

| Broken thing | Undo |
|---|---|
| A bad deploy | Vercel → Deployments → Instant Rollback |
| A bad migration | the matching file in `supabase/rollback/` |
| Generation costing too much | set `ai:kill-switch` in Redis |
| A single user hammering the AI | limits in `src/lib/limits/config.ts` |
| A leaked key | rotate at the provider, update Vercel, redeploy |
| DNS wrong | Cloudflare; the apex is an A record to Vercel, `www` a CNAME |

`supabase/rollback/20260812090000_vertical_profiles.sql` **does not exist**. That one
migration has no undo. Someone should write it before launch.

---

## Open risks going in

**Publishing does not work.** Three reasons: the hosting variables are unset,
`siteId: null` in the publish route provisions a new site on every republish
(FR-087 says ten republishes make one repository), and the R3 publish branch does
not build. This is the critical path.

**No database backup.** Supabase free tier has none scheduled. The schema is safe in
`supabase/migrations/`, but user data is not. Take a manual dump before real people
arrive.

**Groq's daily token ceiling is the real limit**, not our own. 200,000 tokens a day
against roughly 9,400 per generation is about twenty-one sites a day across everyone.
Our per-user cap of sixty is far above what the provider will actually serve.

**The e2e auth tests are skipped in CI** until a throwaway Upstash database is added
as `E2E_UPSTASH_REDIS_REST_URL` and `_TOKEN`. Five of eleven tests run there today.

**Amendments A2 and A3 are unsigned**, and A3 is claimed by two documents — the
consumer OAuth note and the AI provider chain note.

---

## Launch day (D20)

Do not ship anything. Watch these, roughly hourly:

- **Sentry** → Issues, `environment: production`, newest first. Anything with code
  `internal` is a bare 500 and violates N-4 — that is the one to act on.
- **Vercel** → Observability → error rate. It is 0% now; a step change means real
  people are hitting something.
- **Supabase** → Logs → Postgres. Constraint violations and RLS denials land here.
- **Groq console** → tokens used. At 200,000 generation stops for everyone until
  midnight UTC.

Write down what breaks. Fix only what is broken for a real person.
