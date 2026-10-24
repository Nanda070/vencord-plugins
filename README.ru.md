<div align="center">

# 🧩 Vencord Plugins

**Коллекция пользовательских плагинов [Vencord](https://github.com/Vendicated/Vencord) от [Nandak070](https://github.com/Nanda070)**

![Vencord](https://img.shields.io/badge/Vencord-1.15.12+-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Plugins](https://img.shields.io/badge/плагинов-12-success?style=for-the-badge)

[🇬🇧 English](README.md) · 🇷🇺 Русский

</div>

---

## ✨ Плагины

У каждого плагина есть свой репозиторий (ссылки ниже) и копия в папке [`plugins/`](plugins) этого репозитория.

| Плагин | Что делает | Репозиторий |
| --- | --- | --- |
| **FakeDeafen** | Фейковый deafen/mute: другие видят вас заглушенным, а вы всё слышите. Кнопка в панели аккаунта и `Ctrl+Shift+Q`. | [Vencord-FakeDeafen](https://github.com/Nanda070/Vencord-FakeDeafen) |
| **FakeDeafenDetector** | Отмечает участников, которые говорят при статусе muted/deafened. | [Vencord-FakeDeafenDetector](https://github.com/Nanda070/Vencord-FakeDeafenDetector) |
| **QuestMaster** | Автоматически проходит квесты Discord (видео, игра, стрим, активность) с дашбордом внутри приложения. | [discord-quest-auto-completer](https://github.com/Nanda070/discord-quest-auto-completer) |
| **SoundboardToVoice** | Проигрывает звуки саундборда через микрофон. Nitro и право *Use Soundboard* не нужны. | [SoundboardToVoice](https://github.com/Nanda070/SoundboardToVoice) |
| **SilentDelete** | Тихо удаляет сообщение, заменяя его заглушкой, чтобы обойти логгеры сообщений. | [SilentDelete](https://github.com/Nanda070/SilentDelete) |
| **rmcord** | Массовое удаление своих сообщений из плавающей панели. | [rmcord](https://github.com/Nanda070/rmcord) |
| **FollowUser** | Пункт «Follow» в контекстном меню пользователя: всегда быть в одном голосовом канале с ним. | [vc-followUser](https://github.com/Nanda070/vc-followUser) |
| **VoiceChatUtilities** | Переместить, замьютить, заглушить или отключить сразу весь голосовой канал. | [vc-voiceChatUtilities](https://github.com/Nanda070/vc-voiceChatUtilities) |
| **BetterActivities** | Иконки активностей в списке участников и все активности в попауте профиля. | [vc-betterActivities](https://github.com/Nanda070/vc-betterActivities) |
| **AntiRickroll** | Предупреждает о возможных риклоллах в сообщениях, включая замаскированные ссылки. | [vencord-antirickroll](https://github.com/Nanda070/vencord-antirickroll) |
| **TrustMeBro** | Обходит проверку возраста Discord (UK Online Safety Act) на стороне клиента. | [TrustMeBro](https://github.com/Nanda070/TrustMeBro) |
| **LocalDevBadges** 🔒 | Локальные бейджи Staff / Early Verified Bot Developer / Active Developer на вашем профиле. | [dsdevbadge](https://github.com/Nanda070/dsdevbadge) *(приватный)* |

> 🔒 **Приватный репозиторий.** `dsdevbadge` приватный, поэтому его исходники не входят в этот репозиторий, а ссылка открывается только у владельца.

### Авторство

Часть плагинов начиналась как форки чужих работ и сохраняет исходные лицензии:

- **FollowUser**, **VoiceChatUtilities**, **BetterActivities**: оригинал [D3SOX](https://github.com/D3SOX)
- **rmcord**: оригинал [maxycodone](https://github.com/maxycodone/rmcord)
- **AntiRickroll**: оригинал [schmayterling](https://github.com/schmayterling/vencord-antirickroll)

---

## 📦 Установка

Пользовательские плагины нельзя поставить через установщик Vencord. Vencord нужно собрать из исходников. Это занимает около пяти минут.

### 1. Требования

- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/) 22 или новее
- [pnpm](https://pnpm.io/installation): `npm i -g pnpm`

### 2. Получите Vencord

```bash
git clone https://github.com/Vendicated/Vencord.git
cd Vencord
pnpm install --frozen-lockfile
```

### 3. Добавьте плагины

Создайте `src/userplugins`, если папки нет, затем склонируйте этот репозиторий и скопируйте нужные плагины.

**Все плагины:**

```bash
mkdir -p src/userplugins
git clone https://github.com/Nanda070/vencord-plugins.git ../vencord-plugins
cp -r ../vencord-plugins/plugins/* src/userplugins/
```

**Один плагин** (например, FakeDeafen):

```bash
cp -r ../vencord-plugins/plugins/FakeDeafen src/userplugins/FakeDeafen
```

В Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force src\userplugins
git clone https://github.com/Nanda070/vencord-plugins.git ..\vencord-plugins
Copy-Item -Recurse ..\vencord-plugins\plugins\* src\userplugins\
```

Папка плагина должна лежать **прямо** в `src/userplugins` (например, `src/userplugins/FakeDeafen/index.tsx`).

### 4. Сборка и инжект

```bash
pnpm build
pnpm inject
```

Выберите установку Discord в инжекторе и **полностью перезапустите Discord** (закройте его через трей).

### 5. Включите плагины

Откройте **Настройки → Vencord → Плагины**, найдите плагин по названию и включите. Если плагин меняет патчи, Vencord попросит перезапуск.

### Обновление

```bash
cd vencord-plugins && git pull
cd ../Vencord
cp -r ../vencord-plugins/plugins/* src/userplugins/
git pull && pnpm install --frozen-lockfile
pnpm build
```

После этого перезапустите Discord.

---

## 🛠 Решение проблем

| Проблема | Решение |
| --- | --- |
| `No matching export … Toasts` при сборке | У вас старая копия. Начиная с Vencord 1.15.12 `Toasts` заменён на `showToast({ text, variant })`. Обновите плагины. |
| Плагина нет в списке | Папка вложена слишком глубоко. `index.ts(x)` должен лежать прямо в `src/userplugins/<Plugin>/`. |
| Плагин сломался после обновления Discord | Патчи привязаны к коду Discord. Отключите плагин и создайте issue в его репозитории. |
| Discord падает сразу после включения плагина | Отключайте плагины по одному (Настройки → Плагины). Откройте DevTools через `Ctrl+Shift+I`, чтобы увидеть точную ошибку. |

---

## ⚠️ Отказ от ответственности

Модификации клиента нарушают условия использования Discord. Плагины предоставляются в образовательных целях **как есть**, используйте их на свой риск. Фейковые бейджи и «проверка возраста» косметические и работают только на стороне клиента. На стороне Discord ничего не выдаётся, другие пользователи этого не видят.

## 📄 Лицензия

Каждый плагин сохраняет лицензию в своей папке (`plugins/<Name>/LICENSE` или заголовок исходников). Плагины без файла лицензии следуют заголовку GPL-3.0-or-later, который использует Vencord.

<div align="center">

Сделано [Nandak070](https://github.com/Nanda070)

</div>
