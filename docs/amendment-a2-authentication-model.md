# Scope Amendment A2 — Authentication model

**Status:** Proposed — **not yet in force.** Requires written sign-off from E1 and the Product Owner before it binds (PRD §2.6).
**Raised by:** Pragna (R2 · Discovery + Templates), Day 2.
**Issued against:** the pre-development documentation pack v2.1, as amended by A1.
**Applies to:** Documents 1–19 and the R2 / Adithya role schedules.

---

## 1 · What changes

Sign-in stops being an email magic link and becomes **email and password**. Sign-up, sign-in, email verification and password reset are all first-class flows in v1.

Everything Amendment A1 decided stands unchanged. There is still no third-party developer account anywhere in the user funnel, publishing is still a PageCraft-managed operation on a pagecraft.in subdomain, and payment still happens at publish. A2 changes one thing only: what the user types at the door.

## 2 · Why this is an amendment and not a bug fix

PRD §2.6 states the authentication model as an **INVARIANT** and closes with: *"Decided. Do not reopen without written sign-off from E1 and the product owner."* It is also item 8 on the §2.12 do-not-violate checklist, and SRS SEC-01 says in terms that no password credential shall be stored.

An INVARIANT is not immovable — it is expensive to move on purpose, so that moving it is a decision somebody signs rather than a drift somebody notices in week four. This document is that signature. Until §7 is signed, the magic-link requirement remains in force and the code in `src/app/api/v1/auth/` contradicts the baseline.

## 3 · The argument, both ways

**For the change.** Passwords are what people already expect, and they work when email does not. Magic-link delivery is a single point of failure in the funnel: a link that lands in spam, is delayed by a corporate filter, or is stripped by a scanner leaves the user with no way in and no fallback, and every one of those failures happens outside anything we can instrument or fix. A password also lets a returning user sign in without leaving the tab.

**Against.** PRD §2.6.1 chose the magic link for Meera specifically — the persona the category currently excludes, and the one nearly every contested product decision in the PRD resolves in favour of. A password means: choose one, meet a length rule, confirm it, remember it, and reset it when she does not. That is four more decisions at the coldest point of the funnel, and §2.4 makes publish rate the primary metric precisely because it fails loudly when the funnel does not work for a real person.

**What is being accepted.** The primary metric may move, and there is no baseline to move it against (OQ-2 is open). §6 introduces the instrumentation to detect it and the trigger for revisiting.

## 4 · Superseded text and replacements

### 4.1 Product Requirements Document

| Where | Superseded | Now reads |
|---|---|---|
| §2.6 heading decision | "INVARIANT — Option C (revised): email only. Sign-in is an email magic link — one door." | "INVARIANT — Option D: email and password. Sign-in is an email address and a password — one door. No third-party developer accounts appear anywhere in the user funnel." |
| §2.6.1 Rationale | The least-friction-credential argument for a magic link | "A password is the credential every user already understands, and it does not depend on an email arriving to let somebody back into their own account. The friction it adds at the door is accepted deliberately and monitored (§6 of A2)." |
| §2.6.2 first bullet | "An email user gets a session and a row with a verified email." | "A user gets a session on sign-up and a row with `email_verified = false`. Verification is a separate confirmed step, and publish is gated on it." |
| §2.7.1 flow | "Sign in: email magic link (one door)" | "Sign in: email and password (one door)" |
| §2.8.1 A-1 | "Email magic-link sign-in; one screen, no password, no third-party account." | "Email and password sign-up and sign-in; no third-party account. A user with only an email address and a password signs in, browses, generates, edits and saves. Only publish is gated." |
| §2.12 invariant 8 | "Sign-in is an email magic link only. No third-party developer accounts anywhere in the user funnel." | "Sign-in is email and password only. No third-party developer accounts anywhere in the user funnel." |
| §2.13 Glossary | "Magic link — a single-use, time-limited authentication URL delivered by email." | Withdrawn. Replaced by: "Verification link — a single-use, time-limited URL emailed on sign-up that confirms the user controls the address. Recovery link — the equivalent for setting a new password." |

### 4.2 Software Requirements Specification

| Where | Superseded | Now reads |
|---|---|---|
| §3.1.4 Definitions | "Magic link — a single-use, time-limited authentication URL delivered by email." | As PRD §2.13 above |
| FR-004 | "The system shall authenticate a user by email magic link, single-use and expiring 15 minutes after issue, permitting at most 5 link requests per email address per rolling hour." | "The system shall authenticate a user by email address and password. The password shall be at least 10 and at most 128 characters. The system shall never receive, log or store a plaintext password beyond the request that sets it." |
| FR-007 | "The system shall present the email magic-link control as the primary sign-in action; no third-party sign-in control appears anywhere in the funnel." | "The system shall present email and password as the only sign-in controls; no third-party sign-in control appears anywhere in the DOM or the visual hierarchy of any screen in the funnel." |
| ASM-02 | "Magic-link tokens are single-use and expire 15 minutes after issue; at most 5 links per email address per hour." | "Verification links are single-use and expire 24 hours after issue. Recovery links are single-use and expire 1 hour after issue. At most 5 emails of either kind per address per rolling hour." |
| SEC-01 | "The system shall authenticate users exclusively through Supabase Auth magic links or GitHub OAuth 2.0. No password credential shall be stored." | "The system shall authenticate users exclusively through Supabase Auth email-and-password credentials. Passwords are stored only as a salted hash by the authentication provider; PageCraft application code never handles, logs or persists a plaintext password." |
| SEC-02 | "Magic-link tokens shall be single-use, expire within 15 minutes, and be invalidated on consumption." | "Verification and recovery tokens shall be single-use, expire within 24 hours and 1 hour respectively, and be invalidated on consumption." |
| SEC-54 | "Magic-link issuance shall be rate limited per email address and per IP." | "Sign-in attempts, verification resends and password-reset requests shall each be rate limited per email address and per IP address, server-side and atomically." |
| ERR-02 | "Magic-link request rate exceeded" | "Sign-in attempt or authentication email rate exceeded" |
| ERR-03 | "Magic link expired or consumed" | "Verification or recovery link expired or consumed" |
| SEC-05 | *(unchanged)* | Unchanged, and now load-bearing. With a password door, sign-in failure must not distinguish "no such account" from "wrong password", and sign-up must not reveal that an address is already registered. |

### 4.3 UI Specification and wireframes

| Where | Superseded | Now reads |
|---|---|---|
| UI Spec §7.2 | "One job: let anyone in with just an email... There is no password and no other account to connect." | "One job: let anyone in with an email and a password. There is still no other account to connect, and there never was one." |
| UI Spec §7.2 element 2 | "Email me a link — we send a one-tap sign-in link to that address." | "Create account / Sign in — the person chooses a password on the way in and uses it from then on. 'Forgot your password?' sends a link to set a new one." |
| UI Spec — new | — | Two screens added: **Confirm your email** (holding state after sign-up, with a resend action) and **Set a new password** (where a recovery link lands). |
| Wireframes §6.1 | Screen inventory, screens 01–15 | Add 01a Confirm email, 01b Set new password. Both P0. |
| Wireframes screen 01, element 2 | "Email magic link. Passwordless; reaches the gallery in one click." | "Email and password. Sign-up asks for a password once and confirms it; sign-in asks for it back." |

### 4.4 Test cases

| Where | Superseded | Now reads |
|---|---|---|
| TC-008 | "Email magic-link sign-in — happy path" | "Email and password sign-up — happy path": a fresh address signs up, lands on the confirm screen, and the confirmation link produces a signed-in session |
| TC-009 | "Email control is the primary sign-in action" | "Email and password are the only sign-in controls": a DOM scan of every funnel screen finds no third-party control |
| TC-010 | "Magic link is single-use and expires in 15 min" | "Verification and recovery links are single-use": a consumed link returns the expired state; a recovery link older than one hour is rejected |
| TC-011 | "Magic-link issuance rate limit (5/email/hour)" | "Authentication email rate limit (5/address/hour)" plus a new sign-in attempt limit |
| TC-012 | *(unchanged)* | Still valid: an authenticated user can create, edit and save; only publish is gated |
| — new | — | **TC-008a** a password under 10 characters is rejected before any request is sent; **TC-008b** a full reset round trip signs the user in and invalidates the old password; **TC-008c** an unverified account cannot publish |

### 4.5 Schedules

| Where | Superseded | Now reads |
|---|---|---|
| R2 · D2 14:00 block | "Auth entry (email only) UI — magic link, sent / expired / resend states" (2 hours) | "Auth entry (email + password) — sign-up, sign-in, email verification, password reset" (14:00–18:00, 4 hours) |
| R2 · D2 16:00 block | "Templates (sourcing kickoff) — 3–4 total real templates" | Moved to D3 16:00, displacing "Intent → gallery flow" which folds into the D3 14:00 block |
| Adithya · D3 | "Email auth" | "Email and password auth: sign-up, sign-in, confirmation and recovery token handling, plus the attempt limiter (A-10)" |

## 5 · New requirements this amendment introduces

Three capabilities exist only because the credential changed. All three are P0 — the model is not shippable without them. Identifiers continue the A- sequence; A-3 and A-4 remain deliberate gaps per SRS §3.1.6.5.

| ID | Requirement | Pri | Acceptance criteria | Owner |
|---|---|---|---|---|
| **A-8** | Email verification. A user signs up with `email_verified = false` and confirms by following a single-use emailed link. | P0 | Publish is refused for an unverified account with a message that says what to do. A-7 account linking matches only on a verified address. A resend action exists and is rate limited. | E1 + E3 |
| **A-9** | Password reset by emailed single-use recovery link. | P0 | Requesting a reset always returns the same response whether or not the address exists (SEC-05). The link expires in one hour and works once. Setting a new password invalidates the old one and signs the user in. | E1 + E3 |
| **A-10** | Sign-in attempt rate limiting, per email address and per IP, server-side and atomic. | P0 | Repeated failed sign-ins from one address or one IP are refused with a message stating when to retry. Enforcement is in Upstash, never client-side, and fails closed (C-10, NFR-034). | E1 |

**A-8 is the one that cannot be quietly dropped.** A-7 links accounts on a *verified* email match. With a magic link, holding the inbox was the proof. With a password, anybody can register an address they do not control, and without A-8 the linking rule links the wrong people.

## 6 · Risks this amendment introduces

Added to the register in the format of Doc 21 (Likelihood × Impact).

| ID | Risk | Score | Owner | Mitigation | Contingency |
|---|---|---|---|---|---|
| **R-39** | Credential stuffing or brute force against the password door. A magic link had no secret to guess; a password does. | L3 × I4 = 12 · High | E1 | A-10 attempt limiting per address and per IP, atomic and fail-closed; provider-side limits as the interim stopgap | Lock the door to a fixed retry window and alert the operator |
| **R-40** | Unverified accounts. Somebody registers an address they do not own, and A-7 later links a real user to that row. | L2 × I4 = 8 · Medium | E1 + E3 | A-8 verification gate before publish; `email_verified` checked at the linking path, not just the UI | Refuse linking on any unverified address; manual reconciliation |
| **R-41** | Added funnel friction pushes publish rate below the 40% directional bar, and no baseline exists to prove it either way (OQ-2 is open). | L3 × I3 = 9 · Medium | Product | Instrument `EV-02 signin_started` and `EV-03 signin_completed` with the drop-off between them; review after the first cohort | If cohort one shows a sign-up drop-off materially worse than the sector norm, add a magic-link fallback on the same account — Supabase supports both credentials on one user, so this is additive, not a rewrite |

## 7 · Sign-off

PRD §2.6 requires written sign-off from both parties named below. Until both are recorded, the magic-link requirement remains in force and the current implementation is a known deviation from the baseline, not an approved one.

| Role | Name | Decision | Date |
|---|---|---|---|
| Technical Lead (E1) | Adithya | ☐ Approved ☐ Rejected | |
| Product Owner | | ☐ Approved ☐ Rejected | |

**On approval, the following must be updated before the day-19 freeze**, or the pack contradicts the code — which is exactly the condition the v2.0 and v2.1 errata were issued to clean up:

- [ ] PRD §2.6, §2.6.1, §2.6.2, §2.7.1, §2.8.1 (A-1), §2.12 item 8, §2.13
- [ ] SRS §3.1.4, FR-004, FR-007, ASM-02, SEC-01, SEC-02, SEC-54, ERR-02, ERR-03
- [ ] SRS Appendix A traceability matrix — A-8, A-9, A-10 added and mapped
- [ ] UI Spec §7.2 and the two new screens; Wireframes §6.1 inventory and screen 01
- [ ] Test cases TC-008 through TC-011, plus TC-008a/b/c
- [ ] Risk register — R-39, R-40, R-41
- [ ] R2 and Adithya role schedules

## 8 · Not changed, and why

- **Everything in Amendment A1.** No third-party developer account appears anywhere in the funnel; publishing is platform-managed onto a pagecraft.in subdomain; the publish entitlement gates going live. A2 touches the credential, nothing else.
- **A-5, A-6, A-7.** Publish entitlement, automatic resume after payment, and account linking on verified email all stand. A-8 is what makes A-7 honest rather than a change to it.
- **SEC-05.** Unchanged in wording and more important than before. It was easy to satisfy with one field and one response; with sign-up, sign-in and reset it has three places to leak from.
- **The `users` table.** `email_verified` already exists and already defaults false. No migration is required by this amendment.
- **The primary metric and its target.** Publish rate stays at ≥40% within seven days as a directional bar. A2 does not get to move the goalposts it might miss; R-41 is how that gets found out.
