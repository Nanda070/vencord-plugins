/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// All webpack patches of the plugin, grouped by purpose.
// Only a type import here, so tools/check-patches.mjs and the tests can load this file with plain node.

import type { Patch } from "@utils/types";

type PluginPatch = Omit<Patch, "plugin">;

/**
 * Discord Desktop only: run voice on the WebRTC media engine instead of the native one.
 * The native engine captures the microphone outside of JS, so nothing can be mixed into it.
 */
export const enginePatches: PluginPatch[] = [
    // Engine selection: [NATIVE, WEBRTC].find(supported) -> [WEBRTC].find(supported)
    {
        find: /\[\i\.\i\.NATIVE,\i\.\i\.WEBRTC\]\.find\(/,
        replacement: {
            match: /\[\i\.\i\.NATIVE,(\i\.\i\.WEBRTC)\](?=\.find\()/,
            replace: "[$1]",
        },
    },
    // The DAVE (E2EE) module is only fetched on web. Without it the voice server closes with 4017
    {
        find: /fetchDave:\(0,\i\.isWeb\)\(\)/,
        replacement: {
            match: /fetchDave:\(0,\i\.isWeb\)\(\)/,
            replace: "fetchDave:!0",
        },
    },
    // The browser capability table knows "Chrome" but the desktop app reports "Electron" (no video otherwise)
    {
        find: /"Electron"===\i\(\)\.name&&\i>=1\|\|/,
        replacement: {
            match: /"Chrome"===(\i\(\)\.name)(&&\i>=\d+)?/g,
            replace: '("Electron"===$1||"Chrome"===$1$2)',
        },
    },
    // Same browser check, gating echo cancellation / noise suppression / automatic gain
    {
        find: "AudioInput: No MediaStream",
        replacement: {
            match: /(?<=\.VOICE_PROCESSING:return)"Chrome"===\i\(\)\.name/,
            replace: "!0",
        },
    },
];

/**
 * Hooks into the WebRTC AudioInput class so the plugin owns the outgoing microphone stream.
 * Based on SoundboardPermissionsBypass by yash.
 */
export const audioPatches: PluginPatch[] = [
    {
        find: "AudioInput: No MediaStream",
        group: true,
        replacement: [
            // Send our mixed stream instead of the raw microphone stream
            {
                match: /(?<=\}else this\.stream=\i;)return this\.updateMode\(\)/,
                replace: "this.stream=$self.mixInput(this,this.stream);return this.updateMode()",
            },
            {
                match: /release\((\i)\)\{\1\.getTracks\(\)/,
                replace: "release($1){$self.releaseInput($1);$1.getTracks()",
            },
            // Keep the track enabled while a sound plays, even if the user is muted
            {
                match: /(?<=\.enabled=)!this\._mute/,
                replace: "$self.shouldEnableInput(this)",
            },
            // Others only receive audio while the speaking flag is set, so hold it during sounds
            {
                match: /setSpeaking\((\i)\)\{(?=this\.speaking!==\1)/,
                replace: "$&$1=$self.resolveSpeaking(this,$1);",
            },
        ],
    },
];

/** Soundboard UI: allow every sound in every channel and route the click to the plugin. */
export const soundboardPatches: PluginPatch[] = [
    // Mark every sound as available. FakeNitro applies the same patch, so it may already be done
    {
        find: 'type:"GUILD_SOUNDBOARD_SOUND_CREATE"',
        noWarn: true,
        replacement: {
            match: /(?<=type:"(?:SOUNDBOARD_SOUNDS_RECEIVED|GUILD_SOUNDBOARD_SOUND_CREATE|GUILD_SOUNDBOARD_SOUND_UPDATE|GUILD_SOUNDBOARD_SOUNDS_UPDATE)".{0,200}?available:)\i\.available/g,
            replace: "!0",
        },
    },
    // Sound picker: list other servers' sounds without the Use External Sounds permission
    {
        find: /getFlattenedGuildIds\(\).{0,100}USE_EXTERNAL_SOUNDS.{0,100}canUseSoundboardEverywhere/,
        replacement: {
            match: /\i\.\i\.can\(\i\.\i\.USE_EXTERNAL_SOUNDS,\i\)/,
            replace: "!0",
        },
    },
    // Soundboard button: do not require the Use Soundboard permission (Speak is still required)
    {
        find: /CALLABLE\.has\(\i\.type\)\)return!0;let \i=\i\.\i\.can\(\i\.\i\.USE_SOUNDBOARD,/,
        replacement: {
            match: /(?<=return \i\.isGuildVoiceOrThread\(\))&&\i&&(\i)/,
            replace: "&&$1",
        },
    },
    {
        find: ".SEND_SOUNDBOARD_SOUND(",
        group: true,
        replacement: [
            // The function that would ask the server to play a sound: play it through the microphone instead
            {
                match: /function \i\((\i),(\i),\i,\i\)\{(?=\(0,\i\.\i\)\(\2,\1\))/,
                replace: "$&return $self.playSound($1,$2);",
            },
            {
                match: /\i\.\i\.can\(\i\.\i\.USE_EXTERNAL_SOUNDS,\i\)/,
                replace: "!0",
            },
        ],
    },
];

/** Treat the user as allowed to use sounds from any server (normally a Nitro perk). */
export const nitroPatches: PluginPatch[] = [
    {
        find: "canUseSoundboardEverywhere:function",
        replacement: {
            match: /(?<=canUseSoundboardEverywhere:function\(\i\)\{)/,
            replace: "return!0;",
        },
    },
];
