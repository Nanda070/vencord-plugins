# Vencord-FakeDeafenDetector

Flags server members who get caught speaking (a `SPEAKING` event) while their voice state claims to be self-muted or self-deafened — the tell for the trick used by [Vencord-FakeDeafen](https://github.com/hyyven/Vencord-FakeDeafen) and similar plugins, since Discord's voice server keeps forwarding audio regardless of the `self_mute`/`self_deaf` flag.

Flagged members get a 🚩 next to their name in the server member list, with a tooltip showing how many times they were caught and when. It can only ever flag people who are in the same voice channel as you, since `SPEAKING` events only arrive for your own voice connection.

Once someone is caught, the flag is saved to disk (`rememberAcrossRestarts` setting, on by default) and stays forever, even after leaving the channel or restarting Discord — one slip-up is enough.

## Limitation

This cannot catch someone who stays truly silent the whole time: if no audio ever leaves their machine (voice activation never triggers, or push-to-talk is never pressed), that is byte-for-byte identical to a real mute and there is nothing to observe on the network. This is a heuristic, not proof — treat a flag as "worth a second look", not a verdict.

## Install

This is a Vencord *userplugin* (source-only, not on the plugin store), so it needs a local Vencord dev build.

1. **Get Vencord's source** (skip if you already have a checkout you build from):
   ```
   git clone https://github.com/Vendicated/Vencord
   cd Vencord
   pnpm install --frozen-lockfile
   ```
2. **Drop this plugin in**: copy this whole folder into `src/userplugins/` so the path is `src/userplugins/FakeDeafenDetector/index.tsx` (and `settings.ts` next to it).
   ```
   git clone https://github.com/<your-username>/Vencord-FakeDeafenDetector src/userplugins/FakeDeafenDetector
   ```
   (or just copy/paste the folder by hand — either works, it doesn't need to be a git repo)
3. **Build and inject**:
   ```
   pnpm build
   pnpm inject
   ```
   Follow the prompts to point it at your Discord install, then fully restart Discord (quit from the tray icon, not just close the window).
4. **Enable it**: Discord Settings → Vencord → Plugins → search "FakeDeafenDetector" → toggle it on.

To update later: `git pull` inside `src/userplugins/FakeDeafenDetector` (if cloned) or re-copy the files, then `pnpm build` again — no need to re-run `pnpm inject`.
