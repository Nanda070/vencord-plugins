/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { isPluginEnabled } from "@api/PluginManager";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { FluxDispatcher, showToast } from "@webpack/common";

import { AudioInputLike, createMixer } from "./mixer";
import { audioPatches, enginePatches, nitroPatches, soundboardPatches } from "./patches";
import { settings } from "./settings";
import { createSoundCache, toGain } from "./sounds";

interface SoundboardSound {
    soundId: string;
    guildId?: string;
    volume?: number;
}

const logger = new Logger("SoundboardToVoice");

const mixer = createMixer({
    playWhileMuted: () => settings.store.playWhileMuted,
});

const sounds = createSoundCache({
    async fetchBytes(soundId) {
        const response = await fetch(`https://${window.GLOBAL_ENV.CDN_HOST}/soundboard-sounds/${encodeURIComponent(soundId)}`);
        if (!response.ok) throw new Error(`Soundboard sound request failed with status ${response.status}`);
        return response.arrayBuffer();
    },
});

export default definePlugin({
    name: "SoundboardToVoice",
    description: "Plays Discord soundboard sounds through your microphone, so they work without Nitro or the Use Soundboard permission.",
    authors: [{ name: "Nandak070", id: 1219803151180370021n }],
    tags: ["Fun", "Voice"],
    settings,

    patches: [
        ...enginePatches.map(patch => ({ ...patch, predicate: () => IS_DISCORD_DESKTOP && settings.store.forceWebRTC })),
        ...audioPatches,
        ...soundboardPatches,
        ...nitroPatches.map(patch => ({ ...patch, predicate: () => settings.store.unlockAllSounds })),
    ],

    mixInput(input: AudioInputLike, stream: MediaStream): MediaStream {
        try {
            return mixer.attach(input, stream);
        } catch (error) {
            // Never break the microphone over this: fall back to Discord's own stream
            logger.error("Failed to set up the microphone mixer", error);
            return stream;
        }
    },

    releaseInput(stream: MediaStream): void {
        mixer.release(stream);
    },

    shouldEnableInput(input: AudioInputLike): boolean {
        return mixer.shouldEnableTrack(input);
    },

    resolveSpeaking(input: AudioInputLike, speaking: boolean): boolean {
        return mixer.resolveSpeaking(input, speaking);
    },

    async playSound(sound: SoundboardSound, channelId: string): Promise<void> {
        const context = mixer.getContext();
        if (context == null) {
            showToast({
                text: IS_DISCORD_DESKTOP && !settings.store.forceWebRTC
                    ? "SoundboardToVoice needs its WebRTC engine setting enabled on Discord Desktop."
                    : "Join a voice channel before playing a sound.",
                variant: "critical",
            });
            return;
        }

        try {
            await context.resume();
            const buffer = await context.decodeAudioData(await sounds.get(sound.soundId));

            const result = mixer.play(buffer, toGain(sound.volume, settings.store.volume));
            if (result !== "started") {
                showToast({ text: result === "muted" ? "You are muted, so the sound was not sent." : "Join a voice channel before playing a sound.", variant: "critical" });
                return;
            }

            // Discord's own local playback, exactly as if the sound had been sent the official way
            if (settings.store.hearSounds) FluxDispatcher.dispatch({ type: "GUILD_SOUNDBOARD_SOUND_PLAY_LOCALLY", sound, channelId });
            FluxDispatcher.dispatch({ type: "SOUNDBOARD_TRACK_USAGE", soundId: sound.soundId });
        } catch (error) {
            logger.error("Failed to play a soundboard sound through the microphone", error);
            showToast({ text: "Couldn't play this sound through your microphone.", variant: "critical" });
        }
    },

    start() {
        // It patches the same Discord code, and whichever plugin patches first wins
        if (isPluginEnabled("SoundboardPermissionsBypass")) {
            showNotification({
                title: "SoundboardToVoice",
                body: "Disable the SoundboardPermissionsBypass plugin and restart Discord. The two plugins conflict.",
                permanent: true,
                noPersist: true,
            });
        }
    },

    stop() {
        mixer.stopAll();
        sounds.clear();
    },
});
