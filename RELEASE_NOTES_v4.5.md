# Claude Usage Monitor v4.5 - Smart Auto-Refresh

## 🎉 What's New

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

## 🐛 Bug Fixes

- **Fixed:** Removed duplicate emoji (🔗🔗) on login buttons - now shows single emoji
- **Fixed:** Centered login button in error view with proper styling
- **Improved:** Auto-refresh now runs in background service worker (survives popup close)

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
- `background.js` - Added `startLoginCheck` message handler with auto-refresh logic
- `popup-modern.js` - Simplified login check to call background script
- `popup-modern.html` - Added version display, improved button styling
- `_locales/en/messages.json` & `_locales/fr/messages.json` - Removed emoji from translations

**Key Features:**
- Background interval checks every 2 seconds (max 30 attempts = 60 seconds)
- Auto-stops on success or timeout
- Shows "OK" badge for 3 seconds before displaying usage percentage
- Smart badge color coding: Green (OK), then usage-based colors

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
