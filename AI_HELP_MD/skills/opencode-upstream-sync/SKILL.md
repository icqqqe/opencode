---
name: opencode-upstream-sync
description: Workflow for syncing official OpenCode dev into the user's work/windows-client-ui branch, preserving local Windows features, maintaining the single conflict ledger, validating portable VSCode F5 startup, and pushing code plus records.
---

# OpenCode Upstream Sync

## Overview

Use this skill from the current OpenCode repository root when the user asks to sync official OpenCode changes into the personal Windows desktop UI branch.

The core rule is: preserve the local branch's intended Windows desktop and UI features, then port those local changes onto the latest official code shape so official additions and fixes are also present.

## Repository Roles

- `upstream` is the official OpenCode repository.
- `origin` is the user's GitHub fork.
- `dev` is the official-sync branch in the fork.
- `work/windows-client-ui` is the local Windows desktop UI development branch.

Treat this like a P4 integrate from the official stream into the user's work stream: do not discard local work just to make the file look like upstream, and do not ignore upstream structural changes just to keep the old local code.

## Preflight

1. Use the `opencode-windows-desktop-dev` skill first if it is available.
2. Read `<repo-root>/AGENTS.md`.
3. Read `<repo-root>/AI_HELP_MD/CODEX_OPENCODE_WINDOWS_CLIENT_CHANGELOG.md` before fetch or merge. It is the single long-term feature log and mandatory conflict-resolution ledger. Review its “官方同步强制规则”, “长期保护基线”, and latest sync entry.
4. Confirm these portable F5 files are tracked and still connected to each other:
   - `.vscode/launch.json`
   - `.vscode/tasks.json`
   - `.vscode/opencode.ps1`
5. Run all PowerShell commands with UTF8 initialization:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
```

6. Check the branch, tracking branch, stash list, worktree, and remotes before changing anything:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
git status --short --branch
git stash list
git remote -v
```

If unrelated user edits are present, keep them. If they affect the merge target, inspect and work with them instead of reverting. If a narrow stash is necessary, give it a descriptive name, record it in the changelog, and do not drop or restore it without reviewing compatibility after the merge.

## Sync Flow

1. Verify `origin` points to the personal fork and `upstream` points to `https://github.com/anomalyco/opencode.git`. Add `upstream` if it is missing, then fetch both remotes:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
git fetch origin --prune
git fetch upstream --prune
```

2. Pull the latest GitHub work branch into the local work branch before integrating official code:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
git switch 'work/windows-client-ui'
git merge --ff-only 'origin/work/windows-client-ui'
```

If fast-forward is impossible, inspect both histories. Do not reset, rebase, or force-push merely to continue.

3. Compare official refs and record the exact local tip, official tip, common ancestor, and ahead/behind counts in the changelog draft:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
git rev-list --left-right --count 'origin/dev...upstream/dev'
git merge-base 'work/windows-client-ui' 'upstream/dev'
git rev-list --left-right --count 'work/windows-client-ui...upstream/dev'
git log --oneline --decorate -5 'origin/dev'
git log --oneline --decorate -5 'upstream/dev'
```

Prefer merging `upstream/dev` when it is ahead of `origin/dev`, because the user's GitHub fork may lag behind the official repository even after a web sync.

4. Merge without flattening history:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
git merge --no-ff 'upstream/dev'
```

Use `origin/dev` instead only when it already contains the same latest official commits.

## Conflict Policy

Never resolve conflicts by blindly choosing `ours` or `theirs`.

Preserve local Windows-client features and user-requested behavior, including:

- VSCode F5 desktop debug configuration.
- China-friendly Electron install and mirror setup.
- Windows desktop sidecar and system proxy fixes.
- `$skill` prompt and command behavior.
- Local UI changes that are intentional secondary development.

Merge official updates, including:

- API shape changes and call-site refactors.
- Core, server, SDK, schema, migration, and dependency changes.
- Official package and `bun.lock` changes.
- Renames, generated files, and test updates.
- Bug fixes that affect desktop startup or runtime behavior.

When both sides edit the same logic, port the local feature onto the new official structure. For example, if upstream changes a context from `sync.data` to `sync().data`, keep the local feature but update it to use `sync().data`.

For every conflicted file, inspect the base, local, and official versions. Record what upstream changed, what local behavior must survive, and how the final code adapts that behavior to the official structure. Also record compatibility edits that do not appear as Git conflicts, such as new union members, moved tests, renamed exports, or changed SDK/API call sites.

For generated files, prefer the official generated result unless this fork intentionally changed the generator or generated output. If package metadata changes, run `bun install` so `bun.lock` matches the final dependency graph.

## Mandatory Changelog Record

Every sync, including a clean merge with no textual conflicts, must update this one file:

`<repo-root>/AI_HELP_MD/CODEX_OPENCODE_WINDOWS_CLIENT_CHANGELOG.md`

Append one dated entry containing:

- Local work-branch commit before merge, official source commit, and common ancestor.
- Commit counts or ahead/behind counts for both sides.
- Merge source and merge commit when available.
- Local protection-baseline items reviewed.
- One row per conflict: file, upstream change, local intent, and final resolution.
- Non-conflict compatibility edits caused by upstream changes.
- Dependency, lockfile, generated-file, and test handling.
- Exact validation commands and results.
- Any stash created or intentionally preserved.
- Commit subject, push target, and push result when available.

Do not write vague notes such as “kept local changes.” The changelog, merge-related code, VSCode F5 files, and repository skill copy must be included in the same final submission batch and pushed to GitHub.

## Validation

After resolving conflicts, verify no conflict markers remain:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
rg -n -e '^<<<<<<<' -e '^=======$' -e '^>>>>>>>' .
git diff --check
```

If package files or `bun.lock` changed, run install with the Electron mirror:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
$env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
$env:npm_config_electron_mirror = 'https://npmmirror.com/mirrors/electron/'
bun install
```

Run `bun run typecheck` from each affected package directory. Do not run package tests from the repository root.

Validate the exact portable F5 preparation action from the repository root:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File '.\.vscode\opencode.ps1' 'PrepareProdDebug'
```

Confirm `packages/desktop/node_modules/.bin/electron.exe`, `packages/desktop/out/main/index.js`, and `packages/desktop/out/main/index.js.map` exist. Confirm `.vscode/launch.json` still uses `OpenCode Prod: Main Entry` and invokes `opencode: desktop prepare prod debug`.

Run focused tests for every local feature touched by conflicts. Let the normal pre-push hook run its full checks. Bypass Husky only when the failure is conclusively an unrelated known Windows symlink checkout issue, all relevant package checks passed, and the reason is written in the changelog and final report.

## Skill Copies

This workflow is maintained in two places:

- Repository source: `<repo-root>/AI_HELP_MD/skills/opencode-upstream-sync`
- Installed copy: `%USERPROFILE%\.codex\skills\opencode-upstream-sync`

When changing this workflow, edit the repository source first, copy `SKILL.md` and `agents/openai.yaml` to the installed location, then compare both files byte-for-byte. Only the repository copy is committed, but both copies must match on the current machine.

## Commit And Push

Use a Chinese conventional commit summary, for example:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
git commit -m 'chore: 同步官方 dev 到 Windows 客户端分支'
```

Push the UI branch to the user's fork:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
git push 'origin' 'work/windows-client-ui'
```

Only after satisfying the validation conditions above, if the known Windows symlink checkout issue is the sole pre-push failure, use `HUSKY=0` and record the reason in the changelog and final report:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
$env:HUSKY = '0'
git push 'origin' 'work/windows-client-ui'
```

Finish only after confirming `HEAD` equals `origin/work/windows-client-ui`, the worktree has no unexpected changes, the changelog and repository skill copy are present in pushed history, and the installed skill copy matches the repository copy.

Report the official source commit, merge commit, conflicts and decisions, validations, maintenance commit, push result, and any preserved stash.
