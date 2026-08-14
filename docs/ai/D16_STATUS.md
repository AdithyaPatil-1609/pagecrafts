# R5 · AI — D14, D16–D20

Owner: Hanish. Closed in code on 2026-08-14. No fake launch numbers, no live
30-corpus Groq run for D18.

| Day | Status | What landed | Still blocked |
|---|---|---|---|
| **D14** | Closed | 8 themes; dials emit CSS (`artDirectionCss` → `compositionShell`); ranking `vertical: 100`; `Template.vertical` already on the contract; `applyTone` constrains, does not pin. | — |
| **D16** | Closed | Motion budget still repairs. Variant monotony/repeat and motion-mismatch now repair when an alternative exists. Rolling 50-site (theme, motion) sample: share above ~30% / ~40% restyles to a tone-compatible look. Spike/grade pipelines call `checkAndRecord`. | A live 30-run is the measurement, not the enforcement. |
| **D17** | Closed | `npm run cost` renders the dashboard. Panel: **zero-request edit share** (composition PATCH vs `POST /edits`). | Preethi UI is out of scope. Share is `—` until edits flow through those routes. |
| **D18** | Code closed | `npm run verify:caps` + `tests/unit/ai/generation-budget.test.ts` + existing RateLimiter tests. Caps verified without a provider. 429s are quota, not quality. | Real load against Groq waits on a dedicated cap run, not a quality eval. Preethi owns keyboard/LCP. |
| **D19** | Closed | `npm run prompts:doc` covers section content contracts, art-direction dial vocabulary, tone constraints. Freeze = v1 hashes + contract field names + dial ids. | Process freeze, not a product freeze. |
| **D20** | Instrumentation closed | `costPerUserCents`, `byUser`, `costForUser()`, `loadGenerationRows()`. Eval rows have `userId: null` and stay out of the mean. | A rupee/user figure needs real users and a provisioned `generations` table (E1). No beta-watch hook existed; none invented. |

## Verify

```bash
npx vitest run tests/unit/ai/composition-validate.test.ts tests/unit/ai/cost-dashboard.test.ts tests/unit/ai/generation-budget.test.ts tests/unit/ai/prompt-library.test.ts tests/unit/ai/art-direction.test.ts tests/unit/ai/rank.test.ts tests/unit/ai/rate-limit.test.ts
npm run prompts:doc
npm run verify:caps
npm run cost -- evals/grader/results/2026-08-14T05-13-47-751Z-baseline-full
```
