# TuxChat

![License](https://img.shields.io/github/license/histerick/tuxchat)
![Latest release](https://img.shields.io/github/v/release/histerick/tuxchat)

**English** · [Español](README.es.md) · [Português](README.pt.md)

Unofficial WhatsApp Web desktop client for Linux and Windows (Electron), with full voice/video call and screen-share support, multiple isolated sessions in tabs with a Discord-style sidebar, independent per-session color customization, and `whatsapp://` link support.

---

## Features & Highlights

### 👥 Multiple Isolated Sessions in Tabs

- **Discord-style right sidebar**: manage up to 6 WhatsApp accounts seamlessly within a single window.
- **Drag-to-reorder**: easily organize sessions by dragging icons up and down with fluid visual feedback.
- **Fast visual identification**: custom profile photos (with square cropping and automatic WebP conversion) or dynamic high-contrast initials.
- **Instant switching**: fluid tab switching powered by Electron's `WebContentsView`, keeping memory usage low and chat sessions connected.
- **Per-session audio & mute control**: right-click any session icon to mute audio instantly or select individual volume levels (100%, 75%, 50%, 25%, 10%, Mute). Muted accounts display a visual audio-off badge.
- **Complete context menu**: right-click any session icon to edit profile/photo, change color, adjust volume, mute, or delete.

### 🎨 Independent & Dynamic Session Colors

- Each session has its own color saved independently.
- **Custom color picker**: choose from curated presets or pick any custom HEX color with the integrated color picker.
- **Right sidebar**:
  - Inactive session: colored icon / initials with matching subtle border.
  - Active session: filled with the session color, automatic contrast text calculation (YIQ), illuminated glow shadow, and matching colored indicator pill.
- **Synchronized title bar**: switching session tabs instantly updates the top title bar color to match the active account.

### 🌐 Multi-language Support

- Three complete languages out of the box:
  - **English** — default on installation / first run.
  - **Español (Spanish)**
  - **Português (Brasil)**
- Switch anytime via **File > Language**. Menus, dialogs, and toolbars update immediately and preferences are persisted.

### ℹ️ "About TuxChat" Dialog

- Accessible via the top menu **About > About TuxChat**.
- Displays application version, Electron, Chromium, and Node.js runtime versions, platform architecture, and a direct link to the GitHub repository.

### 🔗 WhatsApp Links (`whatsapp://` & `wa.me`)

- TuxChat registers itself as the system handler for `whatsapp://` links.
- Clicking links from browsers or emails opens conversations directly in your active session or prompts a modern account selector.
- **Link picker modal with hide option**: choose which account handles the link, select via double-click or Enter, and hide sessions you don't want in the prompt list.
- Default session can also be configured in **File > Settings > WhatsApp links...**.

### 💬 In-chat Links

- Links received in chats (Zoom, Google Meet, external websites) open directly in your default web browser rather than popup windows.
- Right-click any link to **Copy link**.

---

## Installation

Download the installer from [Releases](https://github.com/histerick/tuxchat/releases):

- **Ubuntu/Debian (.deb):**
  ```bash
  sudo apt install ./tuxchat_<version>_amd64.deb
  ```
  Or double-click it in your desktop package manager.
- **Any other Linux distro (AppImage):**
  Make it executable (`chmod +x TuxChat-*.AppImage`) and run directly. No installation or `libfuse2` required.
- **Windows:**
  Run via installer or terminal.

### Updates

- **AppImage:** updates silently in the background, checking on launch and every 4 hours while running. The next time you open the app, a release notes window is presented.
- **.deb:** managed by `apt` — download new `.deb` packages from Releases.

---

## Development

Requirements: Node.js (v20+ recommended) and npm.

```bash
# Install dependencies
npm install

# Start development mode with hot-reload (nodemon)
npm run dev

# Run directly with Electron
npm start

# Run linter
npm run lint

# Format code with Prettier
npm run format
```

---

## License

Distributed under the [MIT](LICENSE) license.
