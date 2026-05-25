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
## 手动开发运行流程

### 进入仓库

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
cd 'E:\mygithub\opencode'
```

如果新 PowerShell 里提示找不到 `bun`，先临时补 PATH：

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
$env:Path = 'C:\Users\Administrator\AppData\Local\Microsoft\WinGet\Links;' + $env:Path
cd 'E:\mygithub\opencode'
```

### 开发模式启动客户端

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
bun dev:desktop
```

开发模式会启动 Electron 客户端，并监听源码变化。改 UI 源码后通常会自动热更新；如果主进程或 preload 改动没有自动生效，停止后重新运行 `bun dev:desktop`。

### 停止客户端

在启动客户端的 PowerShell 窗口按 `Ctrl+C`，或者关闭 Electron 客户端窗口。

### 手动编译检查

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
cd 'E:\mygithub\opencode\packages\desktop'
bun run build
```

### 打 Windows 安装包

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
cd 'E:\mygithub\opencode\packages\desktop'
bun run package:win
```

### 看源码入口

- UI 渲染层：`packages/desktop/src/renderer`
- 主进程窗口、菜单、系统能力：`packages/desktop/src/main`
- 主进程暴露给 UI 的桥接 API：`packages/desktop/src/preload`
- 共享 Web UI 组件：`packages/app/src`
- 共享 UI 基础组件和主题：`packages/ui/src`

### 改源码后的推荐节奏

1. 开发前看状态：`git status --short --branch`。
2. 启动开发模式：`bun dev:desktop`。
3. 修改源码。
4. 在客户端窗口里观察热更新效果。
5. 必要时按 `Ctrl+C` 停止，再重新运行 `bun dev:desktop`。
6. 提交前在 `packages/desktop` 执行 `bun run build`。
7. 查看改动：`git diff`。
8. 提交：`git add <文件>`，然后 `git commit -m 'feat(desktop): ...'`。
## VSCode 开发流程

### 打开源码

推荐用 VSCode 直接打开仓库根目录：

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
cd 'E:\mygithub\opencode'
code .
```

如果 `code` 命令不可用，可以手动打开 VSCode，然后选择 `File -> Open Folder...`，打开 `E:\mygithub\opencode`。

### 推荐扩展

- Bun for Visual Studio Code：用于 Bun 运行时和脚本支持。
- ESLint / Prettier 可按个人习惯安装，但本项目当前主要按仓库脚本验证。

### 使用 VSCode Tasks

本仓库已新增 `.vscode/tasks.json`，可在 VSCode 中执行：

1. `Terminal -> Run Task...`
2. 选择 `opencode: desktop dev` 启动 Electron 客户端开发模式。
3. 选择 `opencode: desktop build` 编译检查桌面端。
4. 选择 `opencode: desktop package win` 打 Windows 安装包。

### 改源码后如何看效果

- 如果只改 UI，多数情况下 `opencode: desktop dev` 运行中会自动热更新。
- 如果改了 `packages/desktop/src/main` 或 `packages/desktop/src/preload`，建议停止当前 Task 后重新运行 `opencode: desktop dev`。
- 提交前至少执行一次 `opencode: desktop build`。