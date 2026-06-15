---
name: opencode-upstream-sync
description: Workflow for syncing official OpenCode dev into the user's work/windows-client-ui branch, resolving conflicts by preserving local Windows desktop UI features while also merging upstream code, dependency, SDK, and API changes, then validating and pushing.
---

# OpenCode Upstream Sync

## Overview

Use this skill in `E:\mygithub\opencode` when the user asks to sync official OpenCode changes into the personal Windows desktop UI branch.

The core rule is: preserve the local branch's intended Windows desktop and UI features, then port those local changes onto the latest official code shape so official additions and fixes are also present.

## Repository Roles

- `upstream` is the official OpenCode repository.
- `origin` is the user's GitHub fork.
- `dev` is the official-sync branch in the fork.
- `work/windows-client-ui` is the local Windows desktop UI development branch.

Treat this like a P4 integrate from the official stream into the user's work stream: do not discard local work just to make the file look like upstream, and do not ignore upstream structural changes just to keep the old local code.

## Preflight

1. Use the `opencode-windows-desktop-dev` skill first if it is available.
2. Run all PowerShell commands with UTF8 initialization:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
```

3. Check the branch and worktree before changing anything:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
git status --short --branch
git remote -v
```

If unrelated user edits are present, keep them. If they affect the merge target, inspect and work with them instead of reverting.

## Sync Flow

1. Fetch both remotes:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
git fetch origin
git fetch upstream
```

2. Compare official refs:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
git rev-list --left-right --count 'origin/dev...upstream/dev'
git log --oneline --decorate -5 'origin/dev'
git log --oneline --decorate -5 'upstream/dev'
```

Prefer merging `upstream/dev` when it is ahead of `origin/dev`, because the user's GitHub fork may lag behind the official repository even after a web sync.

3. Switch to `work/windows-client-ui` and merge without flattening history:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
git switch 'work/windows-client-ui'
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

For generated files, prefer the official generated result unless this fork intentionally changed the generator or generated output. If package metadata changes, run `bun install` so `bun.lock` matches the final dependency graph.

## Validation

After resolving conflicts, verify no conflict markers remain:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
rg -n -e '^<<<<<<<' -e '^=======$' -e '^>>>>>>>' 'E:\mygithub\opencode'
```

If package files or `bun.lock` changed, run install with the Electron mirror:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
$env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
$env:npm_config_electron_mirror = 'https://npmmirror.com/mirrors/electron/'
bun install
```

Validate the desktop package with Node 24:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
if (Get-Command 'nvm' -ErrorAction SilentlyContinue) { nvm use 24.11.1 }
$env:OPENCODE_CHANNEL = 'prod'
bun run build
```

Run that build from `packages/desktop`. Do not run root TypeScript checks directly; package typechecks must be run from package directories.

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

If the Windows symlink pre-push hook fails after the desktop build has already passed, push with `HUSKY=0` and report why:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
$env:HUSKY = '0'
git push 'origin' 'work/windows-client-ui'
```

Finish by reporting the merged official commit, local conflict files, validation result, commit hash, and push result.
