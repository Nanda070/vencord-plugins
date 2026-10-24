import * as DataStore from "@api/DataStore";
import { addMemberListDecorator, removeMemberListDecorator } from "@api/MemberListDecorators";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { FluxDispatcher } from "@webpack/common";
import Settings from "./settings";

const VoiceStateStore = findStoreLazy("VoiceStateStore");
const STORE_KEY = "FakeDeafenDetector_suspects";

interface Suspect {
    count: number;
    firstSeen: number;
    lastSeen: number;
}

// userIds caught talking at least once while their voice state claimed to be self-muted/self-deafened.
// This is how the trick the FakeDeafen plugin itself uses gets exposed: Discord's voice server does
// not stop forwarding audio just because self_mute/self_deaf is set, it's purely a flag the gateway
// broadcasts for everyone else's UI. A genuinely muted client never encodes/sends audio in the first
// place, so a single SPEAKING event while "muted" is a strong, permanent tell - once caught, always
// caught, which matters a lot since plenty of people only slip up once (a laugh, a forgotten PTT key)
// and stay dead silent the rest of the time. Silence itself is not detectable: no audio ever leaves
// the wire, so a careful, consistently-silent fake mute is indistinguishable from a real one.
let suspects: Record<string, Suspect> = {};
let saveScheduled = false;

function scheduleSave() {
    if (saveScheduled) return;
    saveScheduled = true;
    queueMicrotask(() => {
        saveScheduled = false;
        DataStore.set(STORE_KEY, suspects);
    });
}

function isClaimingSilence(userId: string): boolean {
    const state = VoiceStateStore?.getVoiceStateForUser?.(userId);
    return !!(state && (state.selfMute || state.selfDeaf));
}

function onSpeaking({ userId, speakingFlags, context }: { userId: string; speakingFlags: number; context?: string; }) {
    if (context && context !== "default") return; // ignore "go live" stream audio context
    if (!(speakingFlags & 1)) return; // bit 0 = actual voice activity
    if (!userId || !isClaimingSilence(userId)) return;

    const now = Date.now();
    const existing = suspects[userId];
    if (existing) {
        existing.count++;
        existing.lastSeen = now;
    } else {
        suspects[userId] = { count: 1, firstSeen: now, lastSeen: now };
        console.log("[FakeDeafenDetector] flagged", userId, "as a suspected fake mute/deafen user");
    }
    scheduleSave();
}

function suspectBadge({ user }: { user?: { id: string; }; }) {
    const suspect = user && suspects[user.id];
    if (!suspect) return null;

    return (
        <span
            title={`Caught speaking ${suspect.count}x while shown as muted/deafened (first: ${new Date(suspect.firstSeen).toLocaleDateString()}) - likely faking it`}
            style={{ marginLeft: 4, cursor: "help" }}
        >
            🚩
        </span>
    );
}

export default definePlugin({
    name: "FakeDeafenDetector",
    description: "Flags members who get caught speaking while their voice state claims to be muted/deafened (a tell for fake deafen tricks)",
    authors: [{ name: "Nandak070", id: 1219803151180370021n }],
    settings: Settings,

    async start() {
        suspects = Settings.store.rememberAcrossRestarts
            ? (await DataStore.get<Record<string, Suspect>>(STORE_KEY)) ?? {}
            : {};
        FluxDispatcher.subscribe("SPEAKING", onSpeaking);
        addMemberListDecorator("FakeDeafenDetector", suspectBadge);
    },

    stop() {
        FluxDispatcher.unsubscribe("SPEAKING", onSpeaking);
        removeMemberListDecorator("FakeDeafenDetector");
        suspects = {};
    },
});
