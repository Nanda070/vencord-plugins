/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { createMixer } from "../mixer.ts";
import { FakeInput, FakeStream } from "./fakes.mjs";

// attach() creates the microphone gain before any sound gain, so the first gain node is the microphone's.
function trackMicrophoneGain(input) {
    const original = input.context.createGain.bind(input.context);
    input.context.createGain = () => {
        const node = original();
        input.microphoneGain ??= node;
        return node;
    };
}

function setup({ playWhileMuted = true } = {}) {
    const mixer = createMixer({ playWhileMuted: () => playWhileMuted });
    const input = new FakeInput(mixer);
    trackMicrophoneGain(input);
    const stream = input.enable();
    return { mixer, input, stream };
}

const buffer = { duration: 1 };

test("play reports no-input when Discord has not acquired a microphone stream", () => {
    const mixer = createMixer({ playWhileMuted: () => true });
    assert.equal(mixer.play(buffer, 1), "no-input");
    assert.equal(mixer.hasInputs(), false);
});

test("attach returns a different stream and passes the microphone through", () => {
    const { mixer, input, stream } = setup();
    assert.ok(stream instanceof FakeStream);
    assert.equal(mixer.hasInputs(), true);
    assert.equal(mixer.getContext(), input.context);
    assert.equal(input.microphoneGain.gain.value, 1);
});

test("a sound raises the speaking flag and lowers it again when it ends", () => {
    const { mixer, input } = setup();

    assert.equal(mixer.play(buffer, 0.5), "started");
    const [source] = input.context.sources;
    assert.equal(source.started, true);
    assert.equal(source.buffer, buffer);
    assert.equal(source.connections[0].gain.value, 0.5);
    assert.equal(input.speaking, true);
    assert.equal(mixer.isPlaying(input), true);

    source.end();
    assert.equal(input.speaking, false);
    assert.equal(mixer.isPlaying(input), false);
    assert.deepEqual(input.speakingEvents, [true, false]);
});

test("Discord cannot clear the speaking flag while a sound is playing", () => {
    const { mixer, input } = setup();
    mixer.play(buffer, 1);

    input.setSpeaking(false);
    assert.equal(input.speaking, true);
});

test("speaking stays raised after the sound if the user is still talking", () => {
    const { mixer, input } = setup();
    input.setSpeaking(true);
    mixer.play(buffer, 1);

    input.context.sources[0].end();
    assert.equal(input.speaking, true);
    assert.deepEqual(input.speakingEvents, [true]);
});

test("overlapping sounds keep speaking raised until the last one ends", () => {
    const { mixer, input } = setup();
    mixer.play(buffer, 1);
    mixer.play(buffer, 1);
    const [first, second] = input.context.sources;

    first.end();
    assert.equal(input.speaking, true);
    second.end();
    assert.equal(input.speaking, false);
});

test("while muted the sound is sent but the microphone stays silent", () => {
    const { mixer, input, stream } = setup();
    input.mute = true;
    assert.equal(stream.getAudioTracks()[0].enabled, false);
    assert.equal(input.microphoneGain.gain.value, 0);

    assert.equal(mixer.play(buffer, 1), "started");
    assert.equal(stream.getAudioTracks()[0].enabled, true);
    assert.equal(input.microphoneGain.gain.value, 0);
    assert.equal(input.speaking, true);

    input.context.sources[0].end();
    assert.equal(stream.getAudioTracks()[0].enabled, false);
    assert.equal(input.speaking, false);
});

test("with playWhileMuted off a muted user sends nothing", () => {
    const { mixer, input } = setup({ playWhileMuted: false });
    input.mute = true;

    assert.equal(mixer.play(buffer, 1), "muted");
    assert.equal(input.context.sources.length, 0);
    assert.equal(input.speaking, false);
});

test("with playWhileMuted off muting mid-sound stops the sound", () => {
    const { mixer, input, stream } = setup({ playWhileMuted: false });
    mixer.play(buffer, 1);

    input.mute = true;
    assert.equal(input.context.sources[0].stopped, true);
    assert.equal(mixer.isPlaying(input), false);
    assert.equal(stream.getAudioTracks()[0].enabled, false);
    assert.equal(input.speaking, false);
});

test("unmuting reopens the microphone", () => {
    const { mixer, input, stream } = setup();
    input.mute = true;
    input.mute = false;
    assert.equal(input.microphoneGain.gain.value, 1);
    assert.equal(stream.getAudioTracks()[0].enabled, true);
});

test("push to talk: the microphone stays closed during a sound unless the key is held", () => {
    const { mixer, input } = setup();
    input.mode = "PUSH_TO_TALK";

    mixer.play(buffer, 1);
    assert.equal(input.microphoneGain.gain.value, 0);
    assert.equal(input.speaking, true);

    input.setSpeaking(true); // key pressed
    assert.equal(input.microphoneGain.gain.value, 1);

    input.setSpeaking(false); // key released, sound still playing
    assert.equal(input.microphoneGain.gain.value, 0);
    assert.equal(input.speaking, true);

    input.context.sources[0].end();
    assert.equal(input.microphoneGain.gain.value, 1);
    assert.equal(input.speaking, false);
});

test("push to talk: holding the key through the end of a sound keeps the user audible", () => {
    const { mixer, input } = setup();
    input.mode = "PUSH_TO_TALK";
    mixer.play(buffer, 1);
    input.setSpeaking(true);

    input.context.sources[0].end();
    assert.equal(input.speaking, true);
    assert.equal(input.microphoneGain.gain.value, 1);
});

test("stopAll stops every sound and restores the speaking flag", () => {
    const { mixer, input } = setup();
    mixer.play(buffer, 1);
    mixer.play(buffer, 1);

    mixer.stopAll();
    assert.ok(input.context.sources.every(source => source.stopped));
    assert.equal(input.speaking, false);
    assert.equal(mixer.isPlaying(input), false);
});

test("release stops the wrapped microphone tracks and forgets the stream", () => {
    const mixer = createMixer({ playWhileMuted: () => true });
    const input = new FakeInput(mixer);
    const microphone = new FakeStream();
    const mixed = mixer.attach(input, microphone);
    input.stream = mixed;

    mixer.release(mixed);
    assert.equal(microphone.getTracks()[0].stopped, true);
    assert.equal(mixer.hasInputs(), false);
    assert.equal(mixer.play(buffer, 1), "no-input");
});

test("release during a sound drops the speaking override", () => {
    const { mixer, input, stream } = setup();
    mixer.play(buffer, 1);
    assert.equal(input.speaking, true);

    mixer.release(stream);
    assert.equal(input.speaking, false);
});

test("release ignores streams the mixer does not own", () => {
    const { mixer } = setup();
    const foreign = new FakeStream();
    mixer.release(foreign);
    assert.equal(foreign.getTracks()[0].stopped, false);
    assert.equal(mixer.hasInputs(), true);
});

test("resolveSpeaking leaves untracked inputs alone", () => {
    const mixer = createMixer({ playWhileMuted: () => true });
    const stranger = new FakeInput(mixer);
    assert.equal(mixer.resolveSpeaking(stranger, false), false);
    assert.equal(mixer.resolveSpeaking(stranger, true), true);
});

test("a sound is mixed into every attached input", () => {
    const mixer = createMixer({ playWhileMuted: () => true });
    const first = new FakeInput(mixer);
    const second = new FakeInput(mixer);
    first.enable();
    second.enable();

    mixer.play(buffer, 1);
    assert.equal(first.context.sources.length, 1);
    assert.equal(second.context.sources.length, 1);
    assert.equal(first.speaking, true);
    assert.equal(second.speaking, true);
});
