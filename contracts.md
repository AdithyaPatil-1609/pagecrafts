# Pagecrafts contracts

## Status

Frozen on 2026-08-04 for Day 1. Changes require agreement from the whole team before implementation.

## Canonical sources

- Type contracts: `src/lib/contracts/`
- HTTP contract: `docs/openapi.yaml`
- Database contract: `supabase/migrations/20260804120000_initial_schema.sql`

## Frozen decisions

| Area | Contract |
| --- | --- |
| Categories | `portfolio`, `restaurant`, `saas`, `blog`, `event`, `resume`, `agency`, `store`, `nonprofit`, `other` |
| Content editing | Six field types: `text`, `richtext`, `image`, `color`, `select`, `list` |
| Project working tree | `FileMap` is `Record<string, string>`; file paths are relative text paths only |
| API envelope | All typed route results use `ApiResult<T>` |
| API version | New routes live under `/api/v1`; breaking changes use a new version |
| Ownership | Supabase RLS is the authority for user-owned data; a non-owner sees no row |
| Deploy status | `pending`, `live`, `failed` |

## Day 1 route signatures

| Method | Path | Request | Success |
| --- | --- | --- | --- |
| POST | `/api/v1/generate` | `GenerateSiteRequest` | `GenerateSiteResponse` |
| GET | `/api/v1/projects/{id}/files` | None | `GetProjectFilesResponse` |
| PUT | `/api/v1/projects/{id}/files` | `PutProjectFilesRequest` | `GetProjectFilesResponse` |
| POST | `/api/v1/projects/{id}/edit` | `EditProjectRequest` | `EditProjectResponse` |
| POST | `/api/v1/projects/{id}/publish` | `Idempotency-Key` header | `PublishProjectResponse` |
| GET | `/api/v1/deployments/{id}` | None | `DeploymentResponse` |

## Change process

1. Record the proposed change in a pull request.
2. Obtain agreement from all five engineers.
3. Update types, OpenAPI, migration, and tests together.
4. Increment the API version for every breaking HTTP change.
