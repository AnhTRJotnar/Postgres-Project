# Decisions

Why the project is built the way it is. Add an entry when a choice is hard to reverse or would surprise someone new. Don't edit old entries; add a new one that replaces them.

Format: **context** (the problem) → **decision** → **consequences** (what it costs and what follows).

---

## D1. Local-first MVP; the backend never blocks the app
*2026-10-02. Replaced by D13.*

**Context.** The goal is a working reader for casual users quickly. A backend dependency would make every app feature wait for server work and fail without a network.

**Decision.** The app stores PDFs and metadata on the phone and works offline. The backend is built in parallel and later receives a copy for sync. Accounts, cloud sync, OCR and AI come after the MVP.

**Consequences.** App API calls must be background work that fails quietly. The server copy is not the source of truth for reading.

## D2. Android first, tested on the emulator
*2026-10-06, updated 2026-10-07. The API address is replaced by D16.*

**Context.** The original plan was iPhone-first. Both developers use Windows, where iOS builds need a Mac. Neither has an Android phone.

**Decision.** Build and test on Android first, on the Android Emulator. The emulator reaches the PC's API at `http://10.0.2.2:3000`.

**Consequences.** No LAN or firewall setup is needed. App builds must allow cleartext HTTP for development. iPhone comes later.

## D3. One repository with npm workspaces and a shared contract
*2026-10-06*

**Context.** The app and API describe the same records. In an earlier project, mismatched field names between frontend and backend forced defensive code like `m?.titleid || m?.id`, and missing backend fields were found late.

**Decision.** One repository with npm workspaces (`apps/*`, `packages/*`), one root install and lockfile. The contract lives in `packages/shared` and both apps depend on it. The contract was written before the screens and endpoints.

**Consequences.** Install from the root only. Contract changes touch both sides in one change (see [WORKFLOW.md](WORKFLOW.md)).

## D4. Document ids are UUIDs created on the phone
*2026-10-06*

**Context.** Offline-first means a document exists on the phone before the server knows about it.

**Decision.** The app creates ids with `Crypto.randomUUID()` (UUID v4). The server stores documents under that id (`PUT /documents/:id`) and rejects ids that are not UUIDs.

**Consequences.** The same id works on both sides; no id mapping during sync. Registering is idempotent, so it can be retried freely.

## D5. API data rules
*2026-10-06*

**Context.** Small inconsistencies (`null` vs missing, extra fields, partial updates) cause the bugs that contracts are meant to prevent.

**Decision.**
- Empty optional fields are **omitted** from responses, never `null`; dates are ISO 8601 strings.
- Request bodies are **strict**: unknown fields are rejected with `400`.
- `PUT` **replaces** the record: omitted optional fields are cleared.
- Every validation error has the same shape, `{ error, issues: [{ path, message }] }`, listing all problems at once.

**Consequences.** Typos fail loudly instead of being ignored. Clients must always send the full object on `PUT`.

## D6. Server-side pagination for documents, none for bookmarks
*2026-10-06*

**Context.** In an earlier project the client loaded full lists and paginated in memory, which does not scale.

**Decision.** `GET /documents` pages in the database (`skip`/`take`, max 100 per page, newest first). Bookmarks are listed per document without pagination.

**Consequences.** A document has dozens of bookmarks at most, so a full list is fine. Revisit if that stops being true.

## D7. Exact-position fields, all optional
*2026-10-06*

**Context.** PDFs (especially scanned ones) have no reliable line numbers, so "exact position" needs page geometry, not just a page number.

**Decision.** A position stores page, progress and mode (required) plus scroll offset, page coordinates, zoom and a text snippet (optional). One position per document, saved with an upsert; bookmarks use the same fields.

**Consequences.** Viewers can send whatever they can measure, and the API accepts a better viewer later without a migration.

## D8. `react-native-pdf` as the viewer; page-level precision accepted
*2026-10-07*

**Context.** The viewer decides which position fields the app can fill. `react-native-pdf` reports page, page count and zoom, but not scroll offset or page coordinates, and cannot extract text.

**Decision.** Use `react-native-pdf` (7.0.1+, which supports Android 16 KB page sizes) for the MVP. Send `pageNumber`, `progressPercent`, `readingMode`, `zoomScale`; leave the rest out.

**Consequences.** Restore is exact per page in book mode and lands at the top of the saved page in scroll mode. If that bothers users, consider a viewer that reports scroll offset (e.g. pdf.js in a WebView) — the API already supports it. Requires EAS builds; no Expo Go.

## D9. Deleting a document cascades in the database
*2026-10-07*

**Context.** A deleted document must not leave its reading position and bookmarks behind.

**Decision.** The foreign keys use `ON DELETE CASCADE`; `DELETE /documents/:id` removes one row and PostgreSQL removes the rest. A delete of a missing document returns `404`, which the app treats as "already deleted".

**Consequences.** No cleanup code in the API. Retried deletes are harmless.

## D10. Prisma 7 with the `pg` driver adapter
*2026-10-04*

**Context.** Prisma 7 requires a driver adapter and a config file.

**Decision.** `@prisma/adapter-pg` with one shared `PrismaClient` (`src/db/prisma.ts`). The generated client lives in `apps/api/generated/` and is not committed. The config file is `prisma7.config.ts`.

**Consequences.** Run `prisma generate` after cloning and after schema changes. Because the config file has a non-default name, every Prisma command needs `--config prisma7.config.ts`.

## D11. No authentication yet; local only
*2026-10-06. Replaced by D14 once accounts are built.*

**Context.** The MVP has no accounts, and the API only serves a developer's own emulator.

**Decision.** No auth, no HTTPS. The API listens on `127.0.0.1`.

**Consequences.** Not deployable as-is. Accounts, auth and HTTPS come with real sync.

## D12. Bookmark ids are also made on the phone
*2026-10-07*

**Context.** Bookmarks are created offline first. With `POST` and a server-made id, the phone's id and the server's id differ, so a sync `DELETE` misses, and a retried `POST` creates a duplicate.

**Decision.** Same rule as D4: the app makes the id, and the API saves it with `PUT /documents/:id/bookmarks/:bookmarkId` (201 created, 200 replaced). `POST /documents/:id/bookmarks` is removed. A bookmark never moves between documents (409).

**Consequences.** Every bookmark write is safe to retry. Deleting by the phone's id works on the server too.

## D13. Online-first: the server holds the library, the phone keeps a cache
*2026-10-08. Replaces D1.*

**Context.** D1 was written from the original brief. The team wants one library across devices, accounts, and server features (AI, reflow) that need the PDF on the server. That only works if the server is the source of truth. A strictly online app was rejected because people read without signal (planes, subway, abroad).

**Decision.** The server is the source of truth for documents, positions and bookmarks. The app loads the library from the API and sends every change to it. Books already downloaded to the phone stay readable offline, and changes made offline are sent when the connection returns. PDF files are uploaded to the server so the library appears on other devices.

**Consequences.**
- New work: accounts and auth (D14), PDF upload and download with file storage, and later hosting with HTTPS.
- The repositories stay the only place screens call. Inside, the order changes from "save locally, then send" to "API first, then cache".
- Phone-made ids (D4, D12) and safe-to-repeat `PUT`s still matter: requests on a bad connection get retried.
- Sync conflicts mostly go away because the server decides, but saves made offline still need a rule for stale writes.

## D14. Two login methods, one set of tokens
*2026-10-08. Replaces D11 once accounts are built.*

**Context.** Online-first needs accounts: a library only exists for a user. The team wants both email + password and Google sign-in.

**Decision.** Both methods are ways to prove who you are, and both end in **our** tokens. The rest of the API only checks those tokens and never knows which method was used.
- **Tables:** `User` (email unique and lowercased, `passwordHash` empty for Google-only users), `AuthProvider` (links a Google account to a user by Google's user id), `RefreshToken` (stored as a hash, with expiry and revocation). `Document` gets a `userId`, and every query filters by it.
- **Tokens:** a JWT access token valid for about 15 minutes, sent as `Authorization: Bearer ...`. A random refresh token valid for about 30 days, replaced on every refresh. On the phone both live in `expo-secure-store`, never AsyncStorage.
- **Email + password:** argon2id (`@node-rs/argon2`), at least 8 characters, no composition rules. Failed logins always say "Invalid email or password". `/auth/login` and `/auth/register` are rate limited.
- **Google:** the app gets an ID token from native Google sign-in and sends it to `POST /auth/google`. The server checks it with `google-auth-library` (`verifyIdToken`). If the email already has a password account and Google marks it verified, the Google login is linked to that user instead of creating a duplicate.

**Consequences.**
- `JWT_SECRET` and `GOOGLE_WEB_CLIENT_ID` are new secrets in `apps/api/.env`. Tokens are never logged.
- Google needs setup outside the code: a Google Cloud project, an OAuth consent screen, a Web client id (for the server check) and an Android client id (with the SHA-1 of the EAS signing key). The native Google package needs a new EAS build.
- Email verification and "forgot password" need an email service and come later.
- An iPhone app that offers Google sign-in must also offer Sign in with Apple. `AuthProvider` takes that as one more provider.
- Documents created before accounts have no owner and must be removed or assigned when `userId` is added.

## D15. Security baseline for accounts
*2026-10-08. Replaces the 8-character minimum in D14.*

**Context.** With accounts, the server holds passwords and every user's library. The team made security the first priority. D14 said "at least 8 characters", which is outdated: NIST SP 800-63B rev. 4 requires at least 15 when a password is the only login factor.

**Decision.**
- **Passwords:** 15–128 characters, any characters, no composition rules. NFKC-normalized, then hashed with argon2id at the OWASP minimum (19 MiB, 2 passes, 1 thread), with the parameters written out in code.
- **No account probing:** login gives one answer for an unknown email, a wrong password and a Google-only account, and takes the same time for each (an unknown email is checked against a dummy hash).
- **Access tokens:** HS256 only, issuer and audience checked, 15 minutes. `JWT_SECRET` must be at least 43 characters, and the server refuses to start without it. There is no default secret.
- **Refresh tokens:** 32 random bytes, stored as SHA-256, used once (revoked in the same statement that checks them). Reusing one ends every session of that user.
- **Rate limits** on register, login (per address **and** per email), refresh and logout.
- **Errors:** unexpected errors return a generic `500`; details go only to the server log. Passwords and tokens are never logged or echoed.
- **Dependencies:** security libraries are pinned to exact versions that are at least two weeks old.

**Consequences.**
- The app must never send two refreshes at once, or the user gets logged out everywhere.
- Register still reveals whether an email exists (`409`). Hiding that needs email verification.
- Not yet done: a check against leaked passwords (NIST asks for one), Redis-backed rate limits for more than one server, deleting expired refresh tokens, HTTPS and `trustProxy` at deployment.

## D16. The app reaches the API at `127.0.0.1` through `adb reverse`
*2026-10-09. Replaces the API address in D2.*

**Context.** D2 used `10.0.2.2`, the emulator's fixed address for the PC. Khanh tests on Linux with `adb reverse`, which forwards a port on the device to the same port on the PC. That works for the emulator **and** a USB-connected phone, while `10.0.2.2` only works on the emulator.

**Decision.** The app calls `http://127.0.0.1:3000` (`apps/mobile/src/shared/api/client.ts`). Start the app with `npm run run:android -w apps/mobile`, which runs `adb reverse tcp:3000 tcp:3000` and `adb reverse tcp:8081 tcp:8081` (Metro) before `expo run:android`.

**Consequences.**
- `adb reverse` resets when the emulator or phone restarts or reconnects. Without it, every API call fails quietly; run the script again (or the two `adb reverse` commands).
- An APK installed without `adb` attached (for example an EAS build shared with a tester) can't reach the API. Real testers need a deployed API with HTTPS and a configurable address, such as an `EXPO_PUBLIC_API_URL` setting.
