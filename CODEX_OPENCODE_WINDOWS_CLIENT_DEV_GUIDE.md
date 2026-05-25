# OpenCode Windows 客户端二次开发指南

## 项目目标

- 基于 `anomalyco/opencode` 官方源码做 Windows 桌面客户端二次开发。
- 重点关注 `packages/desktop` 下的 Electron 客户端界面、交互和 Windows 使用体验。
- 保持能从官方 `upstream/dev` 同步更新，同时把本地改动保存到自己的 GitHub 仓库。

## 当前源码来源

- 官方仓库：https://github.com/anomalyco/opencode
- 本地目录：`E:\mygithub\opencode`
- 官方默认分支：`dev`
- 当前二次开发分支：`work/windows-client-ui`

## 个人项目与公司项目边界

- `E:\mygithub\opencode` 是个人 GitHub 二开项目。
- `E:\workspace\game` 是公司工程，不属于本项目。
- 本项目的维护 MD 和 Handoff MD 直接放在 `E:\mygithub\opencode` 根目录。

## 桌面端结构

- 桌面客户端目录：`packages/desktop`
- 技术栈：Electron + electron-vite + Solid 相关 UI 包
- 主进程：`packages/desktop/src/main`
- 预加载桥：`packages/desktop/src/preload`
- 渲染界面：`packages/desktop/src/renderer`
- 桌面端包内说明：`packages/desktop/README.md`
- 桌面端局部规则：`packages/desktop/AGENTS.md`

## 关键命令

在仓库根目录安装依赖：

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
bun install
```

启动 Windows 桌面客户端开发模式：

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
bun dev:desktop
```

在桌面端包目录构建：

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
bun run build
```

打 Windows 安装包：

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
bun run package:win
```

## 依赖要求

- 仓库声明的包管理器是 `bun@1.3.14`。
- 当前本机已检测到 Git、Node、npm。
- 已通过 winget 安装并验证 `bun@1.3.14`。

## 开发优先级

1. 官方 Windows 桌面客户端已能在本机 build 并以开发模式启动。
2. 再建立自己的 GitHub 远端并推送完整源码和维护文档。
3. UI 二次开发从 `packages/desktop/src/renderer` 入手。
4. 涉及系统菜单、窗口、更新、IPC 的改动再进入 `packages/desktop/src/main` 和 `packages/desktop/src/preload`。

## GitHub 账号安全

不需要提供 GitHub 密码，也不要把密码、Token、SSH 私钥发到聊天里或写进 MD。

推荐方式：

- 使用 GitHub Desktop / Git Credential Manager 的网页登录授权。
- 或在终端执行 `gh auth login`，由浏览器完成登录。
- 或开发者自己创建 Personal Access Token，只输入到 Git 凭据弹窗，不写入仓库文档。

## 推荐的个人 GitHub 仓库形态

推荐创建一个空仓库，例如：

- `https://github.com/<你的账号>/opencode-windows-client-dev.git`

然后配置：

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
git remote add 'origin' 'https://github.com/<你的账号>/opencode-windows-client-dev.git'
```

推送个人分支：

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
git push -u 'origin' 'work/windows-client-ui'
```
## 本机初始化记录

- 已安装 `bun@1.3.14`。
- 已执行 `bun install`。
- 首次启动 `bun run dev` 时 Electron 报 `Electron uninstall`，原因是 Electron npm 包缺少本地 `dist` 二进制目录。
- 已在 `packages/desktop/node_modules/electron` 下执行 `node install.js` 补齐 Electron 二进制。
- 已执行 `packages/desktop` 下的 `bun run build`，构建通过。
- 已启动桌面端开发模式，renderer dev server 为 `http://localhost:5173`，sidecar 为 `http://127.0.0.1:3202`。
- 本地运行日志写入 `.codex_dev_logs/`，该目录只用于本机排障，不提交到 GitHub。