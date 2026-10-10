import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { isPasswordBreached } from "./services/breachedPasswords.js";

// Replaces fetch, so these tests never call Have I Been Pwned and can see exactly what would be sent.
const realFetch = globalThis.fetch;
afterEach(() => {
    globalThis.fetch = realFetch;
});

function sha1(text: string): string {
    return createHash("sha1").update(text).digest("hex").toUpperCase();
}

function fakeRangeApi(body: string, status = 200) {
    const requests: { url: string; init?: RequestInit }[] = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        requests.push({ url: String(url), init });
        return new Response(body, { status });
    }) as typeof fetch;
    return requests;
}

describe("isPasswordBreached", () => {
    const password = "a long passphrase nobody uses";
    const hash = sha1(password);

    test("sends only the first 5 characters of the SHA-1, with padding, never the password", async () => {
        const requests = fakeRangeApi("");
        await isPasswordBreached(password);

        assert.equal(requests.length, 1);
        assert.equal(requests[0].url, `https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`);
        assert.ok(!requests[0].url.includes(hash.slice(5)));
        assert.ok(!requests[0].url.includes(encodeURIComponent(password)));
        assert.equal(new Headers(requests[0].init?.headers).get("Add-Padding"), "true");
        assert.ok(requests[0].init?.signal, "the request has a timeout");
    });

    test("true when the hash suffix is listed with a count", async () => {
        fakeRangeApi(`0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n${hash.slice(5)}:42\r\n`);
        assert.equal(await isPasswordBreached(password), true);
    });

    test("false for a padding line (count 0) or no match", async () => {
        fakeRangeApi(`${hash.slice(5)}:0\r\n0018A45C4D1DEF81644B54AB7F969B88D65:3\r\n`);
        assert.equal(await isPasswordBreached(password), false);
    });

    test("throws when the service answers with an error", async () => {
        fakeRangeApi("", 503);
        await assert.rejects(isPasswordBreached(password), /503/);
    });
});
