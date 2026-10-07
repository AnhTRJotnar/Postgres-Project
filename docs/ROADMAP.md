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
| 7 | Save reading position locally | Khanh | ⬜ | Page, progress, mode, zoom |
| 8 | Restore reading position | Khanh | ⬜ | Exact page; scroll mode lands at the top of the page |
| 9 | Position bookmarks | Khanh | ⬜ | API ready |
| 10 | Dark mode | Khanh | ⬜ | `app.json` still has `userInterfaceStyle: "light"` |
| 11 | Backend PostgreSQL setup | Anh | ✅ | PostgreSQL 17 in Docker, Prisma 7 |
| 12 | API endpoints | Anh | ✅ | 11 endpoints, see [API.md](API.md) |
| 13 | Sync | Both | 🔨 | Server side ready; app does not call the API yet |
| 14 | AI features | | ⬜ | After the MVP |

## Done: backend

- PostgreSQL in Docker, Prisma schema and first migration
- Documents: list (paginated), get, register/update (`PUT`), delete (cascades)
- Reading position: get, save (upsert)
- Bookmarks: list, create, delete
- UUID validation on all ids, strict request bodies, one error format
- npm workspaces with the shared contract in `packages/shared`
- `.env.example` files, setup guide, API reference

## Next

**Khanh (app)**
1. Merge `main` into `khanh`, run `npm ci` from the root.
2. `react-native-pdf` reader with book and scroll modes; save and restore the position locally.
3. Allow cleartext HTTP for development builds (`expo-build-properties`).
4. API client: `PUT /documents/:id` after import and on app start; failures ignored.
5. Store `pageCount` from `onLoadComplete` on the document.
6. Fix the `alpha` release notes and move the tag to the `main` commit with the EAS config.

**Anh (backend)**
1. Review Khanh's reader and API client against [API.md](API.md).
2. Automated API tests (currently checked by hand).

## Known gaps

- No automated tests.
- No authentication or HTTPS; the API listens on `127.0.0.1` only.
- Scroll-mode restore is page-level with `react-native-pdf`.
- No way to edit a bookmark label (delete and recreate).
- No sync conflict handling beyond "last write wins".

## After the MVP

- Sync across devices, with accounts
- OCR for scanned PDFs (Python/FastAPI service)
- Ask questions about a PDF and get answers with page numbers, quotes and jump-to-source links (embeddings, pgvector)
- iPhone build
