# Claude Usage Monitor

<div align="center">

**🌐 Language / Langue / Idioma / 语言 / שפה**

[![English](https://img.shields.io/badge/English-blue?style=flat-square)](../README.md)
[![Français](https://img.shields.io/badge/Français-blue?style=flat-square)](README.fr.md)
[![Español](https://img.shields.io/badge/Español-blue?style=flat-square)](README.es.md)
[![中文](https://img.shields.io/badge/中文-orange?style=flat-square)](README.zh.md)
[![עברית](https://img.shields.io/badge/עברית-blue?style=flat-square)](README.he.md)

---

![Version](https://img.shields.io/badge/version-3.4-orange)
![Chrome](https://img.shields.io/badge/Chrome-Extension-brightgreen)
![Manifest](https://img.shields.io/badge/Manifest-V3-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

**通过精美的圆形进度指示器监控您的 Claude Code 使用量**

[快速开始](#快速开始) | [安装](#安装) | [功能](#功能) | [故障排除](#故障排除)

</div>

---

## 概述

Claude Usage Monitor 是一款 Chrome 扩展程序，可实时显示您的 Claude API 使用情况。一目了然地跟踪您的 5 小时和 7 天限制，在达到配额之前收到警报。

**非常适合 Claude Code 和 Claude Max 用户。**

## 快速开始

1. **下载** [最新版 ZIP](https://github.com/showf68/claude-usage-monitor/releases/latest)
2. **解压** ZIP 文件
3. **打开** `chrome://extensions/` 并启用开发者模式
4. **点击** "加载已解压的扩展程序" 并选择文件夹
5. **复制** 您的 `.credentials.json` 内容并粘贴到扩展程序中

完成！扩展程序将自动解析您的令牌并开始监控。

## 功能

| 功能 | 描述 |
|------|------|
| **实时跟踪** | 监控 5 小时和 7 天使用配额 |
| **可视化进度** | 精美的圆形进度指示器 |
| **颜色编码** | 绿色 (< 50%)、橙色 (50-80%)、红色 (> 80%) |
| **智能警报** | 在 70%、80%、90%、95% 使用率时发送通知 |
| **自动刷新** | 每分钟自动更新 |
| **多语言** | 英语、法语、西班牙语、中文、希伯来语 |
| **自动检测语言** | 自动检测浏览器语言 |
| **轻松设置** | 只需粘贴您的凭据 JSON |
| **深色主题** | 为开发者设计的现代界面 |
| **隐私优先** | 所有数据保留在本地 |

## 安装

### 选项 1：从 Releases 下载（推荐）

1. 前往 [Releases](https://github.com/showf68/claude-usage-monitor/releases/latest)
2. 下载 `claude-usage-monitor-v3.3.zip`
3. 将 ZIP 解压到文件夹
4. 打开 Chrome 并前往 `chrome://extensions/`
5. 启用**开发者模式**（右上角开关）
6. 点击**"加载已解压的扩展程序"**
7. 选择解压的文件夹

### 选项 2：克隆仓库

```bash
git clone https://github.com/showf68/claude-usage-monitor.git
cd claude-usage-monitor
```

然后按照上述说明在 Chrome 中加载文件夹。

## 配置

### 步骤 1：找到您的凭据

您的 Claude 凭据存储在：

| 平台 | 路径 |
|------|------|
| **Windows** | `%USERPROFILE%\.claude\.credentials.json` |
| **macOS** | `~/.claude/.credentials.json` |
| **Linux** | `~/.claude/.credentials.json` |

### 步骤 2：复制和粘贴

1. 在任何文本编辑器中打开凭据文件
2. **全选** (Ctrl+A / Cmd+A)
3. **复制** (Ctrl+C / Cmd+C)
4. 点击 Chrome 中的扩展程序图标
5. **粘贴**完整的 JSON 内容
6. 点击**"保存并连接"**

扩展程序会自动从您的 JSON 中提取 `accessToken` 和 `refreshToken`。

## 使用方法

### 工具栏徽章

徽章显示您当前 5 小时使用百分比：

| 徽章 | 颜色 | 状态 |
|------|------|------|
| `25` | 绿色 | 低使用量 |
| `65` | 橙色 | 中等使用量 |
| `90` | 红色 | 高使用量 - 请放慢速度！ |
| `CFG` | 黄色 | 需要配置 |
| `ERR` | 红色 | 连接错误 |

### 弹出界面

点击扩展程序图标可查看：
- **5 小时使用量** - 带圆形进度的当前窗口
- **7 天使用量** - 每周配额跟踪
- **重置计时器** - 限制刷新前的时间
- **最后更新** - 数据最后刷新时间

## 故障排除

<details>
<summary><b>ERR 徽章或"连接错误"</b></summary>

1. 检查您的网络连接
2. 验证您的令牌是否已过期
3. 尝试使用新凭据重新配置
4. 从 `chrome://extensions/` 重新加载扩展程序
</details>

<details>
<summary><b>CFG 徽章</b></summary>

扩展程序需要配置：
1. 点击扩展程序图标
2. 粘贴您的 `.credentials.json` 内容
3. 点击"保存并连接"
</details>

## 隐私与安全

| 方面 | 详情 |
|------|------|
| **数据收集** | 无 - 所有数据保留在本地 |
| **令牌存储** | Chrome 的安全存储 API |
| **网络调用** | 仅调用 Anthropic 官方 API |
| **开源** | 完整代码可供审计 |

## 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE)。

---

<div align="center">

**为 Claude 开发者社区打造**

如果这个扩展程序对您有帮助，请考虑给它一个星标

[报告错误](https://github.com/showf68/claude-usage-monitor/issues) | [功能请求](https://github.com/showf68/claude-usage-monitor/issues)

</div>
