import { createHash } from "node:crypto";

// Have I Been Pwned's Pwned Passwords "range" API. Free, no key needed.
const RANGE_URL = "https://api.pwnedpasswords.com/range/";

export type BreachedPasswordCheck = (password: string) => Promise<boolean>;

// True if the password appears in a known data breach. Throws if HIBP can't be reached within 3 seconds.
//
// Only the first 5 characters of the password's SHA-1 leave the server (k-anonymity): HIBP answers
// with every breached hash starting with them, and the comparison happens here. HIBP never sees
// the password or its full hash. "Add-Padding" adds fake entries, so the response size doesn't
// reveal the prefix either.
export async function isPasswordBreached(password: string): Promise<boolean> {
    // The password as typed (not NFKC-normalized), because the breach lists contain passwords as typed.
    const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const response = await fetch(RANGE_URL + prefix, {
        headers: { "Add-Padding": "true", "User-Agent": "kindle-pdf-reader-api" },
        signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
        throw new Error(`Pwned Passwords answered ${response.status}`);
    }

    // Each line is "SUFFIX:COUNT". Padding lines have a count of 0.
    const body = await response.text();
    return body.split("\n").some((line) => {
        const [lineSuffix, count] = line.trim().split(":");
        return lineSuffix === suffix && Number(count) > 0;
    });
}
