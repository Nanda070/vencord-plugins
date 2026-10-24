<div align="center">

# 🧩 Vencord Plugins

**A collection of custom [Vencord](https://github.com/Vendicated/Vencord) userplugins by [Nandak070](https://github.com/Nanda070)**

![Vencord](https://img.shields.io/badge/Vencord-1.15.12+-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Plugins](https://img.shields.io/badge/plugins-12-success?style=for-the-badge)

🇬🇧 English · [🇷🇺 Русский](README.ru.md)

</div>

---

## ✨ Plugins

Every plugin has its own repository (linked below) and a copy in [`plugins/`](plugins) of this repo.

| Plugin | What it does | Repository |
| --- | --- | --- |
| **FakeDeafen** | Fake deafen/mute yourself: others see you deafened while you still hear everything. Button in the account panel + `Ctrl+Shift+Q`. | [Vencord-FakeDeafen](https://github.com/Nanda070/Vencord-FakeDeafen) |
| **FakeDeafenDetector** | Flags members who speak while their voice state says muted/deafened. | [Vencord-FakeDeafenDetector](https://github.com/Nanda070/Vencord-FakeDeafenDetector) |
| **QuestMaster** | Auto-completes Discord Quests (video, game, stream, activity) with an in-app dashboard. | [discord-quest-auto-completer](https://github.com/Nanda070/discord-quest-auto-completer) |
| **SoundboardToVoice** | Plays soundboard sounds through your microphone. No Nitro or *Use Soundboard* permission needed. | [SoundboardToVoice](https://github.com/Nanda070/SoundboardToVoice) |
| **SilentDelete** | Deletes a message silently, replacing it with a placeholder to bypass message loggers. | [SilentDelete](https://github.com/Nanda070/SilentDelete) |
| **rmcord** | Bulk-delete your own messages from a floating panel. | [rmcord](https://github.com/Nanda070/rmcord) |
| **FollowUser** | "Follow" option in the user context menu: always stay in the same voice channel as them. | [vc-followUser](https://github.com/Nanda070/vc-followUser) |
| **VoiceChatUtilities** | Move, mute, deafen or disconnect an entire voice channel at once. | [vc-voiceChatUtilities](https://github.com/Nanda070/vc-voiceChatUtilities) |
| **BetterActivities** | Activity icons in the member list and all activities in the profile popout. | [vc-betterActivities](https://github.com/Nanda070/vc-betterActivities) |
| **AntiRickroll** | Warns about potential Rickrolls in messages, including masked links. | [vencord-antirickroll](https://github.com/Nanda070/vencord-antirickroll) |
| **TrustMeBro** | Bypasses Discord's UK Online Safety Act age verification (client side). | [TrustMeBro](https://github.com/Nanda070/TrustMeBro)

## 📦 Installation

Userplugins are not available through the Vencord installer. Vencord has to be built from source. This takes about five minutes.

### 1. Requirements

- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/) 22 or newer
- [pnpm](https://pnpm.io/installation): `npm i -g pnpm`

### 2. Get Vencord

```bash
git clone https://github.com/Vendicated/Vencord.git
cd Vencord
pnpm install --frozen-lockfile
```

### 3. Add the plugins

Create `src/userplugins` if it does not exist, then clone this repo and copy the plugins you want.

**All plugins:**

```bash
mkdir -p src/userplugins
git clone https://github.com/Nanda070/vencord-plugins.git ../vencord-plugins
cp -r ../vencord-plugins/plugins/* src/userplugins/
```

**A single plugin** (for example FakeDeafen):

```bash
cp -r ../vencord-plugins/plugins/FakeDeafen src/userplugins/FakeDeafen
```

On Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force src\userplugins
git clone https://github.com/Nanda070/vencord-plugins.git ..\vencord-plugins
Copy-Item -Recurse ..\vencord-plugins\plugins\* src\userplugins\
```

Each plugin folder must sit **directly** inside `src/userplugins` (for example `src/userplugins/FakeDeafen/index.tsx`).

### 4. Build and inject

```bash
pnpm build
pnpm inject
```

Pick your Discord install in the injector, then **fully restart Discord** (quit it from the tray).

### 5. Enable the plugins

Open **Settings → Vencord → Plugins**, search for the plugin name and switch it on. Plugins that change patches ask for a restart.

### Updating

```bash
cd vencord-plugins && git pull
cd ../Vencord
cp -r ../vencord-plugins/plugins/* src/userplugins/
git pull && pnpm install --frozen-lockfile
pnpm build
```

Restart Discord afterwards.

---

## 🛠 Troubleshooting

| Problem | Fix |
| --- | --- |
| `No matching export … Toasts` while building | You are on an old copy. Vencord 1.15.12+ replaced `Toasts` with `showToast({ text, variant })`. Pull the latest plugins. |
| Plugin does not show up in the list | The folder is nested too deep. `index.ts(x)` must be directly inside `src/userplugins/<Plugin>/`. |
| A plugin stopped working after a Discord update | Patches are tied to Discord's code. Disable it and open an issue in its repository. |
| Discord crashes right after enabling a plugin | Disable plugins one at a time (Settings → Plugins). Open DevTools with `Ctrl+Shift+I` to see the exact error. |

## 📄 License

Each plugin keeps the license in its own folder (`plugins/<Name>/LICENSE`, or the header of its source files). Plugins without a license file follow the GPL-3.0-or-later header used by Vencord.

<div align="center">

Made by [Nandak070](https://github.com/Nanda070)

</div>
