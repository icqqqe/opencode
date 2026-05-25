# 项目根目录配置

本项目可能会换电脑或换目录开发，因此文档和命令尽量避免写死 `E:` 盘路径。

## 推荐方式：VSCode 打开仓库根目录

最简单的方式是用 VSCode 打开仓库根目录，也就是包含以下内容的目录：

- `package.json`
- `AGENTS.md`
- `packages/`
- `AI_HELP_MD/`

VSCode Tasks 使用 `${workspaceFolder}`，只要打开的是仓库根目录，换目录后仍然可用。

## PowerShell 根目录变量

如果你希望命令不依赖固定路径，可以在 PowerShell 中设置：

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
$env:OPENCODE_DEV_ROOT = (Resolve-Path -LiteralPath '.').Path
```

以后在同一个 PowerShell 窗口里可以使用：

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
cd $env:OPENCODE_DEV_ROOT
bun dev:desktop
```

如果要写入用户环境变量，让新 PowerShell 也能读取：

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
[Environment]::SetEnvironmentVariable('OPENCODE_DEV_ROOT', (Resolve-Path -LiteralPath '.').Path, 'User')
```

新开 PowerShell 后使用：

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
cd $env:OPENCODE_DEV_ROOT
bun dev:desktop
```

## Bun 路径配置

正常情况下，安装 Bun 后新开的 PowerShell / VSCode 会自动找到 `bun`。

如果提示找不到 `bun`，可以设置可选环境变量 `BUN_LINKS_PATH`，指向 Bun 命令所在目录。示例：

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
[Environment]::SetEnvironmentVariable('BUN_LINKS_PATH', '<你的 Bun 命令目录>', 'User')
```

例如当前机器曾使用 WinGet 安装 Bun，命令目录类似：

```text
%LOCALAPPDATA%\Microsoft\WinGet\Links
```

`.vscode/tasks.json` 会在 `BUN_LINKS_PATH` 存在时临时追加到 PATH；如果没配置，则直接使用系统 PATH 中的 `bun`。

## 相对路径速查

以下路径都相对于 `<repo-root>`：

- `packages/desktop`：Electron 桌面客户端包。
- `packages/desktop/src/renderer`：桌面端 UI 渲染层。
- `packages/desktop/src/main`：Electron 主进程。
- `packages/desktop/src/preload`：主进程与 UI 的桥接 API。
- `packages/app/src`：共享 Web UI 和业务界面。
- `packages/ui/src`：共享 UI 组件和主题。
- `AI_HELP_MD`：个人二开指导文档和 Handoff。