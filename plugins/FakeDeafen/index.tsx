import ErrorBoundary from "@components/ErrorBoundary";
import { useForceUpdater } from "@utils/react";
import definePlugin from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { ChannelStore, MediaEngineStore, SelectedChannelStore, useEffect } from "@webpack/common";

import Settings from "./settings";

const Button = findComponentByCodeLazy(".GREEN,positionKeyStemOverride:");
const GatewayConnectionStore = findByPropsLazy("getSocket");

// op code 4 = voiceStateUpdate
const VOICE_STATE_UPDATE = 4;

let enabled = false;
const listeners = new Set<() => void>();
// objects whose send we replaced, mapped to the original send
const hooked = new Map<any, (...args: any[]) => any>();

function hookedSend(this: any, op: number, data: any, ...args: any[]) {
    if (op === VOICE_STATE_UPDATE && enabled && data) {
        // copy instead of mutating, Discord may reuse this object for its own local voice state
        data = { ...data };
        if (Settings.store.fakeMute) data.self_mute = true;
        if (Settings.store.fakeDeafen) data.self_deaf = true;
    }
    const original = hooked.get(this) ?? hooked.get(Object.getPrototypeOf(this));
    return original!.apply(this, [op, data, ...args]);
}

// hooks send on whatever owns it (the class prototype, or the instance if send is an own property),
// so the hook survives reconnects and works even if the socket didn't exist when the plugin started
function ensureHooked() {
    const socket = GatewayConnectionStore.getSocket?.();
    if (!socket) {
        console.error("[FakeDeafen] socket not found");
        return null;
    }

    const owner = Object.hasOwn(socket, "send") ? socket : Object.getPrototypeOf(socket);
    if (owner.send !== hookedSend) {
        hooked.set(owner, owner.send);
        owner.send = hookedSend;
    }
    return socket;
}

function unhookAll() {
    for (const [owner, original] of hooked) owner.send = original;
    hooked.clear();
}

function refresh_voice_state() {
    const socket = ensureHooked();
    const channelId = SelectedChannelStore.getVoiceChannelId();
    if (!socket || !channelId) return;

    try {
        // the hooked send applies the fake mute/deafen on top of the real state
        socket.send(VOICE_STATE_UPDATE, {
            guild_id: ChannelStore.getChannel(channelId)?.guild_id ?? null,
            channel_id: channelId,
            self_mute: MediaEngineStore.isSelfMute(),
            self_deaf: MediaEngineStore.isSelfDeaf(),
            self_video: MediaEngineStore.isVideoEnabled(),
            flags: 0
        });
        console.log("[FakeDeafen] voice state updated to", enabled ? "fake deafen" : "normal");
    } catch (error) {
        console.error("[FakeDeafen] failed to update voice state:", error);
    }
}

function fd_icon() {
    const iconColor = enabled ? "#ed4245" : "currentColor";

    return (
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
            <rect x="6" y="8" width="20" height="4" rx="2" fill={iconColor} />
            <rect x="11" y="3" width="10" height="8" rx="3" fill={iconColor} />
            {enabled ? (
                <>
                    <line x1="7" y1="18" x2="13" y2="24" stroke={iconColor} strokeWidth="2" />
                    <line x1="13" y1="18" x2="7" y2="24" stroke={iconColor} strokeWidth="2" />
                    <line x1="19" y1="18" x2="25" y2="24" stroke={iconColor} strokeWidth="2" />
                    <line x1="25" y1="18" x2="19" y2="24" stroke={iconColor} strokeWidth="2" />
                    <path d="M14 23c1-1 3-1 4 0" stroke={iconColor} strokeWidth="2" strokeLinecap="round" />
                </>
            ) : (
                <>
                    <circle cx="10" cy="21" r="4" stroke={iconColor} strokeWidth="2" fill="none" />
                    <circle cx="22" cy="21" r="4" stroke={iconColor} strokeWidth="2" fill="none" />
                    <path d="M14 21c1 1 3 1 4 0" stroke={iconColor} strokeWidth="2" strokeLinecap="round" />
                </>
            )}
        </svg>
    );
}

function toggleEnabled() {
    enabled = !enabled;
    refresh_voice_state();
    listeners.forEach(l => l());
}

function handleKeyDown(event: KeyboardEvent) {
    if (Settings.store.enableKeybind && event.ctrlKey && event.shiftKey && event.code === "KeyQ") {
        event.preventDefault();
        toggleEnabled();
    }
}

function fd_button(props: { nameplate?: any; }) {
    const forceUpdate = useForceUpdater();
    useEffect(() => {
        listeners.add(forceUpdate);
        return () => void listeners.delete(forceUpdate);
    }, []);

    return (
        <Button
            tooltipText={enabled ? "Disable Fake Deafen" : "Enable Fake Deafen"}
            icon={fd_icon}
            role="switch"
            ariaChecked={enabled}
            redGlow={enabled}
            plated={props?.nameplate != null}
            onClick={toggleEnabled}
        />
    );
}

export default definePlugin({
    name: "FakeDeafen",
    description: "Fake deafen yourself",
    authors: [{ name: "Nandak070", id: 1219803151180370021n }],
    settings: Settings,

    start() {
        ensureHooked();
        window.addEventListener("keydown", handleKeyDown);
    },

    stop() {
        if (enabled) {
            enabled = false;
            refresh_voice_state();
        }
        unhookAll();
        window.removeEventListener("keydown", handleKeyDown);
    },

    patches: [
        {
            find: "#{intl::USER_PROFILE_ACCOUNT_POPOUT_BUTTON_A11Y_LABEL}",
            predicate: () => Settings.store.showButton,
            replacement: {
                match: /children:\[(?=[^}]*accountContainerRef)/,
                replace: "children:[$self.fd_button(arguments[0]),"
            }
        }
    ],

    fd_button: ErrorBoundary.wrap(fd_button, { noop: true }),
});