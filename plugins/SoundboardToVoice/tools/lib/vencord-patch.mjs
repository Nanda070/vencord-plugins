/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Reimplements the bits of Vencord's patcher needed to try patches outside of Discord.

const IDENTIFIER = String.raw`(?:[A-Za-z_$][\w$]*)`;

/** Vencord lets patches write \i for "any minified identifier". */
export function canonicalizeMatch(match) {
    if (typeof match === "string") return match;
    const source = match.source.replaceAll(/(\\*)\\i/g, (whole, escapes) =>
        escapes.length % 2 === 0 ? `${escapes}${IDENTIFIER}` : whole.slice(1));
    return new RegExp(source, match.flags);
}

export function moduleMatchesFind(code, find) {
    return typeof find === "string" ? code.includes(find) : canonicalizeMatch(find).test(code);
}

export function replacementsOf(patch) {
    return Array.isArray(patch.replacement) ? patch.replacement : [patch.replacement];
}

/** Applies one replacement the way Vencord does. `$self` is left as is. */
export function applyReplacement(code, replacement) {
    const match = canonicalizeMatch(replacement.match);
    if (typeof match !== "string" && match.global) match.lastIndex = 0;
    return code.replace(match, replacement.replace);
}

/**
 * Applies a whole patch to one module's code.
 * Returns the new code plus, per replacement, whether it changed anything.
 */
export function applyPatch(code, patch) {
    let patched = code;
    const effects = [];
    for (const replacement of replacementsOf(patch)) {
        const next = applyReplacement(patched, replacement);
        effects.push(next !== patched);
        patched = next;
    }
    return { code: patched, effects };
}
