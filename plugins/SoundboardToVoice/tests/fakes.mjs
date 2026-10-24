/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Minimal Web Audio stand-ins: just enough surface for mixer.ts.

class FakeNode {
    connections = [];
    connect(target) {
        this.connections.push(target);
        return target;
    }
    disconnect() {
        this.connections = [];
    }
}

class FakeGain extends FakeNode {
    gain = { value: 1 };
}

class FakeBufferSource extends FakeNode {
    buffer = null;
    onended = null;
    started = false;
    stopped = false;
    start() {
        this.started = true;
    }
    stop() {
        this.stopped = true;
    }
    /** Simulates the sound reaching its natural end. */
    end() {
        this.onended?.();
    }
}

export class FakeTrack {
    enabled = true;
    stopped = false;
    stop() {
        this.stopped = true;
    }
}

export class FakeStream {
    tracks = [new FakeTrack()];
    getTracks() {
        return this.tracks;
    }
    getAudioTracks() {
        return this.tracks;
    }
}

export class FakeAudioContext {
    sources = [];
    createGain() {
        return new FakeGain();
    }
    createMediaStreamSource(stream) {
        const node = new FakeNode();
        node.stream = stream;
        return node;
    }
    createMediaStreamDestination() {
        const node = new FakeNode();
        node.stream = new FakeStream();
        return node;
    }
    createBufferSource() {
        const source = new FakeBufferSource();
        this.sources.push(source);
        return source;
    }
}

/** Mirrors Discord's AudioInput with the plugin's setSpeaking and track patches applied. */
export class FakeInput {
    context = new FakeAudioContext();
    mode = "VOICE_ACTIVITY";
    speaking = false;
    speakingEvents = [];
    stream = null;
    _mute = false;

    constructor(mixer) {
        this.mixer = mixer;
    }

    enable() {
        this.stream = this.mixer.attach(this, new FakeStream());
        return this.stream;
    }

    get mute() {
        return this._mute;
    }

    set mute(value) {
        this._mute = value;
        for (const track of this.stream?.getAudioTracks() ?? []) track.enabled = this.mixer.shouldEnableTrack(this);
        this.setSpeaking(false);
    }

    setSpeaking(speaking) {
        speaking = this.mixer.resolveSpeaking(this, speaking);
        if (this.speaking !== speaking) {
            this.speaking = speaking;
            this.speakingEvents.push(speaking);
        }
    }
}
