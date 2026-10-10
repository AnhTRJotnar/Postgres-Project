import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { FastifyInstance, InjectOptions } from "fastify";
import { buildApp } from "./app.js";
import { prisma } from "./db/prisma.js";

// These tests run against the local development database (Docker must be running).
// They create two fresh test users, and delete them afterwards: their documents,
// positions and bookmarks go with them (ON DELETE CASCADE), so existing data is never touched.

let app: FastifyInstance;
const createdEmails: string[] = [];
// Every route the app has, read from Fastify's route table after start-up.
let routes: { method: string; url: string }[] = [];
let ownerToken: string;
let otherToken: string;

async function registerUser(): Promise<string> {
    const email = `test-${randomUUID()}@example.com`;
    createdEmails.push(email);
    const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email, password: "correct horse battery staple" },
    });
    assert.equal(res.statusCode, 201);
    return res.json().accessToken;
}

// Turns Fastify's printed route tree ("├── /documents (GET, HEAD)" with nested children)
// into full paths. It sees every route, wherever in the app it was registered.
function listRoutes(tree: string): { method: string; url: string }[] {
    const parents: string[] = [];
    const result: { method: string; url: string }[] = [];
    for (const line of tree.split("\n")) {
        const match = /^(.*?)[├└]── (\S+)(?: \((.+)\))?$/.exec(line.trimEnd());
        if (!match) continue;
        const depth = match[1].length / 4;
        const url = (parents[depth - 1] ?? "") + match[2];
        parents[depth] = url;
        for (const method of match[3]?.split(", ") ?? []) {
            result.push({ method, url });
        }
    }
    return result;
}

before(async () => {
    app = buildApp({ logger: false });
    await app.ready();
    routes = listRoutes(app.printRoutes({ commonPrefix: false }));
    ownerToken = await registerUser();
    otherToken = await registerUser();
});

after(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    await app.close();
});

// A request as the test user (or as another user, with `token`).
function api(options: InjectOptions, token = ownerToken) {
    return app.inject({ ...options, headers: { ...options.headers, authorization: `Bearer ${token}` } });
}

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
    const res = await api({ method: "PUT", url: `/documents/${id}`, payload: documentBody(overrides) });
    assert.equal(res.statusCode, 201);
    return id;
}

// Bookmark ids are made by the test, the same way the phone makes them.
function putBookmark(documentId: string, bookmarkId: string, payload: Record<string, unknown>) {
    return api({ method: "PUT", url: `/documents/${documentId}/bookmarks/${bookmarkId}`, payload });
}

describe("health", () => {
    test("database is reachable", async () => {
        const res = await api({ method: "GET", url: "/health/db" });
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.json(), { status: "ok", database: "reachable" });
    });
});

describe("documents", () => {
    test("PUT creates with 201, then updates with 200, keeping the phone's id and date", async () => {
        const id = randomUUID();

        const created = await api({ method: "PUT", url: `/documents/${id}`, payload: documentBody() });
        assert.equal(created.statusCode, 201);
        assert.equal(created.json().id, id);
        assert.equal(created.json().dateAdded, "2026-10-07T10:00:00.000Z");

        const updated = await api({
            method: "PUT",
            url: `/documents/${id}`,
            payload: documentBody({ title: "Renamed" }),
        });
        assert.equal(updated.statusCode, 200);
        assert.equal(updated.json().title, "Renamed");
    });

    test("PUT clears optional fields that are left out", async () => {
        const id = await createDocument({ pageCount: 250 });
        const res = await api({ method: "PUT", url: `/documents/${id}`, payload: documentBody() });
        assert.equal(res.statusCode, 200);
        assert.equal("pageCount" in res.json(), false);
    });

    test("PUT rejects id in the body (it belongs in the URL)", async () => {
        const id = randomUUID();
        const res = await api({ method: "PUT", url: `/documents/${id}`, payload: documentBody({ id }) });
        assert.equal(res.statusCode, 400);
        assert.match(res.json().issues[0].message, /"id"/);
    });

    test("PUT rejects device-only localUri", async () => {
        const res = await api({
            method: "PUT",
            url: `/documents/${randomUUID()}`,
            payload: documentBody({ localUri: "file:///x.pdf" }),
        });
        assert.equal(res.statusCode, 400);
    });

    test("GET returns 404 for an unknown id and 400 for a non-UUID", async () => {
        const unknown = await api({ method: "GET", url: `/documents/${randomUUID()}` });
        assert.equal(unknown.statusCode, 404);
        assert.deepEqual(unknown.json(), { error: "Document not found" });

        const invalid = await api({ method: "GET", url: "/documents/not-a-uuid" });
        assert.equal(invalid.statusCode, 400);
    });

    test("GET /documents paginates and validates pageSize", async () => {
        await createDocument();
        const page = await api({ method: "GET", url: "/documents?page=1&pageSize=1" });
        assert.equal(page.statusCode, 200);
        assert.equal(page.json().items.length, 1);
        assert.ok(page.json().total >= 1);

        const tooBig = await api({ method: "GET", url: "/documents?pageSize=101" });
        assert.equal(tooBig.statusCode, 400);
    });

    test("DELETE returns 204, then 404, and cascades to bookmarks", async () => {
        const id = await createDocument();
                const bookmarkId = randomUUID();
        await putBookmark(id, bookmarkId, { pageNumber: 1, readingMode: "book" });

        const deleted = await api({ method: "DELETE", url: `/documents/${id}` });
        assert.equal(deleted.statusCode, 204);

        const again = await api({ method: "DELETE", url: `/documents/${id}` });
        assert.equal(again.statusCode, 404);

        const bookmarkGone = await api({ method: "DELETE", url: `/bookmarks/${bookmarkId}` });
        assert.equal(bookmarkGone.statusCode, 404);
    });
});

describe("reading position", () => {
    test("GET returns 404 'No reading position saved' before the first save", async () => {
        const id = await createDocument();
        const res = await api({ method: "GET", url: `/documents/${id}/reading-position` });
        assert.equal(res.statusCode, 404);
        assert.deepEqual(res.json(), { error: "No reading position saved" });
    });

    test("PUT saves and replaces; omitted fields are cleared", async () => {
        const id = await createDocument();
        const url = `/documents/${id}/reading-position`;

        const first = await api({
            method: "PUT",
            url,
            payload: { pageNumber: 12, progressPercent: 9.5, readingMode: "scroll", scrollOffsetY: 340.5, zoomScale: 1.25 },
        });
        assert.equal(first.statusCode, 200);

        const second = await api({
            method: "PUT",
            url,
            payload: { pageNumber: 13, progressPercent: 10.2, readingMode: "book" },
        });
        assert.equal(second.statusCode, 200);
        assert.equal(second.json().id, first.json().id);

        const read = await api({ method: "GET", url });
        assert.equal(read.json().pageNumber, 13);
        assert.equal(read.json().readingMode, "book");
        assert.equal("scrollOffsetY" in read.json(), false);
        assert.equal("zoomScale" in read.json(), false);
    });

    test("PUT rejects an unknown document, a bad mode and unknown keys", async () => {
        const unknownDoc = await api({
            method: "PUT",
            url: `/documents/${randomUUID()}/reading-position`,
            payload: { pageNumber: 1, progressPercent: 0, readingMode: "book" },
        });
        assert.equal(unknownDoc.statusCode, 404);

        const id = await createDocument();
        const badMode = await api({
            method: "PUT",
            url: `/documents/${id}/reading-position`,
            payload: { pageNumber: 1, progressPercent: 0, readingMode: "flip" },
        });
        assert.equal(badMode.statusCode, 400);

        const typo = await api({
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

        const list = await api({ method: "GET", url: `/documents/${id}/bookmarks` });
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

        const list = await api({ method: "GET", url: `/documents/${id}/bookmarks` });
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

        assert.equal((await api({ method: "DELETE", url })).statusCode, 204);
        assert.equal((await api({ method: "DELETE", url })).statusCode, 404);
    });
});


describe("access control", () => {
    // The only routes that work without logging in.
    const publicRoutes = ["/health", "/health/db", "/auth/register", "/auth/login", "/auth/refresh", "/auth/logout", "/me"];

    test("every other route answers 401 without a valid token", async () => {
        const protectedRoutes = routes.filter(
            (route) => route.method !== "HEAD" && !publicRoutes.includes(route.url),
        );
        // Guards against the list above silently matching nothing.
        assert.ok(protectedRoutes.length >= 9, `found only ${protectedRoutes.length} protected routes`);

        for (const route of protectedRoutes) {
            const url = route.url.replace(/:\w+/g, () => randomUUID());
            for (const authorization of [undefined, "Bearer not-a-token"]) {
                const res = await app.inject({
                    method: route.method as InjectOptions["method"],
                    url,
                    headers: authorization ? { authorization } : {},
                    payload: route.method === "PUT" ? {} : undefined,
                });
                assert.equal(res.statusCode, 401, `${route.method} ${route.url} with ${authorization ?? "no token"}`);
            }
        }
    });

    test("another user's document, position and bookmarks answer 404, as if they didn't exist", async () => {
        const id = await createDocument();
        const bookmarkId = randomUUID();
        await putBookmark(id, bookmarkId, { pageNumber: 2, readingMode: "book" });
        await api({ method: "PUT", url: `/documents/${id}/reading-position`, payload: { pageNumber: 2, progressPercent: 1, readingMode: "book" } });

        for (const options of [
            { method: "GET", url: `/documents/${id}` },
            { method: "GET", url: `/documents/${id}/reading-position` },
            { method: "PUT", url: `/documents/${id}/reading-position`, payload: { pageNumber: 9, progressPercent: 5, readingMode: "book" } },
            { method: "GET", url: `/documents/${id}/bookmarks` },
            { method: "PUT", url: `/documents/${id}/bookmarks/${randomUUID()}`, payload: { pageNumber: 9, readingMode: "book" } },
            { method: "DELETE", url: `/bookmarks/${bookmarkId}` },
            { method: "DELETE", url: `/documents/${id}` },
        ] as InjectOptions[]) {
            const res = await api(options, otherToken);
            assert.equal(res.statusCode, 404, `${options.method} ${options.url}`);
        }

        // Nothing changed for the owner.
        const position = await api({ method: "GET", url: `/documents/${id}/reading-position` });
        assert.equal(position.json().pageNumber, 2);
        const bookmarks = await api({ method: "GET", url: `/documents/${id}/bookmarks` });
        assert.deepEqual(bookmarks.json().map((bookmark: { id: string }) => bookmark.id), [bookmarkId]);
    });

    test("PUT with another user's document id is refused and changes nothing", async () => {
        const id = await createDocument({ title: "Owner's title" });

        const res = await api({ method: "PUT", url: `/documents/${id}`, payload: documentBody({ title: "Taken over" }) }, otherToken);
        assert.equal(res.statusCode, 409);
        assert.deepEqual(res.json(), { error: "Document id already in use" });

        const owner = await api({ method: "GET", url: `/documents/${id}` });
        assert.equal(owner.json().title, "Owner's title");
    });

    test("PUT with a bookmark id from another user's document is refused and changes nothing", async () => {
        const ownerDocument = await createDocument();
        const bookmarkId = randomUUID();
        await putBookmark(ownerDocument, bookmarkId, { pageNumber: 4, readingMode: "book", label: "Mine" });

        const otherDocument = randomUUID();
        await api({ method: "PUT", url: `/documents/${otherDocument}`, payload: documentBody() }, otherToken);
        const res = await api(
            { method: "PUT", url: `/documents/${otherDocument}/bookmarks/${bookmarkId}`, payload: { pageNumber: 1, readingMode: "book" } },
            otherToken,
        );
        assert.equal(res.statusCode, 409);

        const bookmarks = await api({ method: "GET", url: `/documents/${ownerDocument}/bookmarks` });
        assert.equal(bookmarks.json()[0].label, "Mine");
    });

    test("GET /documents lists only the user's own documents", async () => {
        const mine = await createDocument();
        const theirs = randomUUID();
        await api({ method: "PUT", url: `/documents/${theirs}`, payload: documentBody() }, otherToken);

        const list = await api({ method: "GET", url: "/documents?pageSize=100" });
        const ids = list.json().items.map((document: { id: string }) => document.id);
        assert.ok(ids.includes(mine));
        assert.ok(!ids.includes(theirs));
    });
});
