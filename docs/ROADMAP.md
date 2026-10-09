# Roadmap

Status of the MVP and what comes after. Update this file when a step is finished.

Legend: ✅ done · 🔨 in progress / partly done · ⬜ not started

## First milestone

> A user can import a PDF, see it in the library, open it, close the app, reopen it, and continue from the same place.

| Part | Status | Notes |
|---|---|---|
| Import a PDF, see it in the library | ✅ | Verified on the emulator with the `alpha` APK (2026-10-07) |
| Library survives closing and reopening the app | ✅ | Same test |
| Open it in a reader | ✅ | `react-native-pdf` (Khanh, 2026-10-08) |
| Continue from the same place | ✅ | Same page after reopening (Khanh's test, 2026-10-09). Page-level, see Step 8 |

## MVP steps

| # | Step | Owner | Status | Notes |
|---|---|---|---|---|
| 1 | Mobile app shell | Khanh | ✅ | Expo 57, React Navigation stack |
| 2 | Local PDF import | Khanh | ✅ | Picker, copy into app storage, MD5 duplicate check |
| 3 | Local library | Khanh | ✅ | AsyncStorage |
| 4 | Reader placeholder | Khanh | ✅ | |
| 5 | Real PDF viewer | Khanh | ✅ | `react-native-pdf` 7.0.5 with a development build (`eas.json` profile `development`), 2026-10-08 |
| 6 | Book mode and scroll mode | Khanh | ⬜ | `enablePaging` + `horizontal` for book mode |
| 7 | Save reading position locally | Anh + Khanh | ✅ | Saved on every page change, then sent to the API (2026-10-09). Mode is always `book` and zoom isn't saved yet |
| 8 | Restore reading position | Khanh | ✅ | Local position first, else the API's. Exact page; scroll mode lands at the top of the page |
| 9 | Position bookmarks | Anh + Khanh | ✅ | Anh: `bookmarkRepository`. Khanh: "Bookmark" button in the reader, Bookmarks screen (list, open at the page, delete), sent to the API (2026-10-09) |
| 10 | Dark mode | Khanh | ⬜ | `app.json` still has `userInterfaceStyle: "light"` |
| 11 | Backend PostgreSQL setup | Anh | ✅ | PostgreSQL 17 in Docker, Prisma 7 |
| 12 | API endpoints | Anh | ✅ | 11 endpoints, see [API.md](API.md). Bookmarks saved with `PUT` under the phone's id |
| 13 | Sync | Anh | 🔨 | App sends documents, positions and bookmarks in the background. Replaced by the online-first plan below (D13) |
| 14 | AI features | | ⬜ | After the MVP |

## Online-first and accounts

The switch from offline-first to online-first (D13) with email + password and Google login (D14). Step numbers continue Anh's build log, where Steps 15–19 were the app repositories, bookmarks with `PUT`, and the `thumbnailUri` cleanup migration.

| # | Step | Owner | Status | Notes |
|---|---|---|---|---|
| 20 | Schema: `User`, `AuthProvider`, `RefreshToken` | Anh | ✅ | 2026-10-08. Nothing uses them yet. `Document.userId` moved to Step 22 so the API keeps working in between |
| 21 | Email + password: register, login, refresh, logout, `GET /me` | Anh | ✅ | 2026-10-08. argon2id, one-use refresh tokens, rate limits, 15 tests (D15) |
| 21b | Reject leaked passwords at registration (Have I Been Pwned range API) | Anh | ⬜ | NIST asks for it; only the first 5 characters of a SHA-1 hash leave the server |
| 22 | Protect all existing routes; `Document.userId` | Anh | ⬜ | Every query filters by the logged-in user; update the tests. The migration deletes the 3 ownerless test documents (agreed 2026-10-08) |
| 23 | Google on the server: Cloud setup, `POST /auth/google` | Anh | ⬜ | Web and Android client ids |
| 24 | App: login and register screen, tokens in `expo-secure-store`, `apiRequest` adds the token and refreshes on `401` | Anh | ⬜ | |
| 24b | App: native Google sign-in package, `app.json`, new EAS build | Khanh | ⬜ | Needs the Android client id from Step 23 |
| 25 | PDF upload and download | Anh | ⬜ | File storage on disk first, size limit, `fileHash` duplicate check |
| | Deployment with HTTPS | | ⬜ | When there are real testers |

## Done: backend

- PostgreSQL in Docker, Prisma schema and migrations
- Documents: list (paginated), get, register/update (`PUT`), delete (cascades)
- Reading position: get, save (upsert)
- Bookmarks: list, save (`PUT` under the phone's id, safe to repeat), delete
- UUID validation on all ids, strict request bodies, one error format
- npm workspaces with the shared contract in `packages/shared`
- `.env.example` files, setup guide, API reference
- Automated API tests: 32 tests, `npm test -w apps/api`
- Accounts: register, login, refresh, logout, `GET /me` (D15). Generic `500` errors without internal details

## Done: app data (Anh)

- `readingPositionRepository` and `bookmarkRepository` (AsyncStorage, phone-made UUIDs)
- Document registration fixed (`id` and device-only fields left out of the body)

## Next

**Khanh (reading experience)**
1. Book and scroll modes in the reader, and save the real `readingMode` (positions and bookmarks are always `book` now).
2. Send the position to the API at most about once a second (now every page change sends a `PUT`), and save `zoomScale`.
3. Store `pageCount` from `onLoadComplete` on the document.
4. Allow cleartext HTTP for development builds (`expo-build-properties`).
5. Remove or generalize the `build:local` script (it has a Linux home path and fish-shell commands).
6. Fix the `alpha` release notes and move the tag to the `main` commit with the EAS config.
7. Dark mode.

Branch rules (see [WORKFLOW.md](WORKFLOW.md)): update `khanh` with `git merge main`, not rebase, and merge into `main` only after the step is checked.

**Anh (app data, sync, backend)**
1. Steps 21b–25 above; next is Step 22 (login checks on every route).
2. Settings screen. (Khanh built the Bookmarks screen; its sync issues are fixed in Step 24.)
3. API: use the shared types for responses and derive input types from the Zod schemas.

## Known gaps

- No automated tests for the app.
- Document, position and bookmark routes don't check login yet (Step 22). No HTTPS; the API listens on `127.0.0.1` only.
- Register reveals whether an email has an account (`409`); hiding it needs email verification.
- No check against leaked passwords yet (Step 21b).
- Rate limits are in memory: they reset on restart, remember 5,000 keys per limit and only work with one server. Move to Redis at deployment, and set `trustProxy` behind a proxy.
- Expired and revoked refresh tokens are never deleted; needs a cleanup job.
- `npm audit` reports issues in build tools (Expo, Metro, Prisma CLI); none in code the API runs. Recheck when upgrading Expo.
- Scroll-mode restore is page-level with `react-native-pdf`.
- No way to edit a bookmark label (delete and recreate).
- No sync conflict handling beyond "last write wins".
- The app still works offline-first: it saves on the phone, then sends documents, positions and bookmarks in the background. The reader and bookmarks screens call the API directly instead of through the repositories (moves in Step 24).
- The Bookmarks screen re-sends every bookmark to the API each time it opens. A bookmark whose API delete failed (for example offline) can reappear once the phone has no bookmarks left for that book, because the screen then shows the server's list.
- The app reaches the API only through `adb reverse` (D16). An APK installed without `adb` can't reach it.
- No email verification or "forgot password" planned for the first version of accounts.

## After the MVP

- Email verification and "forgot password" (need an email service)
- Sign in with Apple (required on iPhone when Google sign-in is offered)
- OCR for scanned PDFs (Python/FastAPI service)
- Ask questions about a PDF and get answers with page numbers, quotes and jump-to-source links (embeddings, pgvector)
- iPhone build
