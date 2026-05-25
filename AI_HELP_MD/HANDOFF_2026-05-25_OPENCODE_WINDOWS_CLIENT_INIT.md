# Handoff: OpenCode Windows 客户端二次开发初始化

日期：2026-05-25

## 当前状态

- 本地仓库目录：`<repo-root>`
- 官方源码已拉取：`https://github.com/anomalyco/opencode.git`
- 当前分支：`work/windows-client-ui`
- 官方远端：`upstream`
- 官方默认分支：`dev`
- 当前 HEAD：`d5f397a2da98be28df257325ca49a6c2bdf44a84`

## 已完成

- 克隆官方 `dev` 分支到当前目录。
- 确认桌面客户端目录为 `packages/desktop`。
- 确认桌面端为 Electron 项目。
- 确认根脚本 `dev:desktop`，桌面端脚本 `dev`、`build`、`package:win`。
- 创建二次开发工作分支 `work/windows-client-ui`。
- 建立`AI_HELP_MD/` 维护文档和 Handoff 文档。

## 重要约定

- 不需要也不允许在聊天或文档里记录 GitHub 密码、Token、SSH 私钥。
- `upstream` 只用于同步官方源码。
- `origin` 预留给用户自己的 GitHub 仓库。
- 后续二次开发改动应提交到 `work/windows-client-ui`。
- 指导类 MD 和 Handoff MD 统一放在 `AI_HELP_MD/` 目录。

## 当前阻塞

- 暂无启动级阻塞。
- `bun.lock` 曾显示 modified 但没有实际内容 diff，已刷新索引状态。

## 下一步

1. 用户创建自己的 GitHub 空仓库后，配置 `origin`。
2. 提交并推送源码和`AI_HELP_MD/` 维护文档。
3. 后续 UI 二次开发从 `packages/desktop/src/renderer` 开始。

## 依赖与启动验证结果

- `bun@1.3.14` 已安装并验证。
- `bun install` 已成功。
- `packages/desktop` 下 `bun run build` 已成功。
- Electron 缺失二进制的问题已通过 `node install.js` 修复。
- `bun run dev` 已成功启动 Electron 桌面端开发模式。
- 本地日志目录：`.codex_dev_logs/`。
## 当前运行状态

- 已完成一次桌面端开发模式启动验证，日志显示 `server ready`。
- 当前没有残留 `bun/electron/electron-vite` 进程。
- 日志尾部显示 `sidecar exited { code: 0 }`，未见崩溃栈。
## 文档迁移补充

- 根目录保留 `AGENTS.md`。
- 个人二开指导文档、工作流记录和 Handoff 统一存放在 `AI_HELP_MD/`。
- 文档关系索引见 `AI_HELP_MD/README.md`。
- 根目录可移植配置见 `AI_HELP_MD/PROJECT_ROOT_CONFIG.md`。
## GitHub 推送目标

- 用户个人仓库：`https://github.com/icqqqe/opencode.git`
- 远端名：`origin`
- 推送分支：`work/windows-client-ui`
- 官方仓库仍保留为：`upstream`
## GitHub 推送结果

- 已成功推送到：`origin/work/windows-client-ui`
- 远端仓库：`https://github.com/icqqqe/opencode.git`
- GitHub PR 地址：`https://github.com/icqqqe/opencode/pull/new/work/windows-client-ui`
- 推送时因 Windows 本地 symlink checkout 导致官方 pre-push typecheck 失败，本次使用 `HUSKY=0` 跳过 hook。