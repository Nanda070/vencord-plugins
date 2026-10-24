# SoundboardToVoice

**English** | [Русский](README.ru.md)

A [Vencord](https://vencord.dev) userplugin that plays Discord soundboard sounds **through your microphone**.
You click a sound in the normal soundboard panel, and the people in the voice channel hear it as part of your voice stream.

Because the sound never goes through Discord's soundboard feature, it works:

- without Nitro, including sounds from your other servers;
- in channels where you lack the *Use Soundboard* or *Use External Sounds* permission;
- in servers, DMs and group calls.

It works on the official **Discord Desktop** app, as well as Vesktop and the browser.

> [!WARNING]
> Client mods are against Discord's Terms of Service, and this plugin deliberately gets around a paid feature and a server permission. Use it at your own risk and respect the rules of the servers you are in.

## How it works, in short

Discord Desktop normally captures your microphone in a native module that JavaScript cannot touch. The plugin switches voice to Discord's own WebRTC engine (the one the browser version uses), where the microphone is an ordinary Web Audio stream. It then wraps that stream, mixes the sound into it, and keeps your "speaking" state correct while the sound plays.

Details: [docs/en/how-it-works.md](docs/en/how-it-works.md).

## Requirements

- Vencord **built from source**. Userplugins cannot be added to the prebuilt installer version. See [Vencord's guide](https://docs.vencord.dev/installing/).
- git, Node.js and pnpm (you already have them if you built Vencord).

## Install

1. Open a terminal in your Vencord folder and clone the plugin into `src/userplugins`. Create that folder if it does not exist.

   ```bash
   cd src/userplugins
   git clone https://github.com/Nanda070/SoundboardToVoice soundboardToVoice
   cd ../..
   ```

2. Build Vencord.

   ```bash
   pnpm build
   ```

   If this Vencord build is not injected into Discord yet, also run `pnpm inject`.

3. Restart Discord completely (quit it from the tray).
4. Open **Settings → Vencord → Plugins**, enable **SoundboardToVoice**, and restart when asked.
5. If you use **SoundboardPermissionsBypass**, disable it. Both plugins patch the same code and conflict.

## Update

```bash
cd src/userplugins/soundboardToVoice
git pull
cd ../../..
pnpm build
```

Then restart Discord.

## Use

Join a voice channel, open the soundboard, click a sound. That's it.

- Others hear the sound from you, at your user volume. They do not see the soundboard animation.
- While you are muted the sound is still sent (your microphone stays silent). This can be turned off.
- With push to talk you do not need to hold the key: the plugin opens transmission for the length of the sound, and your microphone stays closed unless you actually hold the key.

## Settings

| Setting | Default | What it does |
|---|---|---|
| Volume | 100% | Volume of the sounds other people hear (0–200%). |
| Hear Sounds | on | Also plays the sound to you, using Discord's own soundboard volume. |
| Play While Muted | on | Sends sounds while you are self-muted. |
| Unlock All Sounds | on | Offers sounds from all your servers in every channel. Needs a restart. |
| Force WebRTC | on | Discord Desktop only: runs voice on the WebRTC engine. Required there. Needs a restart. |

## Limitations

- **The WebRTC engine is not the native engine.** On Discord Desktop, noise suppression options can differ (Krisp may not be available), and features tied to the native engine such as screen share audio, clips and the in-game overlay have not been verified with this plugin. If something you need breaks, turn off *Force WebRTC* or the plugin, and restart.
- **Discord updates can break it.** The plugin patches minified Discord code. When a patch stops matching, Vencord logs a warning and that part stops working until the patch is fixed. See [Troubleshooting](#troubleshooting).
- A server mute or a stage "audience" role still silences you, sounds included.
- Vesktop and the browser should work (they already use the WebRTC engine), but only Discord Desktop on Windows has been tested.

## Troubleshooting

**"Join a voice channel before playing a sound"** while you are in one: the plugin has no microphone stream to mix into. On Discord Desktop make sure *Force WebRTC* is on and that you restarted. If you just enabled the plugin, leave and rejoin the channel.

**Stuck on "Authenticating"** or **"Video and Screen Share are not supported in this browser"**: one of the engine patches no longer applies. Run the patch checker below.

**Nothing happens, or others cannot hear the sound**: open the console with `Ctrl+Shift+I` and look for Vencord warnings mentioning `SoundboardToVoice`, then run the patch checker.

### Patch checker

Tells you which patch broke after a Discord update, without starting Discord. It downloads Discord's current web bundle, applies every patch to it, and checks that the result is still valid JavaScript.

```bash
node tools/check-patches.mjs
```

Use `--channel canary` or `--channel ptb` for the other release channels. Needs Node.js 22.18 or newer.

## Development

```bash
node --test "tests/*.test.mjs"   # unit tests: mixer, sound cache, patch replacements
node tools/check-patches.mjs     # patches against the live Discord bundle
```

File overview:

| File | Purpose |
|---|---|
| `index.ts` | Plugin definition, wiring, the `playSound` entry point. |
| `patches.ts` | Every webpack patch, grouped by purpose. |
| `mixer.ts` | Mixes sounds into the microphone stream; speaking, mute and push-to-talk rules. |
| `sounds.ts` | Fetches and caches sound files. |
| `settings.ts` | Plugin settings. |
| `tools/` | The patch checker. |
| `tests/` | Unit tests, runnable with plain Node.js. |

## Credits

- The microphone hooks are based on *SoundboardPermissionsBypass* by yash.
- The idea of mixing into the microphone stream goes back to *FakeSoundboard* by ImLvna.

## License

[GPL-3.0-or-later](LICENSE), the same as Vencord.
