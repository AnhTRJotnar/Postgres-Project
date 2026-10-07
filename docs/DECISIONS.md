# Decisions

Why the project is built the way it is. Add an entry when a choice is hard to reverse or would surprise someone new. Don't edit old entries; add a new one that replaces them.

Format: **context** (the problem) → **decision** → **consequences** (what it costs and what follows).

---

## D1. Local-first MVP; the backend never blocks the app
*2026-10-02*

**Context.** The goal is a working reader for casual users quickly. A backend dependency would make every app feature wait for server work and fail without a network.

**Decision.** The app stores PDFs and metadata on the phone and works offline. The backend is built in parallel and later receives a copy for sync. Accounts, cloud sync, OCR and AI come after the MVP.

**Consequences.** App API calls must be background work that fails quietly. The server copy is not the source of truth for reading.

## D2. Android first, tested on the emulator
*2026-10-06, updated 2026-10-07*

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
*2026-10-06*

**Context.** The MVP has no accounts, and the API only serves a developer's own emulator.

**Decision.** No auth, no HTTPS. The API listens on `127.0.0.1`.

**Consequences.** Not deployable as-is. Accounts, auth and HTTPS come with real sync.
