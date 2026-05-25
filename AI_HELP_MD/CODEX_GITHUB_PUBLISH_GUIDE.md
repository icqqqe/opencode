# GitHub 发布指南

本文记录把本地二开工程推送到开发者自己 GitHub 仓库的安全流程。

## 凭据原则

- 不要把 GitHub 密码、Token、SSH 私钥发到聊天里。
- 不要把任何凭据写进仓库 MD。
- Git push 需要认证时，优先使用 Git Credential Manager 弹窗或浏览器网页登录。

## 推荐步骤

1. 在 GitHub 网页创建一个空仓库。
   示例仓库名：`opencode-windows-client-dev`。
2. 不要在 GitHub 页面勾选初始化 README、LICENSE 或 .gitignore，因为本地已经有完整源码。
3. 复制仓库 HTTPS URL。
   示例：`https://github.com/<你的账号>/opencode-windows-client-dev.git`。
4. 在本地配置 `origin`：

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
git remote add 'origin' 'https://github.com/<你的账号>/opencode-windows-client-dev.git'
```

5. 查看远端：

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
git remote -v
```

6. 提交当前维护文档：

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
git status --short --branch
git add 'AGENTS.md' '.gitignore' '.vscode/tasks.json' 'AI_HELP_MD/README.md' 'AI_HELP_MD/PROJECT_ROOT_CONFIG.md' 'AI_HELP_MD/CODEX_GIT_P4_WORKFLOW.md' 'AI_HELP_MD/CODEX_GITHUB_PUBLISH_GUIDE.md' 'AI_HELP_MD/CODEX_OPENCODE_WINDOWS_CLIENT_DEV_GUIDE.md' 'AI_HELP_MD/CODEX_WORKFLOW_LOG.md' 'AI_HELP_MD/HANDOFF_2026-05-25_OPENCODE_WINDOWS_CLIENT_INIT.md'
git commit -m 'docs: initialize windows client development workflow'
```

7. 推送个人开发分支：

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
git push -u 'origin' 'work/windows-client-ui'
```

## P4 类比

- `git remote add origin`：类似给当前 workspace 配一个自己的远端 depot 地址。
- `git add`：类似把文件放入 pending changelist。
- `git commit`：类似本地生成一次 changelist 记录。
- `git push`：类似把 changelist submit 到远端服务器。
- `git fetch upstream`：类似从官方 depot sync 元数据。
- `git merge upstream/dev`：类似把官方主线 integrate 到自己的开发 stream。