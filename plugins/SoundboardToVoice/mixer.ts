/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Mixes soundboard audio into the microphone stream Discord sends to the voice server.
// Kept free of Vencord/Discord imports so it can run under plain node in tests.

/** The parts of Discord's WebRTC AudioInput class the mixer relies on. */
export interface AudioInputLike {
    context: AudioContext;
    mute: boolean;
    mode?: string;
    speaking?: boolean;
    setSpeaking(speaking: boolean): void;
}

interface SoundSource {
    source: AudioBufferSourceNode;
    gain: GainNode;
}

interface Channel {
    input: AudioInputLike;
    microphoneStream: MediaStream;
    microphone: MediaStreamAudioSourceNode;
    microphoneGain: GainNode;
    destination: MediaStreamAudioDestinationNode;
    sounds: Set<SoundSource>;
}

export interface MixerOptions {
    /** Whether sounds should still be sent while the user is self-muted. */
    playWhileMuted(): boolean;
}

export type PlayResult = "started" | "muted" | "no-input";

const PUSH_TO_TALK = "PUSH_TO_TALK";

export function createMixer(options: MixerOptions) {
    const channels = new Map<MediaStream, Channel>();
    // What Discord itself last asked for (voice activity, PTT key, mute), without our override
    const requestedSpeaking = new WeakMap<AudioInputLike, boolean>();

    function channelsOf(input: AudioInputLike): Channel[] {
        return [...channels.values()].filter(channel => channel.input === input);
    }

    function isPlaying(input: AudioInputLike): boolean {
        return channelsOf(input).some(channel => channel.sounds.size > 0);
    }

    function syncMicrophoneGain(input: AudioInputLike): void {
        // With push to talk the mic must stay closed during a sound unless the key is actually held
        const pttClosed = isPlaying(input) && input.mode === PUSH_TO_TALK && !requestedSpeaking.get(input);
        const value = input.mute || pttClosed ? 0 : 1;
        for (const channel of channelsOf(input)) channel.microphoneGain.gain.value = value;
    }

    function syncInput(input: AudioInputLike): void {
        syncMicrophoneGain(input);
        const enabled = !input.mute || isPlaying(input);
        for (const channel of channelsOf(input)) {
            for (const track of channel.destination.stream.getAudioTracks()) track.enabled = enabled;
        }
        // Goes through resolveSpeaking, which keeps the speaking flag raised while a sound plays
        input.setSpeaking(requestedSpeaking.get(input) ?? false);
    }

    function disposeSound(sound: SoundSource): void {
        sound.source.onended = null;
        try {
            sound.source.stop();
        } catch {
            // already stopped
        }
        sound.source.disconnect();
        sound.gain.disconnect();
    }

    function finishSound(channel: Channel, sound: SoundSource): void {
        if (!channel.sounds.delete(sound)) return;
        disposeSound(sound);
        syncInput(channel.input);
    }

    function stopChannel(channel: Channel): void {
        if (channel.sounds.size === 0) return;
        for (const sound of channel.sounds) disposeSound(sound);
        channel.sounds.clear();
        syncInput(channel.input);
    }

    return {
        /** Wraps the stream Discord acquired for `input` and returns the stream it should send instead. */
        attach(input: AudioInputLike, stream: MediaStream): MediaStream {
            const { context } = input;
            const microphone = context.createMediaStreamSource(stream);
            const microphoneGain = context.createGain();
            const destination = context.createMediaStreamDestination();
            microphone.connect(microphoneGain).connect(destination);

            if (!requestedSpeaking.has(input)) requestedSpeaking.set(input, !isPlaying(input) && !!input.speaking);
            channels.set(destination.stream, { input, microphoneStream: stream, microphone, microphoneGain, destination, sounds: new Set() });
            syncMicrophoneGain(input);
            return destination.stream;
        },

        /** Called when Discord releases a stream. Unknown streams are ignored. */
        release(stream: MediaStream): void {
            const channel = channels.get(stream);
            if (channel == null) return;

            const wasPlaying = channel.sounds.size > 0;
            for (const sound of channel.sounds) disposeSound(sound);
            channel.sounds.clear();
            channels.delete(stream);
            channel.microphone.disconnect();
            channel.microphoneGain.disconnect();
            for (const track of channel.microphoneStream.getTracks()) track.stop();

            // Drop our speaking override, otherwise it would stick until Discord next touches the flag
            if (wasPlaying && !isPlaying(channel.input)) {
                channel.input.setSpeaking(requestedSpeaking.get(channel.input) ?? false);
            }
        },

        /** Replacement for Discord's `track.enabled = !mute`. */
        shouldEnableTrack(input: AudioInputLike): boolean {
            if (input.mute && !options.playWhileMuted()) channelsOf(input).forEach(stopChannel);
            return !input.mute || isPlaying(input);
        },

        /** Hooked into AudioInput.setSpeaking: records what Discord wants and returns what it should get. */
        resolveSpeaking(input: AudioInputLike, speaking: boolean): boolean {
            if (channelsOf(input).length === 0) return speaking;

            requestedSpeaking.set(input, speaking);
            syncMicrophoneGain(input);
            return speaking || isPlaying(input);
        },

        play(buffer: AudioBuffer, volume: number): PlayResult {
            if (channels.size === 0) return "no-input";

            const targets = [...channels.values()].filter(({ input }) => !input.mute || options.playWhileMuted());
            if (targets.length === 0) return "muted";

            for (const channel of targets) {
                const { context } = channel.input;
                const source = context.createBufferSource();
                const gain = context.createGain();
                source.buffer = buffer;
                gain.gain.value = volume;
                source.connect(gain).connect(channel.destination);

                const sound: SoundSource = { source, gain };
                source.onended = () => finishSound(channel, sound);
                channel.sounds.add(sound);
                syncInput(channel.input);
                source.start();
            }
            return "started";
        },

        stopAll(): void {
            for (const channel of channels.values()) stopChannel(channel);
        },

        isPlaying,

        hasInputs(): boolean {
            return channels.size > 0;
        },

        getContext(): AudioContext | undefined {
            return channels.values().next().value?.input.context;
        },
    };
}

export type Mixer = ReturnType<typeof createMixer>;
