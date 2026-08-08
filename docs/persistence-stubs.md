# Persistence stubs — for the editor and the AI edit flow

**Who this is for:** Preethi (editor) and Hanish (AI edit flow), from R3 D4 until the real
persistence path is wired up at D6.

**Where:** `src/lib/api-stubs/`.

## Use the URL, not the function

```ts
import { stubFetch } from "@/lib/api-stubs/fetch";

const api = process.env.NEXT_PUBLIC_USE_STUBS === "1" ? stubFetch : fetch;

const res = await api(`/api/v1/projects/${projectId}/files/index.html`);
const body = await res.json(); // ApiResult<ProjectFileResponse>
if (!body.ok) showError(body.error);
```

`stubFetch` has the same signature as `fetch` and returns real `Response` objects. Writing
against these URLs now means the swap at D6 is one line — the request shapes, envelopes and
status codes do not change.

The underlying functions (`stubGetFile`, `stubListCommits`, …) are exported from
`src/lib/api-stubs/persistence.ts` if you need them directly in a test.

## What is covered

| Method | Path | Answers with |
| --- | --- | --- |
| GET | `/api/v1/projects/{id}` | `ProjectDetail` |
| GET | `/api/v1/projects/{id}/files` | `GetProjectFilesResponse` (whole tree) |
| GET | `/api/v1/projects/{id}/files/{path}` | one file's content |
| PUT | `/api/v1/projects/{id}/files/{path}` | write, `dirty: true` |
| DELETE | `/api/v1/projects/{id}/files/{path}` | delete, `dirty: true` |
| GET | `/api/v1/projects/{id}/commits` | history, newest first |
| PATCH | `/api/v1/projects/{id}/content` | `{ rendered, dirty }` |

Any other address answers `404 not_found`, so a typo in a URL looks like a missing route
rather than silently succeeding.

Publish, deployments and assets are not stubbed. Publish is Adhyay's and is not a stub away
from working; assets need a real file body and storage.

## What you can rely on

- **Determinism.** Same call, same bytes, every run. Fixed project id, fixed timestamps,
  fixed shas — nothing from `Date.now()` or `Math.random()`. A snapshot written today still
  passes next week.
- **The real envelopes.** Every response is `ApiResult<T>` with the status code the live
  route uses. `tests/contract/stubs.test.ts` validates stub responses against the same
  `docs/openapi.yaml` schemas as the live handlers, so the two cannot drift.
- **Failures you can build against.** An unknown file is `404 not_found`; an empty op list
  is `422 validation_failed`. Build the error states now, not at integration.
- **Saving is not committing (V-4).** `PUT` marks the tree dirty and never adds to history.
  If your UI shows a new commit after a save, that is your bug, and it would have been a
  bug against the real API too.

## What you cannot

- **Nothing persists.** Writes live in module memory and are gone on reload.
- **No ownership.** Any project id answers as the one stub project. RLS behaviour —
  someone else's project returning `not_found` — only exists on the real routes.
- **No content-schema validation.** The stub applies content ops to a plain object. The
  real route validates each op against the template's `content_schema` and refuses ops for
  fields the template does not have, so expect stricter behaviour at D6.

## Loading states

```ts
import { setStubLatency } from "@/lib/api-stubs/fetch";

setStubLatency(250); // every stub response waits this long; 0 by default
```

Zero by default so tests do not pay for it.

## Between tests

```ts
import { resetStubs } from "@/lib/api-stubs/persistence";

beforeEach(resetStubs);
```

## When the real thing lands (D6)

Point `api` at `fetch`. If something breaks, it is a contract mismatch worth reporting —
the stubs and the routes are held to one spec, so a difference between them is a defect in
one of the two, not something for you to work around.
