# 🧹 Smart Tab Cleaner

> **A lightweight, privacy-friendly, and powerful Chrome Extension that automatically closes annoying tabs, pop-up ads, and desktop app launchers with multi-device Cloud Sync.**

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-Compatible-brightgreen.svg)](https://www.google.com/chrome/)
[![i18n](https://img.shields.io/badge/i18n-English%20%7C%20Ti%E1%BA%BFng%20Vi%E1%BB%87t-orange.svg)](#-internationalization-i18n)

---

## 🌟 Why Smart Tab Cleaner?

When opening links that launch desktop applications (such as **Zoom meetings**, **Telegram groups**, **Microsoft Teams**, **Webex**, or **OAuth authentication callbacks**), browsers open a new tab and leave it behind after the desktop client launches. These "zombie" tabs clutter your tab strip, consume memory, and distract you. Furthermore, unwanted advertising redirects and pop-up pages frequently interrupt your workflow.

**Smart Tab Cleaner** automatically closes these tabs after a customizable delay (default: **500ms**). Unlike legacy extensions that force users to write complex regular expressions manually, Smart Tab Cleaner lets you **browse your recent history or open tabs and block them with a single click**.

---

## ✨ Key Features

- **⚡ 1-Click Quick Block:** Browse currently open tabs or recent browsing history, and click `[⚡ Block]` to immediately create an auto-close rule.
- **☁️ Multi-Device Cloud Sync (`chrome.storage.sync`):** Automatically synchronizes all rules across your Google Chrome profiles and devices via your signed-in Google Account.
- **⏱ Millisecond-Precision Timers (Default: 500ms):** Fast enough to eliminate ad pop-ups and launcher tabs almost instantly before they distract you.
- **🧪 Built-in Regex & URL Tester:** Paste any link into the popup to instantly test whether it matches active rules and preview how long until it closes.
- **🎨 Modern, Flat & Clean UI:** Hand-crafted, responsive interface supporting both Light and Dark modes.
- **🌐 Full Internationalization (i18n):** Automatically matches your browser interface language (supports **English** and **Tiếng Việt**).
- **🔒 Privacy First & Zero Dependencies:** Pure Vanilla JavaScript & CSS. No third-party trackers, no analytics, no bloated npm dependencies, and no external servers.
- **📥 Backup & Manual Sync:** Export and import your rules as JSON files at any time.

---

## 📸 Interface Preview

The extension provides 3 intuitive tabs:
1. **🕒 History & Tabs:** Search open tabs or recent browsing history, and 1-click block unwanted sites.
2. **📋 Rules:** View, toggle (enable/disable), delete, or manually add rules with quick timeout pills (`0ms`, `500ms`, `1s`, `3s`).
3. **⚙️ Settings:** Configure default timeout in milliseconds, toggle instant tab closing, view cleanup statistics, and export/import configuration.

---

## 🚀 Installation & Setup

Since this extension is packaged cleanly under Manifest V3, you can load and use it directly:

1. Clone or download this repository:
   ```bash
   git clone https://github.com/anhhtz/smart-tab-cleaner-extension.git
   ```
2. Open Google Chrome (or any Chromium browser: Brave, Edge, Opera, Vivaldi).
3. Navigate to:
   ```text
   chrome://extensions/
   ```
4. Enable **Developer mode** in the top-right corner.
5. Click **Load unpacked** (top-left) and select the `smart-tab-cleaner-extension` directory.
6. Pin **Smart Tab Cleaner** to your browser toolbar!

---

## 🏗 Project Architecture

```text
smart-tab-cleaner-extension/
├── manifest.json                 # Chrome Manifest V3 configuration & permissions
├── popup.html                    # Clean popup user interface
├── css/
│   └── popup.css                 # Modern responsive CSS (Dark / Light mode)
├── js/
│   ├── storage.js                # Core storage service (Sync, auto-migrate & pattern generator)
│   ├── background.js             # Background Service Worker (Tab listeners & countdown execution)
│   └── popup.js                  # UI Controller (History/Tabs browser, Modal dialog, Tester)
├── icons/                        # Flat, minimalist icons with active countdown states
│   ├── icon16.png / icon16timer.png
│   ├── icon48.png / icon48timer.png
│   └── icon128.png / icon128timer.png
├── _locales/                     # Internationalization dictionaries
│   ├── en/messages.json          # English locale (Default)
│   └── vi/messages.json          # Vietnamese locale
└── extracted_original_rules.json # Pre-extracted backup of popular rules
```

---

## 🔄 How Cloud Sync Works

Smart Tab Cleaner uses a **two-tier hybrid storage architecture**:

```text
                    USER ACTION
             (Add, Edit, Toggle, Delete)
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
[ chrome.storage.sync ]         [ chrome.storage.local ]
   (Google Cloud Sync)              (Fast Local Mirror)
         │                               │
Auto-synced to other devices     Instant 0ms reads &
with your Google Account         works offline
```

- **Rules** are saved to `chrome.storage.sync`. Whenever you add or remove rules, Google's sync engine immediately pushes changes to your other Chrome instances.
- **Statistics** (tab close counters) are kept in `chrome.storage.local` to prevent hitting Google's hourly write quotas.
- **Offline Resilience:** The extension maintains a local cache mirror, ensuring rules continue working even when disconnected from the Internet.

---

## 🌐 Internationalization (i18n)

The extension natively detects your Chrome language setting (`chrome.i18n.getUILanguage()`):
- **English (`en`):** Default international language.
- **Tiếng Việt (`vi`):** Fully localized interface and smart pattern names.

---

## 🛡 Permissions & Security

Smart Tab Cleaner strictly requests only the minimal permissions necessary:

| Permission | Purpose |
| :--- | :--- |
| `storage` | To save rules and sync them across devices via `chrome.storage.sync`. |
| `tabs` | To detect navigation URL changes and close matching tabs when timers expire. |
| `history` | To allow users to browse recent visited pages and quickly create auto-close rules. |

*No data is ever transmitted to external servers. All operations happen strictly on your local machine and Google's official Chrome Sync infrastructure.*

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - feel free to customize, modify, and distribute as you see fit.
