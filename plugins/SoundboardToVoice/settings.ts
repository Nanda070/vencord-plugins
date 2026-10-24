/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    volume: {
        type: OptionType.SLIDER,
        description: "Volume of the sounds other people hear, in percent",
        markers: [0, 25, 50, 75, 100, 125, 150, 175, 200],
        default: 100,
        stickToMarkers: false,
    },
    hearSounds: {
        type: OptionType.BOOLEAN,
        description: "Also play the sound to yourself (uses Discord's own soundboard volume)",
        default: true,
    },
    playWhileMuted: {
        type: OptionType.BOOLEAN,
        description: "Send sounds even while you are muted (your microphone itself stays muted)",
        default: true,
    },
    unlockAllSounds: {
        type: OptionType.BOOLEAN,
        description: "Offer sounds from all your servers in every channel, which normally needs Nitro",
        default: true,
        restartNeeded: true,
    },
    forceWebRTC: {
        type: OptionType.BOOLEAN,
        description: "Discord Desktop only: run voice on the WebRTC engine. Required there, because the native engine's microphone cannot be mixed into. Turn off to go back to the native engine (sounds will then not be sent)",
        default: true,
        restartNeeded: true,
    },
});
