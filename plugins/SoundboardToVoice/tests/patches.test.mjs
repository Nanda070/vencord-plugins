/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Applies every patch to a short excerpt of the Discord code it targets (build 634304)
// and checks the exact result. Catches mistakes in the regexes and replacement strings.
// tools/check-patches.mjs is the complement: it checks that the excerpts still exist in a live bundle.

import assert from "node:assert/strict";
import { test } from "node:test";

import { audioPatches, enginePatches, nitroPatches, soundboardPatches } from "../patches.ts";
import { applyPatch, canonicalizeMatch, moduleMatchesFind } from "../tools/lib/vencord-patch.mjs";

function patchWith(patch, code) {
    assert.ok(moduleMatchesFind(code, patch.find), `find does not match: ${patch.find}`);
    const result = applyPatch(code, patch);
    assert.ok(result.effects.every(Boolean), `a replacement had no effect: ${JSON.stringify(result.effects)}`);
    return result.code;
}

test("\\i matches minified identifiers, including $ and _", () => {
    const regex = canonicalizeMatch(/^\i\.\i$/);
    assert.ok(regex.test("a.b"));
    assert.ok(regex.test("$e._t1"));
    assert.ok(!regex.test("1a.b"));
});

test("engine: only the WebRTC engine is offered", () => {
    assert.equal(
        patchWith(enginePatches[0], "function E(){return[o.Ku.NATIVE,o.Ku.WEBRTC].find(e=>_(e).supported())??o.Ku.DUMMY}"),
        "function E(){return[o.Ku.WEBRTC].find(e=>_(e).supported())??o.Ku.DUMMY}",
    );
});

test("engine: DAVE is fetched outside of web too", () => {
    assert.equal(
        patchWith(enginePatches[1], "fetchAsyncResources(){let e={fetchDave:(0,p.isWeb)()};return tt.fetchAsyncResources(e)}"),
        "fetchAsyncResources(){let e={fetchDave:!0};return tt.fetchAsyncResources(e)}",
    );
});

test("engine: every Chrome capability check also accepts Electron", () => {
    assert.equal(
        patchWith(
            enginePatches[2],
            'o=s||"Chrome"===r().name&&a>=37||"Electron"===r().name&&a>=1||"Safari"===r().name&&a>=13,d="Chrome"===r().name||"Safari"===r().name',
        ),
        'o=s||("Electron"===r().name||"Chrome"===r().name&&a>=37)||"Electron"===r().name&&a>=1||"Safari"===r().name&&a>=13,d=("Electron"===r().name||"Chrome"===r().name)||"Safari"===r().name',
    );
});

test("engine: voice processing is reported as supported", () => {
    assert.equal(
        patchWith(enginePatches[3], 'Error("AudioInput: No MediaStream");case D.O5.VOICE_PROCESSING:return"Chrome"===A().name;case D.O5.NATIVE_PING:'),
        'Error("AudioInput: No MediaStream");case D.O5.VOICE_PROCESSING:return!0;case D.O5.NATIVE_PING:',
    );
});

test("audio: AudioInput is routed through the plugin", () => {
    const code = [
        "class B{acquire(e){return navigator.mediaDevices.getUserMedia(e)}release(e){e.getTracks().forEach(e=>{e.stop()})}}",
        'throw Error("AudioInput: No MediaStream");',
        "this.stream=a.stream}catch(t){this.stream=e}else this.stream=e;return this.updateMode(),this.updateAudioTracks(),e}",
        'setSpeaking(e){this.speaking!==e&&(this.speaking=e,this.emit("speaking",e))}',
        "updateAudioTracks(){for(let t=0;t<n;t++)e[t].enabled=!this._mute}",
    ].join("");

    assert.equal(patchWith(audioPatches[0], code), [
        "class B{acquire(e){return navigator.mediaDevices.getUserMedia(e)}release(e){$self.releaseInput(e);e.getTracks().forEach(e=>{e.stop()})}}",
        'throw Error("AudioInput: No MediaStream");',
        "this.stream=a.stream}catch(t){this.stream=e}else this.stream=e;this.stream=$self.mixInput(this,this.stream);return this.updateMode(),this.updateAudioTracks(),e}",
        'setSpeaking(e){e=$self.resolveSpeaking(this,e);this.speaking!==e&&(this.speaking=e,this.emit("speaking",e))}',
        "updateAudioTracks(){for(let t=0;t<n;t++)e[t].enabled=$self.shouldEnableInput(this)}",
    ].join(""));
});

test("soundboard: every sound is marked available", () => {
    assert.equal(
        patchWith(
            soundboardPatches[0],
            'eW({type:"GUILD_SOUNDBOARD_SOUND_CREATE",sound:{guildId:e.guild_id,volume:e.volume,available:e.available}})',
        ),
        'eW({type:"GUILD_SOUNDBOARD_SOUND_CREATE",sound:{guildId:e.guild_id,volume:e.volume,available:!0}})',
    );
});

test("soundboard: the picker ignores the Use External Sounds permission", () => {
    assert.equal(
        patchWith(
            soundboardPatches[1],
            "_=(0,r.bG)([s.Ay],()=>s.Ay.getFlattenedGuildIds()),E=(0,r.bG)([a.A],()=>null==e||a.A.can(c.xB.USE_EXTERNAL_SOUNDS,e));if((o.Ay.canUseSoundboardEverywhere(n)||!t)&&E)",
        ),
        "_=(0,r.bG)([s.Ay],()=>s.Ay.getFlattenedGuildIds()),E=(0,r.bG)([a.A],()=>null==e||!0);if((o.Ay.canUseSoundboardEverywhere(n)||!t)&&E)",
    );
});

test("soundboard: Use Soundboard is not required, Speak still is", () => {
    assert.equal(
        patchWith(
            soundboardPatches[2],
            "if(s.kvI.CALLABLE.has(e.type))return!0;let t=r.A.can(s.xBc.USE_SOUNDBOARD,e),n=r.A.can(s.xBc.SPEAK,e);return e.isGuildVoiceOrThread()&&t&&n}",
        ),
        "if(s.kvI.CALLABLE.has(e.type))return!0;let t=r.A.can(s.xBc.USE_SOUNDBOARD,e),n=r.A.can(s.xBc.SPEAK,e);return e.isGuildVoiceOrThread()&&n}",
    );
});

test("soundboard: sending a sound is replaced by the plugin", () => {
    const code = [
        'function j(e,t){return t?.guild_id==null||P.A.can(N.xBc.USE_EXTERNAL_SOUNDS,t)||"0"===e.guildId}',
        "function K(e,t,n,i){(0,x.qP)(t,e),function(e,t){A.Bo.post({url:N.Rsh.SEND_SOUNDBOARD_SOUND(e)})}(t,e)}",
    ].join("");

    assert.equal(patchWith(soundboardPatches[3], code), [
        'function j(e,t){return t?.guild_id==null||!0||"0"===e.guildId}',
        "function K(e,t,n,i){return $self.playSound(e,t);(0,x.qP)(t,e),function(e,t){A.Bo.post({url:N.Rsh.SEND_SOUNDBOARD_SOUND(e)})}(t,e)}",
    ].join(""));
});

test("nitro: sounds from every server are allowed", () => {
    assert.equal(
        patchWith(nitroPatches[0], "canUseSoundboardEverywhere:function(e){return e_(G,e)},canUseCustomCallSounds:function(e){return e_(x,e)}"),
        "canUseSoundboardEverywhere:function(e){return!0;return e_(G,e)},canUseCustomCallSounds:function(e){return e_(x,e)}",
    );
});

test("every patch is covered by a test above", () => {
    assert.deepEqual(
        [enginePatches.length, audioPatches.length, soundboardPatches.length, nitroPatches.length],
        [4, 1, 4, 1],
        "a patch was added or removed: update the tests in this file",
    );
});
