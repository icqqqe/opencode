# 工作流记录

## 2026-05-25 初始化

用户目标：

- 在 `E:\mygithub\opencode` 二次开发 OpenCode Windows 桌面客户端界面。
- 从 `anomalyco/opencode` 拉取源码。
- 后续把源码、维护文档、Handoff 文档都推送到用户自己的 GitHub 仓库。
- 用户平时更熟悉 P4，因此 Git 操作需要用 P4 类比解释。
- 日常交流中的重要要求和工作流，需要随时沉淀到指导类 MD。
- 维护文档和 Handoff 文档直接放在仓库根目录，不放到 `ai_custom/CODEX`。

已确认：

- 本地目录原本为空。
- 已从官方仓库拉取 `dev` 分支源码。
- 当前官方远端命名为 `upstream`。
- 桌面客户端位于 `packages/desktop`，是 Electron 客户端。
- 根命令 `bun dev:desktop` 会进入桌面端开发模式。
- 本机已有 Git、Node、npm。
- 已安装并验证 `bun@1.3.14`。

当前分支策略：

- `dev`：跟踪官方 `upstream/dev`，尽量保持干净。
- `work/windows-client-ui`：用户二次开发分支。

待办：

- 用户创建或提供自己的 GitHub 空仓库 URL 后，配置 `origin` 并推送。
- 后续 UI 二次开发从 `packages/desktop/src/renderer` 入手。

## 2026-05-25 依赖安装与桌面端启动

已完成：

- 使用 winget 安装 `bun@1.3.14`。
- 当前 shell PATH 未自动刷新，因此后续命令临时追加 `C:\Users\Administrator\AppData\Local\Microsoft\WinGet\Links` 到 PATH。
- 执行 `bun install` 成功，安装 2174 个包。
- `bun run build` 在 `packages/desktop` 下执行成功。
- 首次运行 `bun run dev` 失败，报错 `Electron uninstall`。
- 在 `packages/desktop/node_modules/electron` 下执行 `node install.js` 后，Electron 二进制补齐。
- 再次运行 `bun run dev` 成功，Electron 进程已启动，renderer dev server 为 `http://localhost:5173`。

注意：

- `.codex_dev_logs/` 是本地开发日志目录，已加入 `.gitignore`。
- `bun.lock` 曾显示 modified，但实际内容 hash 未变；已通过 `git add bun.lock` 刷新索引状态，未产生待提交差异。
补充：

- 启动验证日志显示 `server ready`。
- 当前检查时 `bun/electron/electron-vite` 进程已退出，日志尾部为 `sidecar exited { code: 0 }`，未见崩溃栈。
## 2026-05-25 手动开发流程补充

用户要求补充：如何手动编译运行 OpenCode Windows 客户端、如何查看源码、如何修改源码后重新编译运行。

已补充到 `CODEX_OPENCODE_WINDOWS_CLIENT_DEV_GUIDE.md` 的 `手动开发运行流程` 小节。
## 2026-05-25 VSCode 开发流程补充

用户询问是否可以用 VSCode 看源码、编译和运行。

已新增 `.vscode/tasks.json`，提供以下 VSCode Task：

- `opencode: desktop dev`
- `opencode: desktop build`
- `opencode: desktop package win`

已补充到 `CODEX_OPENCODE_WINDOWS_CLIENT_DEV_GUIDE.md` 的 `VSCode 开发流程` 小节。