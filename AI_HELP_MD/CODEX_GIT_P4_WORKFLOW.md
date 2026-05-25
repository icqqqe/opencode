# Git / P4 对照工作流

本文面向习惯 P4 的开发者，用来理解本项目日常 Git 操作。

## 核心概念对照

| P4 习惯 | Git 对应 | 本项目用法 |
| --- | --- | --- |
| Depot / 主线 | Remote branch | `upstream/dev` 是官方主线 |
| Workspace | Working tree | `<repo-root>` |
| Stream | Branch | `work/windows-client-ui` 是你的开发分支 |
| Sync latest | `git fetch` + `git merge` 或 `git pull` | 从 `upstream/dev` 拉官方更新 |
| Open for edit | 直接修改工作区文件 | 修改前先确认文件可写 |
| Pending changelist | Working tree + index | `git status` 查看未提交改动 |
| Reconcile offline work | `git status` | 找出新增、修改、删除 |
| Submit changelist | `git commit` + `git push` | 先本地提交，再推送到自己的 GitHub |
| Integrate / Merge down | `git merge upstream/dev` | 把官方更新合入你的开发分支 |
| Shelve | `git stash` 或临时分支 | 临时保存未完成改动 |

## 推荐日常流程

1. 查看当前状态：
   `git status --short --branch`
2. 切到个人分支开发：
   `git switch 'work/windows-client-ui'`
3. 拉取官方最新信息：
   `git fetch 'upstream'`
4. 合入官方主线：
   `git merge 'upstream/dev'`
5. 查看改动：
   `git diff`
6. 暂存要提交的文件：
   `git add <文件路径>`
7. 本地提交：
   `git commit -m 'docs: add windows client development notes'`
8. 推送到自己的 GitHub：
   `git push -u 'origin' 'work/windows-client-ui'`

## 远端命名规则

- `upstream`：官方 opencode 仓库，只拉取，不往这里推。
- `origin`：你的 GitHub 仓库，用于保存二次开发代码和文档。

如果还没有自己的 GitHub 仓库，先在 GitHub 网页创建一个空仓库，然后把仓库 URL 配成 `origin`。

## 不要做的事

- 不要把 GitHub 密码、Token、SSH 私钥写进 MD 或发到聊天里。
- 不要直接在 `dev` 分支提交二次开发功能。
- 不要向 `upstream` 推送本地分支。
- 不要在不了解后果时执行 `git reset --hard` 或强制推送。