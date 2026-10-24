/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Checks every patch of the plugin against Discord's current web bundle, without starting Discord.
// The bundle is only read and parsed as text: it is never executed.
//
//   node tools/check-patches.mjs                  download the stable bundle (cached per build) and check
//   node tools/check-patches.mjs --channel canary check canary or ptb instead
//   node tools/check-patches.mjs --dir <folder>   check .js files that are already on disk
//
// Needs Node 22.18+ (it imports patches.ts directly).

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { audioPatches, enginePatches, nitroPatches, soundboardPatches } from "../patches.ts";
import { applyReplacement, moduleMatchesFind, replacementsOf } from "./lib/vencord-patch.mjs";

const HOSTS = { stable: "discord.com", ptb: "ptb.discord.com", canary: "canary.discord.com" };
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const GROUPS = { engine: enginePatches, audio: audioPatches, soundboard: soundboardPatches, nitro: nitroPatches };

const { values: args } = parseArgs({
    options: {
        channel: { type: "string", default: "stable" },
        dir: { type: "string" },
    },
});

async function download(url) {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
    return response.text();
}

async function fetchBundle(channel) {
    const host = HOSTS[channel];
    if (host == null) throw new Error(`Unknown channel "${channel}". Use one of: ${Object.keys(HOSTS).join(", ")}`);

    const html = await download(`https://${host}/app`);
    const build = /"BUILD_NUMBER":"(\d+)"/.exec(html)?.[1] ?? "unknown";
    const scripts = [...new Set([...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map(match => match[1]))];
    if (scripts.length === 0) throw new Error("No script tags found in Discord's app page");

    const dir = join(tmpdir(), "soundboard-to-voice", `${channel}-${build}`);
    await mkdir(dir, { recursive: true });
    const cached = new Set(await readdir(dir));
    const missing = scripts.filter(script => !cached.has(script.split("/").pop()));

    console.log(`Discord ${channel}, build ${build}: ${scripts.length} chunks, ${missing.length} to download`);
    const queue = [...missing];
    await Promise.all(Array.from({ length: 12 }, async () => {
        for (let script = queue.pop(); script != null; script = queue.pop()) {
            await writeFile(join(dir, script.split("/").pop()), await download(`https://${host}${script}`));
        }
    }));
    return dir;
}

/** Finds the webpack modules of one chunk. A module looks like `123456(e,t,n){...}`. */
function splitModules(file, source) {
    const header = /(?<=[{,])(\d+)(?::function)?\((?:e(?:,t(?:,n)?)?)?\)(?:=>)?\{/g;
    const starts = [...source.matchAll(header)];
    return starts.map((match, i) => {
        const start = match.index;
        const end = starts[i + 1]?.index ?? source.length;
        return { file, id: match[1], start, end, original: source.slice(start, end), code: source.slice(start, end) };
    });
}

async function loadBundle(dir) {
    const names = (await readdir(dir)).filter(name => name.endsWith(".js"));
    if (names.length === 0) throw new Error(`No .js files in ${dir}`);
    const files = new Map(await Promise.all(names.map(async name => [name, await readFile(join(dir, name), "utf8")])));
    const modules = [...files].flatMap(([name, source]) => splitModules(name, source));
    return { files, modules };
}

/** Parses (never runs) a whole chunk to see whether it is valid JavaScript. */
function parses(source) {
    try {
        new Function(source.replaceAll("$self", "self"));
        return true;
    } catch {
        return false;
    }
}

function rebuild(source, modules, codeOf) {
    let result = "";
    let position = 0;
    for (const module of modules) {
        result += source.slice(position, module.start) + codeOf(module);
        position = module.end;
    }
    return result + source.slice(position);
}

function describe(value) {
    const text = String(value);
    return text.length > 78 ? `${text.slice(0, 75)}...` : text;
}

/** Applies a patch to the module it targets. Returns the problems found. */
function applyPatch(patch, modules) {
    const hits = modules.filter(module => moduleMatchesFind(module.original, patch.find));
    if (hits.length !== 1) return { problems: [`find matched ${hits.length} modules instead of 1`] };

    const [module] = hits;
    const problems = [];
    for (const replacement of replacementsOf(patch)) {
        const next = applyReplacement(module.code, replacement);
        // noWarn is deliberately ignored: against an unmodified bundle every replacement must do something
        if (next === module.code) problems.push(`no effect in module ${module.id}: ${describe(replacement.match)}`);
        module.code = next;
    }
    return { problems, module };
}

const dir = args.dir ?? await fetchBundle(args.channel);
const { files, modules } = await loadBundle(dir);
console.log(`${modules.length} modules loaded from ${dir}\n`);

let failures = 0;
const touched = new Set();
for (const [group, patches] of Object.entries(GROUPS)) {
    for (const patch of patches) {
        const { problems, module } = applyPatch(patch, modules);
        if (module != null) touched.add(module);
        failures += problems.length;
        console.log(`${problems.length === 0 ? "ok  " : "FAIL"}  ${group.padEnd(10)}  ${describe(patch.find)}`);
        for (const problem of problems) console.log(`        ${problem}`);
    }
}

// A replacement that matches can still produce broken code, so parse the patched chunks as a whole
for (const file of new Set([...touched].map(module => module.file))) {
    const source = files.get(file);
    const inFile = [...touched].filter(module => module.file === file).sort((a, b) => a.start - b.start);
    if (!parses(source)) {
        console.log(`skip  syntax      ${file} does not parse even unpatched`);
        continue;
    }
    if (parses(rebuild(source, inFile, module => module.code))) {
        console.log(`ok    syntax      ${file} still parses with all patches applied`);
        continue;
    }
    const culprits = inFile.filter(module => !parses(rebuild(source, [module], m => m.code))).map(module => module.id);
    failures++;
    console.log(`FAIL  syntax      ${file} no longer parses; broken module(s): ${culprits.join(", ") || "only in combination"}`);
}

console.log(failures === 0 ? "\nAll patches apply." : `\n${failures} problem(s) found.`);
process.exitCode = failures === 0 ? 0 : 1;
