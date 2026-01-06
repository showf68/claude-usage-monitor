# Claude Usage Monitor v4.5 - Smart Auto-Detection & Auto-Refresh

## 🎉 What's New

### 🎯 Smart Auto-Detection on First Install (NEW!)
**Zero configuration needed!** The extension now automatically detects if you're already logged in to claude.ai when you first install it. No need to manually click "Connect" anymore!

**How it works:**
1. Install the extension
2. If you're already logged in to claude.ai → **Instant connection!** ✨
3. Badge shows "OK" ✓ for 3 seconds, then displays your usage

This was the #1 requested feature - now it just works automatically!

### ✨ Auto-Refresh After Login
No more manual refreshing! When you click **"🔗 Login to Claude.ai"**, the extension automatically checks your connection status every 2 seconds for up to 1 minute. As soon as you're logged in, it detects your session instantly.

### 🎯 Smart Badge Display
Beautiful UX flow:
1. Click login button → opens claude.ai
2. Log in to your account
3. Badge shows **"OK" ✓** (green) for 3 seconds
4. Automatically switches to show your actual usage percentage (e.g., "42%")

### 📊 Version Display
Extension now shows version number **v4.5** in the footer, aligned with GitHub link.

## 🐛 Bug Fixes & Improvements

- **Fixed:** Smart auto-detection on first install - no more "not connected" when already logged in
- **Fixed:** Removed duplicate emoji (🔗🔗) on login buttons - now shows single emoji
- **Fixed:** Centered login button in error view with proper styling
- **Improved:** Auto-refresh now runs in background service worker (survives popup close)
- **Improved:** Clean repository structure - extension files at root (no duplication)

## 🚀 How It Works

The smart login detection runs in the **background script**, not the popup. This means:
- ✅ Works even if you close the popup
- ✅ No battery drain (stops after 1 minute or on success)
- ✅ Console logs show progress: "Login check attempt 1/30", "2/30", etc.
- ✅ Auto-stops when connection is successful

## 📦 Installation

1. Download the ZIP: [`claude-usage-monitor-v4.5.zip`](https://github.com/showf68/claude-usage-monitor/releases/download/v4.5/claude-usage-monitor-v4.5.zip)
2. Extract to a folder
3. Open `chrome://extensions/`
4. Enable **Developer Mode**
5. Click **"Load unpacked"** and select the extracted folder

## 🔧 Technical Details

**Files Changed:**
- `manifest.json` - Version bump to 4.5
- `background.js` - Added smart auto-detection on init + `startLoginCheck` message handler
- `popup-modern.js` - Simplified login check to call background script
- `popup-modern.html` - Added version display, improved button styling
- `_locales/en/messages.json` & `_locales/fr/messages.json` - Removed emoji from translations

**Key Features:**
- **Smart auto-detection:** Tries cookie mode first on install, falls back to token mode
- Background interval checks every 2 seconds (max 30 attempts = 60 seconds)
- Auto-stops on success or timeout
- Shows "OK" badge for 3 seconds before displaying usage percentage
- Smart badge color coding: Green (OK), then usage-based colors
- Detection order: Saved auth mode → Cookie mode → Token mode → Show CFG badge

## 💡 Pro Tip

Open the **Service Worker Console** to see real-time logs:
1. Go to `chrome://extensions/`
2. Click "Details" on Claude Usage Monitor
3. Click "Service Worker" link
4. See console logs: "Login check attempt 1/30", "Login successful - stopping check"

## 🌍 Supported Languages

- English 🇬🇧
- Français 🇫🇷
- Español 🇪🇸
- 中文 🇨🇳
- עברית 🇮🇱

---

**Full Changelog:** [v4.0...v4.5](https://github.com/showf68/claude-usage-monitor/compare/v4.0...v4.5)

**Built with ❤️ for the Claude developer community**
