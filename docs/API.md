# API reference

Backend for the Kindle-style PDF reader: `apps/api` (Fastify + Prisma + PostgreSQL).
To run it locally, see **Run the API locally** in the root `README.md`.

All examples below are real responses from the running API.

## Basics

| | |
|---|---|
| Base URL (same PC) | `http://127.0.0.1:3000` |
| Base URL (Android emulator) | `http://10.0.2.2:3000` (the emulator's address for the PC it runs on) |
| Format | JSON in, JSON out. Send `Content-Type: application/json` with every body. |
| Ids | UUID v4, created **on the phone** (`Crypto.randomUUID()`). The server keeps the phone's id. |
| Dates | ISO 8601 strings in UTC, e.g. `2026-10-06T10:00:00.000Z` (what `new Date().toISOString()` returns). |
| Empty optional fields | Left out of responses, never `null`. |
| Unknown fields in a body | Rejected with `400` (catches typos like `scrollOffset` instead of `scrollOffsetY`). |
| `PUT` bodies | Replace the whole record: an optional field you leave out is **cleared**. Always send the full object. |
| Auth | None yet. Local development only. |

Trying a request from PowerShell:

```powershell
Invoke-RestMethod "http://127.0.0.1:3000/health/db"

Invoke-RestMethod -Method Put -Uri "http://127.0.0.1:3000/documents/<uuid>/reading-position" `
  -ContentType "application/json" `
  -Body '{"pageNumber":42,"progressPercent":16.8,"readingMode":"book"}'
```

## Errors

**Validation errors (`400`)** list every problem at once. `path` is the field name, or `""` when the problem is the body as a whole (e.g. an unknown key):

```json
{
  "error": "Invalid reading position",
  "issues": [
    { "path": "readingMode", "message": "Invalid option: expected one of \"book\"|\"scroll\"" }
  ]
}
```

```json
{
  "error": "Invalid document",
  "issues": [{ "path": "", "message": "Unrecognized key: \"localUri\"" }]
}
```

**Not found (`404`)**:

```json
{ "error": "Document not found" }
```

**Framework errors** come from Fastify itself and have a different shape. You only see them for malformed requests:

| Case | Status | Body |
|---|---|---|
| Body is not valid JSON | `400` | `{"statusCode":400,"code":"FST_ERR_CTP_INVALID_JSON_BODY","error":"Bad Request","message":"Body is not valid JSON but content-type is set to 'application/json'"}` |
| Route does not exist | `404` | `{"message":"Route GET:/nope not found","error":"Not Found","statusCode":404}` |

---

## Health

### `GET /health`

The API process is running. Does not touch the database.

`200`
```json
{ "status": "ok", "service": "kindle-pdf-reader-api" }
```

### `GET /health/db`

The API can reach PostgreSQL.

| Status | Body |
|---|---|
| `200` | `{"status":"ok","database":"reachable"}` |
| `503` | `{"status":"error","database":"unreachable"}` |

---

## Documents

A document's metadata. The PDF file itself stays on the phone and is never uploaded.

**Document object**

| Field | Type | Always present | Notes |
|---|---|---|---|
| `id` | UUID | yes | The phone's id |
| `title` | string | yes | |
| `originalFileName` | string | yes | |
| `fileHash` | string | no | MD5 of the file, used for duplicate detection |
| `fileSize` | integer | no | Bytes |
| `pageCount` | integer | no | |
| `dateAdded` | ISO date | yes | When the PDF was imported on the phone |
| `lastOpenedAt` | ISO date | no | |
| `isFavorite` | boolean | yes | |
| `isFinished` | boolean | yes | |

`localUri` and `thumbnailUri` from the app's `LocalDocument` are device-only file paths and do not exist on the server.

### `GET /documents`

Lists documents, newest `dateAdded` first. Paginated on the server.

| Query | Type | Default | Rules |
|---|---|---|---|
| `page` | integer | `1` | ≥ 1 |
| `pageSize` | integer | `10` | 1–100 |

A `page` past the end returns `items: []` with the correct `total`.

`GET /documents?page=1&pageSize=2` → `200`
```json
{
  "items": [
    {
      "id": "3e927daa-33d0-4fb6-b940-86025b437aeb",
      "title": "Test Book Two",
      "originalFileName": "test-two.pdf",
      "dateAdded": "2026-10-06T12:03:26.315Z",
      "isFavorite": false,
      "isFinished": false
    },
    {
      "id": "3d23972a-929e-49c7-a958-0a6bc5fbfdf0",
      "title": "Phone Book (renamed)",
      "originalFileName": "phone-book.pdf",
      "fileSize": 1048576,
      "dateAdded": "2026-10-06T10:00:00.000Z",
      "isFavorite": true,
      "isFinished": false
    }
  ],
  "page": 1,
  "pageSize": 2,
  "total": 3
}
```

| Status | When |
|---|---|
| `200` | Always, unless the query is invalid |
| `400` | `page` or `pageSize` out of range or not a number |

### `GET /documents/:id`

`200` → a document object.

| Status | When |
|---|---|
| `200` | Found |
| `400` | `id` is not a UUID |
| `404` | `{"error":"Document not found"}` |

### `PUT /documents/:id`

Registers a document from the phone. Creates it if the id is new, otherwise replaces it. **Safe to call repeatedly**: call it after every import, and for all documents on app start to catch anything imported while offline.

**Body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `title` | string | yes | 1–300 chars (surrounding spaces trimmed) |
| `originalFileName` | string | yes | 1–300 chars |
| `fileHash` | string | no | ≤ 128 chars |
| `fileSize` | integer | no | 0 – 2,147,483,647 |
| `pageCount` | integer | no | ≥ 1 |
| `dateAdded` | ISO date | yes | The phone's import time, not "now" on the server |
| `lastOpenedAt` | ISO date | no | |
| `isFavorite` | boolean | yes | |
| `isFinished` | boolean | yes | |

Do **not** send `id` (it goes in the URL), `localUri` or `thumbnailUri` (device-only paths). All three are rejected as unknown keys.

Request:
```json
{
  "title": "Phone Book",
  "originalFileName": "phone-book.pdf",
  "fileHash": "9e107d9d372bb6826bd81d3542a419d6",
  "fileSize": 1048576,
  "pageCount": 250,
  "dateAdded": "2026-10-06T10:00:00.000Z",
  "isFavorite": false,
  "isFinished": false
}
```

Response (`201` the first time, `200` after that) — the saved document object:
```json
{
  "id": "3d23972a-929e-49c7-a958-0a6bc5fbfdf0",
  "title": "Phone Book",
  "originalFileName": "phone-book.pdf",
  "fileHash": "9e107d9d372bb6826bd81d3542a419d6",
  "fileSize": 1048576,
  "pageCount": 250,
  "dateAdded": "2026-10-06T10:00:00.000Z",
  "isFavorite": false,
  "isFinished": false
}
```

| Status | When |
|---|---|
| `201` | Created |
| `200` | Updated |
| `400` | `id` is not a UUID, or the body breaks a rule above |

From the app (the `LocalDocument` minus `id` and the device-only fields):
```ts
const { id, localUri, thumbnailUri, ...body } = doc;
await fetch(`${API_URL}/documents/${doc.id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
```

### `DELETE /documents/:id`

Removes the document from the server. Its reading position and all its bookmarks are deleted with it.

This only removes the server's copy: the app still deletes its own PDF file and its local record.

| Status | When |
|---|---|
| `204` | Deleted (no body) |
| `400` | `id` is not a UUID |
| `404` | `{"error":"Document not found"}` — treat as **already deleted**, not as a failure. This happens when a delete is retried after its first response was lost. |

---

## Reading position

Where the reader left off in a document. One per document; saving again overwrites it.

**Reading position object**

| Field | Type | Always present | Notes |
|---|---|---|---|
| `id` | UUID | yes | Set by the server |
| `documentId` | UUID | yes | |
| `pageNumber` | integer | yes | 1-based |
| `progressPercent` | number | yes | 0–100 |
| `readingMode` | `"book"` \| `"scroll"` | yes | |
| `scrollOffsetY` | number | no | |
| `pageCoordinateX` | number | no | |
| `pageCoordinateY` | number | no | |
| `zoomScale` | number | no | |
| `topVisibleText` | string | no | |
| `updatedAt` | ISO date | yes | Set by the server on every save |

**What the app fills today (`react-native-pdf`)**

| Field | Source |
|---|---|
| `pageNumber` | `onPageChanged(page, numberOfPages)` |
| `progressPercent` | `page / numberOfPages * 100` |
| `readingMode` | The mode currently shown |
| `zoomScale` | `onScaleChanged(scale)` |
| `scrollOffsetY`, `pageCoordinateX`, `pageCoordinateY`, `topVisibleText` | **Leave out.** `react-native-pdf` cannot report them. They stay in the API for a future viewer. |

Restore by passing the saved `pageNumber` as `page` and `zoomScale` as `scale`. In scroll mode this lands at the top of the saved page.

### `PUT /documents/:id/reading-position`

Saves the position, replacing the previous one. The document must already be registered with `PUT /documents/:id`.

**Body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `pageNumber` | integer | yes | ≥ 1 |
| `progressPercent` | number | yes | 0–100 |
| `readingMode` | string | yes | `"book"` or `"scroll"` |
| `scrollOffsetY` | number | no | ≥ 0 |
| `pageCoordinateX` | number | no | |
| `pageCoordinateY` | number | no | |
| `zoomScale` | number | no | > 0 |
| `topVisibleText` | string | no | ≤ 500 chars |

Request:
```json
{ "pageNumber": 42, "progressPercent": 16.8, "readingMode": "book", "zoomScale": 1.5 }
```

Response `200`:
```json
{
  "id": "8fd92d08-91e7-4586-b1d7-7f2eab7a7147",
  "documentId": "3d23972a-929e-49c7-a958-0a6bc5fbfdf0",
  "pageNumber": 42,
  "progressPercent": 16.8,
  "readingMode": "book",
  "zoomScale": 1.5,
  "updatedAt": "2026-10-07T10:30:51.431Z"
}
```

| Status | When |
|---|---|
| `200` | Saved (created or replaced) |
| `400` | `id` is not a UUID, or the body breaks a rule above |
| `404` | `{"error":"Document not found"}` — register the document first |

### `GET /documents/:id/reading-position`

`200` → the reading position object (same shape as above).

| Status | When |
|---|---|
| `200` | A position is saved |
| `400` | `id` is not a UUID |
| `404` | `{"error":"Document not found"}` — the document is not registered |
| `404` | `{"error":"No reading position saved"}` — **normal** for a book never opened; start at page 1 |

---

## Bookmarks

Saved positions the reader can jump back to. A document can have many.

**Bookmark object**

| Field | Type | Always present | Notes |
|---|---|---|---|
| `id` | UUID | yes | Set by the server |
| `documentId` | UUID | yes | |
| `label` | string | no | |
| `pageNumber` | integer | yes | |
| `readingMode` | `"book"` \| `"scroll"` | yes | |
| `scrollOffsetY`, `pageCoordinateX`, `pageCoordinateY`, `zoomScale` | number | no | Same meaning as in the reading position |
| `textPreview` | string | no | |
| `createdAt` | ISO date | yes | |
| `updatedAt` | ISO date | yes | |

### `POST /documents/:id/bookmarks`

Creates a bookmark. Keep the returned `id`: it is needed to delete the bookmark.

**Body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `label` | string | no | 1–100 chars after trimming (a label of only spaces is rejected) |
| `pageNumber` | integer | yes | ≥ 1 |
| `readingMode` | string | yes | `"book"` or `"scroll"` |
| `scrollOffsetY` | number | no | ≥ 0 |
| `pageCoordinateX` | number | no | |
| `pageCoordinateY` | number | no | |
| `zoomScale` | number | no | > 0 |
| `textPreview` | string | no | ≤ 500 chars |

Request:
```json
{ "label": "Chapter 3", "pageNumber": 40, "readingMode": "book", "zoomScale": 1.0 }
```

Response `201`:
```json
{
  "id": "c5ce14d4-b5df-48a4-9b05-c511541da8fa",
  "documentId": "3d23972a-929e-49c7-a958-0a6bc5fbfdf0",
  "label": "Chapter 3",
  "pageNumber": 40,
  "readingMode": "book",
  "zoomScale": 1,
  "createdAt": "2026-10-07T10:30:51.473Z",
  "updatedAt": "2026-10-07T10:30:51.473Z"
}
```

| Status | When |
|---|---|
| `201` | Created |
| `400` | `id` is not a UUID, or the body breaks a rule above |
| `404` | `{"error":"Document not found"}` |

### `GET /documents/:id/bookmarks`

All bookmarks of a document in reading order: lowest `pageNumber` first, then oldest first. Not paginated. Returns `[]` when there are none.

`200` → an array of bookmark objects.

| Status | When |
|---|---|
| `200` | Always for a registered document (possibly `[]`) |
| `400` | `id` is not a UUID |
| `404` | `{"error":"Document not found"}` |

### `DELETE /bookmarks/:bookmarkId`

| Status | When |
|---|---|
| `204` | Deleted (no body) |
| `400` | `bookmarkId` is not a UUID |
| `404` | `{"error":"Bookmark not found"}` |

---

## Not built yet

Do not rely on these; they do not exist:

- Listing only changed documents (no "changed since" query)
- Editing a bookmark's label (delete and recreate instead)
- Sync conflict rules: the last `PUT` wins
- Accounts, authentication, HTTPS
- Uploading PDF files
