import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";

// These tests run against the local development database (Docker must be running).
// Every test uses fresh random UUIDs and deletes its documents afterwards,
// so existing data is never touched.

let app: FastifyInstance;
const createdDocumentIds: string[] = [];

before(async () => {
    app = buildApp({ logger: false });
    await app.ready();
});

after(async () => {
    for (const id of createdDocumentIds) {
        await app.inject({ method: "DELETE", url: `/documents/${id}` });
    }
    await app.close();
});

function documentBody(overrides: Record<string, unknown> = {}) {
    return {
        title: "Test document",
        originalFileName: "test.pdf",
        dateAdded: "2026-10-07T10:00:00.000Z",
        isFavorite: false,
        isFinished: false,
        ...overrides,
    };
}

async function createDocument(overrides: Record<string, unknown> = {}): Promise<string> {
    const id = randomUUID();
    createdDocumentIds.push(id);
    const res = await app.inject({ method: "PUT", url: `/documents/${id}`, payload: documentBody(overrides) });
    assert.equal(res.statusCode, 201);
    return id;
}

// Bookmark ids are made by the test, the same way the phone makes them.
function putBookmark(documentId: string, bookmarkId: string, payload: Record<string, unknown>) {
    return app.inject({ method: "PUT", url: `/documents/${documentId}/bookmarks/${bookmarkId}`, payload });
}

describe("health", () => {
    test("database is reachable", async () => {
        const res = await app.inject({ method: "GET", url: "/health/db" });
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.json(), { status: "ok", database: "reachable" });
    });
});

describe("documents", () => {
    test("PUT creates with 201, then updates with 200, keeping the phone's id and date", async () => {
        const id = randomUUID();
        createdDocumentIds.push(id);

        const created = await app.inject({ method: "PUT", url: `/documents/${id}`, payload: documentBody() });
        assert.equal(created.statusCode, 201);
        assert.equal(created.json().id, id);
        assert.equal(created.json().dateAdded, "2026-10-07T10:00:00.000Z");

        const updated = await app.inject({
            method: "PUT",
            url: `/documents/${id}`,
            payload: documentBody({ title: "Renamed" }),
        });
        assert.equal(updated.statusCode, 200);
        assert.equal(updated.json().title, "Renamed");
    });

    test("PUT clears optional fields that are left out", async () => {
        const id = await createDocument({ pageCount: 250 });
        const res = await app.inject({ method: "PUT", url: `/documents/${id}`, payload: documentBody() });
        assert.equal(res.statusCode, 200);
        assert.equal("pageCount" in res.json(), false);
    });

    test("PUT rejects id in the body (it belongs in the URL)", async () => {
        const id = randomUUID();
        const res = await app.inject({ method: "PUT", url: `/documents/${id}`, payload: documentBody({ id }) });
        assert.equal(res.statusCode, 400);
        assert.match(res.json().issues[0].message, /"id"/);
    });

    test("PUT rejects device-only localUri", async () => {
        const res = await app.inject({
            method: "PUT",
            url: `/documents/${randomUUID()}`,
            payload: documentBody({ localUri: "file:///x.pdf" }),
        });
        assert.equal(res.statusCode, 400);
    });

    test("GET returns 404 for an unknown id and 400 for a non-UUID", async () => {
        const unknown = await app.inject({ method: "GET", url: `/documents/${randomUUID()}` });
        assert.equal(unknown.statusCode, 404);
        assert.deepEqual(unknown.json(), { error: "Document not found" });

        const invalid = await app.inject({ method: "GET", url: "/documents/not-a-uuid" });
        assert.equal(invalid.statusCode, 400);
    });

    test("GET /documents paginates and validates pageSize", async () => {
        await createDocument();
        const page = await app.inject({ method: "GET", url: "/documents?page=1&pageSize=1" });
        assert.equal(page.statusCode, 200);
        assert.equal(page.json().items.length, 1);
        assert.ok(page.json().total >= 1);

        const tooBig = await app.inject({ method: "GET", url: "/documents?pageSize=101" });
        assert.equal(tooBig.statusCode, 400);
    });

    test("DELETE returns 204, then 404, and cascades to bookmarks", async () => {
        const id = await createDocument();
                const bookmarkId = randomUUID();
        await putBookmark(id, bookmarkId, { pageNumber: 1, readingMode: "book" });

        const deleted = await app.inject({ method: "DELETE", url: `/documents/${id}` });
        assert.equal(deleted.statusCode, 204);

        const again = await app.inject({ method: "DELETE", url: `/documents/${id}` });
        assert.equal(again.statusCode, 404);

        const bookmarkGone = await app.inject({ method: "DELETE", url: `/bookmarks/${bookmarkId}` });
        assert.equal(bookmarkGone.statusCode, 404);
    });
});

describe("reading position", () => {
    test("GET returns 404 'No reading position saved' before the first save", async () => {
        const id = await createDocument();
        const res = await app.inject({ method: "GET", url: `/documents/${id}/reading-position` });
        assert.equal(res.statusCode, 404);
        assert.deepEqual(res.json(), { error: "No reading position saved" });
    });

    test("PUT saves and replaces; omitted fields are cleared", async () => {
        const id = await createDocument();
        const url = `/documents/${id}/reading-position`;

        const first = await app.inject({
            method: "PUT",
            url,
            payload: { pageNumber: 12, progressPercent: 9.5, readingMode: "scroll", scrollOffsetY: 340.5, zoomScale: 1.25 },
        });
        assert.equal(first.statusCode, 200);

        const second = await app.inject({
            method: "PUT",
            url,
            payload: { pageNumber: 13, progressPercent: 10.2, readingMode: "book" },
        });
        assert.equal(second.statusCode, 200);
        assert.equal(second.json().id, first.json().id);

        const read = await app.inject({ method: "GET", url });
        assert.equal(read.json().pageNumber, 13);
        assert.equal(read.json().readingMode, "book");
        assert.equal("scrollOffsetY" in read.json(), false);
        assert.equal("zoomScale" in read.json(), false);
    });

    test("PUT rejects an unknown document, a bad mode and unknown keys", async () => {
        const unknownDoc = await app.inject({
            method: "PUT",
            url: `/documents/${randomUUID()}/reading-position`,
            payload: { pageNumber: 1, progressPercent: 0, readingMode: "book" },
        });
        assert.equal(unknownDoc.statusCode, 404);

        const id = await createDocument();
        const badMode = await app.inject({
            method: "PUT",
            url: `/documents/${id}/reading-position`,
            payload: { pageNumber: 1, progressPercent: 0, readingMode: "flip" },
        });
        assert.equal(badMode.statusCode, 400);

        const typo = await app.inject({
            method: "PUT",
            url: `/documents/${id}/reading-position`,
            payload: { pageNumber: 1, progressPercent: 0, readingMode: "book", scrollOffset: 5 },
        });
        assert.equal(typo.statusCode, 400);
    });
});

describe("bookmarks", () => {
    test("PUT creates with 201 under the phone's id; GET lists in reading order", async () => {
        const id = await createDocument();
        const laterId = randomUUID();

        const later = await putBookmark(id, laterId, { label: "Chapter 3", pageNumber: 40, readingMode: "scroll" });
        assert.equal(later.statusCode, 201);
        assert.equal(later.json().id, laterId);
        const earlier = await putBookmark(id, randomUUID(), { pageNumber: 5, readingMode: "book" });
        assert.equal(earlier.statusCode, 201);

        const list = await app.inject({ method: "GET", url: `/documents/${id}/bookmarks` });
        assert.equal(list.statusCode, 200);
        assert.deepEqual(list.json().map((b: { pageNumber: number }) => b.pageNumber), [5, 40]);
    });

    test("PUT repeated is 200, makes no copy, and clears omitted fields", async () => {
        const id = await createDocument();
        const bookmarkId = randomUUID();

        await putBookmark(id, bookmarkId, { label: "Intro", pageNumber: 3, readingMode: "book", zoomScale: 1.5 });
        const retry = await putBookmark(id, bookmarkId, { pageNumber: 3, readingMode: "book" });
        assert.equal(retry.statusCode, 200);
        assert.equal("label" in retry.json(), false);
        assert.equal("zoomScale" in retry.json(), false);

        const list = await app.inject({ method: "GET", url: `/documents/${id}/bookmarks` });
        assert.equal(list.json().length, 1);
    });

    test("PUT returns 409 when the id belongs to another document's bookmark", async () => {
        const first = await createDocument();
        const second = await createDocument();
        const bookmarkId = randomUUID();

        await putBookmark(first, bookmarkId, { pageNumber: 1, readingMode: "book" });
        const res = await putBookmark(second, bookmarkId, { pageNumber: 1, readingMode: "book" });
        assert.equal(res.statusCode, 409);
    });

    test("PUT rejects a whitespace-only label and page 0, reporting both", async () => {
        const id = await createDocument();
        const res = await putBookmark(id, randomUUID(), { label: "   ", pageNumber: 0, readingMode: "book" });
        assert.equal(res.statusCode, 400);
        assert.equal(res.json().issues.length, 2);
    });

    test("PUT rejects a non-UUID bookmark id and an unknown document", async () => {
        const id = await createDocument();
        const badId = await putBookmark(id, "not-a-uuid", { pageNumber: 1, readingMode: "book" });
        assert.equal(badId.statusCode, 400);

        const unknownDoc = await putBookmark(randomUUID(), randomUUID(), { pageNumber: 1, readingMode: "book" });
        assert.equal(unknownDoc.statusCode, 404);
    });

    test("DELETE returns 204, then 404", async () => {
        const id = await createDocument();
        const bookmarkId = randomUUID();
        await putBookmark(id, bookmarkId, { pageNumber: 1, readingMode: "book" });
        const url = `/bookmarks/${bookmarkId}`;

        assert.equal((await app.inject({ method: "DELETE", url })).statusCode, 204);
        assert.equal((await app.inject({ method: "DELETE", url })).statusCode, 404);
    });
});

