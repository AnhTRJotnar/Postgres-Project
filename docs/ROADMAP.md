# Roadmap

Status of the MVP and what comes after. Update this file when a step is finished.

Legend: ✅ done · 🔨 in progress / partly done · ⬜ not started

## First milestone

> A user can import a PDF, see it in the library, open it, close the app, reopen it, and continue from the same place.

| Part | Status | Notes |
|---|---|---|
| Import a PDF, see it in the library | ✅ | Verified on the emulator with the `alpha` APK (2026-10-07) |
| Library survives closing and reopening the app | ✅ | Same test |
| Open it in a reader | ⬜ | Reader is a placeholder |
| Continue from the same place | ⬜ | Needs the viewer and local position saving |

## MVP steps

| # | Step | Owner | Status | Notes |
|---|---|---|---|---|
| 1 | Mobile app shell | Khanh | ✅ | Expo 57, React Navigation stack |
| 2 | Local PDF import | Khanh | ✅ | Picker, copy into app storage, MD5 duplicate check |
| 3 | Local library | Khanh | ✅ | AsyncStorage |
| 4 | Reader placeholder | Khanh | ✅ | |
| 5 | Real PDF viewer | Khanh | ✅ | `react-native-pdf` 7.0.5 with a development build (`eas.json` profile `development`), 2026-10-08 |
| 6 | Book mode and scroll mode | Khanh | ⬜ | `enablePaging` + `horizontal` for book mode |
| 7 | Save reading position locally | Anh + Khanh | 🔨 | Anh: `readingPositionRepository` ✅; Khanh: reader calls it with page, progress, mode, zoom |
| 8 | Restore reading position | Khanh | ⬜ | Exact page; scroll mode lands at the top of the page |
| 9 | Position bookmarks | Anh + Khanh | 🔨 | Anh: `bookmarkRepository` ✅, Bookmarks screen; Khanh: "add bookmark" in the reader. API ready |
| 10 | Dark mode | Khanh | ⬜ | `app.json` still has `userInterfaceStyle: "light"` |
| 11 | Backend PostgreSQL setup | Anh | ✅ | PostgreSQL 17 in Docker, Prisma 7 |
| 12 | API endpoints | Anh | ✅ | 11 endpoints, see [API.md](API.md). Bookmarks saved with `PUT` under the phone's id |
| 13 | Sync | Anh | 🔨 | App registers documents. Replaced by the online-first plan below (D13) |
| 14 | AI features | | ⬜ | After the MVP |

## Online-first and accounts

The switch from offline-first to online-first (D13) with email + password and Google login (D14). Step numbers continue Anh's build log, where Steps 15–19 were the app repositories, bookmarks with `PUT`, and the `thumbnailUri` cleanup migration.

| # | Step | Owner | Status | Notes |
|---|---|---|---|---|
| 20 | Schema: `User`, `AuthProvider`, `RefreshToken`, `Document.userId` | Anh | ⬜ | The 3 test documents have no owner; decide whether to delete them in the migration |
| 21 | Email + password: register, login, refresh, logout, `GET /me` | Anh | ⬜ | argon2id, rate limits, tests |
| 22 | Protect all existing routes | Anh | ⬜ | Every query filters by the logged-in user; update the tests |
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
- Automated API tests: 17 tests, `npm test -w apps/api`

## Done: app data (Anh)

- `readingPositionRepository` and `bookmarkRepository` (AsyncStorage, phone-made UUIDs)
- Document registration fixed (`id` and device-only fields left out of the body)

## Next

**Khanh (reading experience)**
1. Merge `main` into `khanh`. `src/shared/api/` belongs to Anh now.
2. Book and scroll modes in the reader.
3. Save and restore the position through `readingPositionRepository`; "add bookmark" through `bookmarkRepository.addBookmark`.
4. Allow cleartext HTTP for development builds (`expo-build-properties`).
5. Store `pageCount` from `onLoadComplete` on the document.
6. Fix the `alpha` release notes and move the tag to the `main` commit with the EAS config.
7. Dark mode.

**Anh (app data, sync, backend)**
1. Steps 20–25 above, starting with the account schema.
2. Bookmarks screen and Settings screen.
3. API: generic message on unexpected `500` errors instead of internal details.
4. API: use the shared types for responses and derive input types from the Zod schemas.

## Known gaps

- No automated tests for the app.
- Unexpected `500` errors include internal details (Prisma messages, file paths) in the response.
- No authentication or HTTPS; the API listens on `127.0.0.1` only.
- Scroll-mode restore is page-level with `react-native-pdf`.
- No way to edit a bookmark label (delete and recreate).
- No sync conflict handling beyond "last write wins".
- The app still works offline-first; it only registers documents with the API.
- No email verification or "forgot password" planned for the first version of accounts.

## After the MVP

- Email verification and "forgot password" (need an email service)
- Sign in with Apple (required on iPhone when Google sign-in is offered)
- OCR for scanned PDFs (Python/FastAPI service)
- Ask questions about a PDF and get answers with page numbers, quotes and jump-to-source links (embeddings, pgvector)
- iPhone build
