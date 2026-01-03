# Claude Usage Monitor

<div align="center">

![Version](https://img.shields.io/badge/version-3.0-orange)
![Chrome](https://img.shields.io/badge/Chrome-Extension-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Manifest](https://img.shields.io/badge/Manifest-V3-blue)

**A sleek Chrome extension to monitor your Claude Code and Claude.ai usage in real-time**

[Installation](#-installation) • [Features](#-features) • [Authentication](#-authentication-methods) • [FAQ](#-faq)

<img src="https://img.shields.io/badge/Made%20for-Claude%20Developers-purple?style=for-the-badge" alt="Made for Claude Developers">

</div>

---

## Overview

Claude Usage Monitor is a Chrome extension that displays your Claude API usage with beautiful circular progress indicators. Monitor your 5-hour and 7-day rate limits at a glance, receive alerts before hitting your quota, and never be caught off guard.

## Features

- **Real-time Usage Tracking** - Monitor your 5-hour and 7-day usage quotas
- **Circular Progress Indicators** - Beautiful, color-coded visual feedback
- **Two Authentication Methods** - Use your Claude browser session OR API token
- **Auto-refresh** - Updates every minute automatically
- **Smart Alerts** - Browser notifications at 70%, 80%, 90%, and 95% usage
- **Dark Theme** - Easy on the eyes, designed for developers
- **Lightweight** - Minimal footprint, maximum utility

## Installation

### Quick Install (Chrome Web Store)

*Coming soon*

### Manual Installation (Developer Mode)

1. **Download the extension**
   ```bash
   git clone https://github.com/YOUR_USERNAME/claude-usage-monitor.git
   ```
   Or [download as ZIP](https://github.com/YOUR_USERNAME/claude-usage-monitor/archive/refs/heads/main.zip) and extract

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/`
   - Or Menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the switch in the top-right corner

4. **Load the Extension**
   - Click **"Load unpacked"**
   - Select the extension folder
   - The **CC** icon should appear in your toolbar

## Authentication Methods

Choose the method that works best for you:

### Option 1: Claude Session (Easiest)

Use your existing Claude.ai browser session - **no tokens required!**

1. Click the extension icon
2. Select **"Claude Session"** tab (default)
3. Click **"Open Claude Login"**
4. Log in to Claude.ai in the new tab
5. Return to the extension and click refresh

| Pros | Cons |
|------|------|
| No token management | Requires active Claude.ai login |
| Instant setup | May need re-login periodically |
| Uses existing auth | - |

### Option 2: API Token (Most Reliable)

Use your Claude Code refresh token for consistent, independent access.

1. Click the extension icon
2. Select **"Token Auth"** tab
3. Click **"Copy .credentials.json path"**
4. Open the file and copy the `refreshToken` value
5. Paste it in the extension and save

**Finding your credentials file:**

| Platform | Path |
|----------|------|
| Windows | `%USERPROFILE%\.claude\.credentials.json` |
| macOS | `~/.claude/.credentials.json` |
| Linux | `~/.claude/.credentials.json` |

**Token format:** `sk-ant-ort01-...`

| Pros | Cons |
|------|------|
| Works independently | Requires initial setup |
| More reliable | Token may need refresh |
| Always available | - |

## Usage Guide

Once configured, the extension works automatically:

### Badge Indicators

The toolbar badge shows your current 5-hour usage:

| Badge | Color | Meaning |
|-------|-------|---------|
| `25` | 🟢 Green | 25% used - Plenty remaining |
| `65` | 🟡 Orange | 65% used - Moderate usage |
| `90` | 🔴 Red | 90% used - High usage |
| `CFG` | Yellow | Configuration needed |
| `LOGIN` | Blue | Claude login required |
| `ERR` | Red | Connection error |

### Popup Interface

Click the extension icon to see:

- **5-Hour Usage** - Current usage with circular progress
- **7-Day Usage** - Weekly quota tracking
- **Time Until Reset** - Know when limits refresh
- **Auth Method** - Current authentication type

### Notifications

Receive browser alerts at critical thresholds:

| Threshold | Alert Type |
|-----------|------------|
| 70% | First warning |
| 80% | Moderate warning |
| 90% | High usage alert |
| 95% | Critical alert |

*Alerts reset automatically when usage drops below 50%*

## Troubleshooting

### Common Issues

<details>
<summary><b>"Session Expired" Message</b></summary>

1. Open [claude.ai](https://claude.ai) in your browser
2. Log in to your account
3. Return to the extension and click refresh
</details>

<details>
<summary><b>"Connection Error" or ERR Badge</b></summary>

1. Check your internet connection
2. Verify your token is still valid (if using token auth)
3. Try switching authentication methods
4. Reload the extension from `chrome://extensions/`
</details>

<details>
<summary><b>Badge Shows "CFG"</b></summary>

1. Click the extension icon
2. Complete the setup process
3. Either log in to Claude or enter your refresh token
</details>

<details>
<summary><b>Extension Not Updating</b></summary>

1. Click the refresh button manually
2. Check Chrome's extension permissions
3. Ensure the extension has network access
</details>

## Privacy & Security

| Aspect | Details |
|--------|---------|
| **Data Collection** | None - all data stays local |
| **Token Storage** | Secure Chrome storage API |
| **External Servers** | None - only Anthropic APIs |
| **Open Source** | Full code audit available |

## Technical Specifications

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "alarms", "notifications", "cookies"],
  "host_permissions": [
    "https://api.anthropic.com/*",
    "https://console.anthropic.com/*",
    "https://claude.ai/*"
  ]
}
```

### File Structure

```
claude-usage-monitor/
├── manifest.json        # Extension configuration
├── background.js        # Service worker (API calls, auth)
├── popup-modern.html    # Popup interface
├── popup-modern.js      # Popup logic
├── icon16.png          # Toolbar icon (16x16)
├── icon48.png          # Extension icon (48x48)
├── icon128.png         # Store icon (128x128)
└── README.md           # This file
```

## Contributing

Contributions are welcome! Here's how:

1. **Fork** the repository
2. **Create** your feature branch
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit** your changes
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push** to the branch
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open** a Pull Request

## Changelog

### v3.0 (Latest)
- Added Claude Session authentication (no token required!)
- Dual authentication support (Session + Token)
- Improved UI with modern dark theme
- Better error handling and status indicators
- Session status detection

### v2.1
- Circular progress indicators
- Color-coded usage display
- Auto-refresh every minute

### v1.0
- Initial release
- Basic usage monitoring
- Token-based authentication

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

## Support

- **Issues:** [GitHub Issues](https://github.com/YOUR_USERNAME/claude-usage-monitor/issues)
- **Discussions:** [GitHub Discussions](https://github.com/YOUR_USERNAME/claude-usage-monitor/discussions)

---

<div align="center">

**Built with love for the Claude developer community**

If this extension helps you, consider giving it a star!

</div>
