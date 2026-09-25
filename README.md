# TuxChat

![License](https://img.shields.io/github/license/histerick/tuxchat)
![Latest release](https://img.shields.io/github/v/release/histerick/tuxchat)

**English** · [Español](README.es.md)

Unofficial WhatsApp Web desktop client for Linux (Electron), with full
voice/video call and screen-share support, multiple isolated sessions
running side by side, and `whatsapp://` link support.

**Status: early development (v0.2), not ready for daily use yet.**

Tested on Ubuntu 26.04 with an NVIDIA GPU. It should work on other
distros/GPUs (the `.deb` only depends on standard GTK/Debian libraries, and
`--ozone-platform=x11` is only forced when NVIDIA on Wayland is detected),
but that hasn't been verified yet — reports from other setups are welcome.

## Screenshots

![Two isolated sessions running side by side](docs/screenshots/screen-05-two-sessions-open.jpg)

| | |
|---|---|
| ![Sessions → Add session…](docs/screenshots/screen-01-add-session.jpg) | ![Naming the new session](docs/screenshots/screen-02-name-session.jpg) |
| **1.** Sessions → Add session… | **2.** Name the new isolated session |
| ![Sessions → WhatsApp links…](docs/screenshots/screen-03-setting-whatsapp-links.jpg) | ![Choosing which session opens whatsapp:// links](docs/screenshots/screen-04-select-account-open-link.jpg) |
| **3.** Sessions → WhatsApp links… | **4.** Choose which session opens `whatsapp://` links |

## Installation

Download the installer from
[Releases](https://github.com/histerick/tuxchat/releases):

- **Ubuntu/Debian:** `tuxchat_<version>_amd64.deb` — `sudo apt install ./tuxchat_<version>_amd64.deb`, or double-click it to open it in the software installer.
- **Any other distro:** `TuxChat-<version>.AppImage` — make it executable and run it directly. No installation needed, and no `libfuse2` required (recent distros like Ubuntu 24.04+ no longer ship it by default).

### Updates

- **AppImage:** updates itself silently in the background — it checks for a new version at launch and every 4 hours while running, downloads it without interrupting you, and installs it the next time you quit the app. On the next launch after an update, a one-time window shows what's new in that version.
- **.deb:** does not update itself (`apt` owns it) — download the new package from [Releases](https://github.com/histerick/tuxchat/releases) when one comes out.

## Multiple sessions

From the window menu, **Sessions > Add session...** creates a fully
isolated WhatsApp session (its own login, cache and data), with its own
icon and entry in the applications menu. **Rename** and **Delete** work the
same way, from the same menu.

## WhatsApp links (whatsapp://)

TuxChat registers itself with the system as the handler for the
`whatsapp://` scheme, so a `wa.me/<number>` or
`whatsapp://send?phone=...&text=...` link clicked from any other app
(browser, email, etc.) opens the chat right in TuxChat instead of getting
stuck in WhatsApp's browser version. With more than one session set up, it
asks which one to use the first time (with an option to remember the
choice); this is managed from **Sessions > WhatsApp links...**.

## Links inside chats

Links you receive in a chat (Zoom, Google Meet, any web page) open in your
default browser — as a new tab if it's already open — instead of in a
TuxChat popup window.

## Development

```bash
npm install
npm start
```

The detailed development log lives outside this repo while the project
matures; see `tuxchat.md` on the development machine.
