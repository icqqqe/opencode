# AI_HELP_MD 文档索引

本目录保存个人二次开发 OpenCode Windows 客户端时由 AI 维护的指导文档、流程记录和 Handoff。

## 路径约定

- `<repo-root>` 表示当前 OpenCode 仓库根目录，也就是包含 `package.json`、`AGENTS.md`、`packages/` 的目录。
- 文档内优先使用相对路径，例如 `packages/desktop/src/renderer`。
- VSCode 内优先使用 `${workspaceFolder}`，因此换电脑或换目录后只要打开新的仓库根目录即可。
- 如需在 PowerShell 中固定根目录，可设置环境变量 `OPENCODE_DEV_ROOT`，详见 `PROJECT_ROOT_CONFIG.md`。

## 文档关系

| 文档 | 作用 | 主要关联 |
| --- | --- | --- |
| `../AGENTS.md` | 仓库级 AI 协作规则，允许保留在根目录 | 指向本目录维护文档规则 |
| `README.md` | 本索引，记录文档位置和关系 | 全部 `AI_HELP_MD/*.md` |
| `PROJECT_ROOT_CONFIG.md` | 换电脑/换目录后的根目录和工具路径配置 | VSCode Tasks、PowerShell 手动命令 |
| `CODEX_OPENCODE_WINDOWS_CLIENT_DEV_GUIDE.md` | Windows 客户端二开主指南 | `packages/desktop`、`.vscode/tasks.json` |
| `CODEX_GIT_P4_WORKFLOW.md` | Git / P4 对照工作流 | `CODEX_GITHUB_PUBLISH_GUIDE.md` |
| `CODEX_GITHUB_PUBLISH_GUIDE.md` | 推送到个人 GitHub 仓库的步骤 | `CODEX_GIT_P4_WORKFLOW.md` |
| `CODEX_WORKFLOW_LOG.md` | 当前会话和后续会话的长期工作记录 | Handoff、开发指南 |
| `HANDOFF_2026-05-25_OPENCODE_WINDOWS_CLIENT_INIT.md` | 初始化阶段交接记录 | 工作流日志、开发指南 |
| `HANDOFF_2026-05-25_NEXT_THREAD_DEVELOPMENT.md` | 下一线程开发交接入口 | `AGENTS.md`、开发指南、根目录配置 |

## 后续维护规则

- 新增指导类文档放入 `AI_HELP_MD/`。
- 新增 Handoff 也放入 `AI_HELP_MD/`，文件名建议使用 `HANDOFF_YYYY-MM-DD_主题.md`。
- 文档间引用优先使用相对路径。
- 不在文档中记录 GitHub 密码、Token、SSH 私钥等凭据。