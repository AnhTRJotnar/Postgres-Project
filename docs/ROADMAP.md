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
| 5 | Real PDF viewer | Khanh | ⬜ | `react-native-pdf` 7.0.1+ chosen; needs a new EAS build |
| 6 | Book mode and scroll mode | Khanh | ⬜ | `enablePaging` + `horizontal` for book mode |
| 7 | Save reading position locally | Anh + Khanh | ⬜ | Anh: `readingPositionRepository`; Khanh: reader calls it with page, progress, mode, zoom |
| 8 | Restore reading position | Khanh | ⬜ | Exact page; scroll mode lands at the top of the page |
| 9 | Position bookmarks | Anh + Khanh | ⬜ | Anh: `bookmarkRepository` + Bookmarks screen; Khanh: "add bookmark" in the reader. API ready |
| 10 | Dark mode | Khanh | ⬜ | `app.json` still has `userInterfaceStyle: "light"` |
| 11 | Backend PostgreSQL setup | Anh | ✅ | PostgreSQL 17 in Docker, Prisma 7 |
| 12 | API endpoints | Anh | ✅ | 11 endpoints, see [API.md](API.md) |
| 13 | Sync | Anh | 🔨 | Server side ready; app client on `khanh` needs fixes, then Anh owns it |
| 14 | AI features | | ⬜ | After the MVP |

## Done: backend

- PostgreSQL in Docker, Prisma schema and first migration
- Documents: list (paginated), get, register/update (`PUT`), delete (cascades)
- Reading position: get, save (upsert)
- Bookmarks: list, create, delete
- UUID validation on all ids, strict request bodies, one error format
- npm workspaces with the shared contract in `packages/shared`
- `.env.example` files, setup guide, API reference
- Automated API tests: 14 tests, `npm test -w apps/api`

## Next

**Khanh (reading experience)**
1. On `khanh`: leave `id` out of the `PUT /documents/:id` body and remove `"jsx": "react"` from `tsconfig.json`; merge `main` into `khanh`, then merge `khanh` into `main`. After that, `src/shared/api/` belongs to Anh.
2. `react-native-pdf` reader with book and scroll modes.
3. Save and restore the position through `readingPositionRepository` (from Anh).
4. Allow cleartext HTTP for development builds (`expo-build-properties`).
5. Store `pageCount` from `onLoadComplete` on the document.
6. Fix the `alpha` release notes and move the tag to the `main` commit with the EAS config.
7. Dark mode.

**Anh (app data, sync, backend)**
1. `readingPositionRepository` and `bookmarkRepository` (AsyncStorage) — unblocks Khanh's step 3.
2. Sync service: register documents at app start, then positions, bookmarks and deletes in the background; request timeouts.
3. Bookmarks screen and Settings screen.
4. API: generic message on unexpected `500` errors instead of internal details.
5. API: use the shared types for responses and derive input types from the Zod schemas.

## Known gaps

- No automated tests for the app.
- Unexpected `500` errors include internal details (Prisma messages, file paths) in the response.
- No authentication or HTTPS; the API listens on `127.0.0.1` only.
- Scroll-mode restore is page-level with `react-native-pdf`.
- No way to edit a bookmark label (delete and recreate).
- No sync conflict handling beyond "last write wins".

## After the MVP

- Sync across devices, with accounts
- OCR for scanned PDFs (Python/FastAPI service)
- Ask questions about a PDF and get answers with page numbers, quotes and jump-to-source links (embeddings, pgvector)
- iPhone build
