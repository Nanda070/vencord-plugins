/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { createSoundCache, toGain } from "../sounds.ts";

function bytes(...values) {
    return new Uint8Array(values).buffer;
}

test("toGain multiplies the sound's own volume by the setting", () => {
    assert.equal(toGain(1, 100), 1);
    assert.equal(toGain(0.5, 100), 0.5);
    assert.equal(toGain(0.5, 200), 1);
    assert.equal(toGain(1, 0), 0);
});

test("toGain treats a missing sound volume as full volume", () => {
    assert.equal(toGain(undefined, 50), 0.5);
    assert.equal(toGain(null, 50), 0.5);
});

test("toGain clamps out-of-range values", () => {
    assert.equal(toGain(5, 100), 1);
    assert.equal(toGain(-1, 100), 0);
    assert.equal(toGain(1, 900), 2);
    assert.equal(toGain(1, -50), 0);
    assert.equal(toGain(1, NaN), 1);
});

test("a sound is fetched once and then served from the cache", async () => {
    const requested = [];
    const cache = createSoundCache({
        fetchBytes: async id => {
            requested.push(id);
            return bytes(1, 2, 3);
        },
    });

    const first = await cache.get("a");
    const second = await cache.get("a");
    assert.deepEqual(requested, ["a"]);
    assert.deepEqual(new Uint8Array(second), new Uint8Array([1, 2, 3]));
    assert.notEqual(first, second, "each caller needs its own copy: decodeAudioData detaches the buffer");
});

test("concurrent requests for the same sound share one fetch", async () => {
    let fetches = 0;
    const cache = createSoundCache({
        fetchBytes: async () => {
            fetches++;
            return bytes(1);
        },
    });

    await Promise.all([cache.get("a"), cache.get("a"), cache.get("a")]);
    assert.equal(fetches, 1);
});

test("a failed fetch is not cached", async () => {
    let attempt = 0;
    const cache = createSoundCache({
        fetchBytes: async () => {
            if (++attempt === 1) throw new Error("network down");
            return bytes(7);
        },
    });

    await assert.rejects(cache.get("a"), /network down/);
    assert.deepEqual(new Uint8Array(await cache.get("a")), new Uint8Array([7]));
    assert.equal(attempt, 2);
});

test("the least recently used sound is evicted first", async () => {
    const requested = [];
    const cache = createSoundCache({
        maxEntries: 2,
        fetchBytes: async id => {
            requested.push(id);
            return bytes(1);
        },
    });

    await cache.get("a");
    await cache.get("b");
    await cache.get("a"); // "b" is now the oldest
    await cache.get("c"); // evicts "b"
    await cache.get("a");
    await cache.get("b");
    assert.deepEqual(requested, ["a", "b", "c", "b"]);
});

test("clear empties the cache", async () => {
    let fetches = 0;
    const cache = createSoundCache({
        fetchBytes: async () => {
            fetches++;
            return bytes(1);
        },
    });

    await cache.get("a");
    cache.clear();
    await cache.get("a");
    assert.equal(fetches, 2);
});
