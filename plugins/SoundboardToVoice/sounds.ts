/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Fetching and caching of soundboard sound files.
// Kept free of Vencord/Discord imports so it can run under plain node in tests.

export interface SoundCacheOptions {
    fetchBytes(soundId: string): Promise<ArrayBuffer>;
    maxEntries?: number;
}

export function createSoundCache({ fetchBytes, maxEntries = 48 }: SoundCacheOptions) {
    // Insertion order doubles as recency: the first key is the least recently used
    const entries = new Map<string, Promise<ArrayBuffer>>();

    return {
        /** Resolves to a fresh copy of the encoded sound, because decodeAudioData detaches its input. */
        async get(soundId: string): Promise<ArrayBuffer> {
            let entry = entries.get(soundId);
            if (entry != null) {
                entries.delete(soundId);
                entries.set(soundId, entry);
            } else {
                const pending = fetchBytes(soundId);
                entry = pending;
                entries.set(soundId, pending);
                pending.catch(() => {
                    if (entries.get(soundId) === pending) entries.delete(soundId);
                });
                while (entries.size > maxEntries) entries.delete(entries.keys().next().value!);
            }
            return (await entry).slice(0);
        },

        clear(): void {
            entries.clear();
        },
    };
}

/** Combines a sound's own volume (0..1) with the plugin's volume setting in percent (0..200). */
export function toGain(soundVolume: number | null | undefined, volumePercent: number): number {
    const base = Math.max(0, Math.min(1, soundVolume ?? 1));
    const percent = Math.max(0, Math.min(200, Number.isFinite(volumePercent) ? volumePercent : 100));
    return base * percent / 100;
}
