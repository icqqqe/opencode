---
name: opencode-windows-desktop-dev
description: Workflow for assisting OpenCode Windows desktop client secondary development in the user's personal fork. Use when Codex needs to explain or modify this OpenCode monorepo, especially `packages/desktop`, Electron/Vite/Solid desktop UI startup, VSCode debugging, official `upstream/dev` synchronization, GitHub fork workflows, Chinese commit messages, AI_HELP_MD handoff maintenance, and repo-synced skill maintenance under `AI_HELP_MD/skills`.
---

# OpenCode Windows Desktop Dev

## Core Context

Use this skill for the user's personal OpenCode Windows desktop fork, not for the company game workspace.

Primary repository conventions:

- Treat `<repo-root>` as the current clone root, not a fixed drive path.
- Keep personal maintenance docs, workflow logs, handoffs, and repo-copy skills under `AI_HELP_MD/`.
- Repo-synced skill copies live under `<repo-root>/AI_HELP_MD/skills/<skill-name>`.
- Current-machine installed skill copies live under `%USERPROFILE%\.codex\skills\<skill-name>`.
- When creating or updating any skill under `AI_HELP_MD/skills/`, update both the repo copy and installed copy, and keep their `SKILL.md` / `agents/openai.yaml` contents identical unless the user explicitly asks otherwise.
- This skill's repo copy is `<repo-root>/AI_HELP_MD/skills/opencode-windows-desktop-dev`; this machine's installed copy is `C:\Users\Administrator\.codex\skills\opencode-windows-desktop-dev`.
- All PowerShell commands must start with exactly one UTF-8 initialization line:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
```

## Read First

When starting a task in this repo, read only the needed context in this order:

1. `<repo-root>/AGENTS.md`
2. `<repo-root>/AI_HELP_MD/README.md`
3. `<repo-root>/AI_HELP_MD/CODEX_OPENCODE_WINDOWS_CLIENT_DEV_GUIDE.md`
4. `<repo-root>/AI_HELP_MD/PROJECT_ROOT_CONFIG.md`
5. Latest relevant `<repo-root>/AI_HELP_MD/HANDOFF_*.md`

Stop reading once the active task is clear.

## Desktop Code Map

Use this route when explaining or debugging startup:

1. `<repo-root>/package.json` is the monorepo entry and forwards scripts such as `dev:desktop`.
2. `<repo-root>/packages/desktop/package.json` owns desktop scripts:
   - `dev`: `electron-vite dev`
   - `build`: `electron-vite build`
   - `preview`: `electron-vite preview`
   - `package:win`: `electron-builder --win --config electron-builder.config.ts`
3. `<repo-root>/packages/desktop/electron.vite.config.ts` defines Electron build entries:
   - main: `src/main/index.ts` and `src/main/sidecar.ts`
   - preload: `src/preload/index.ts`
   - renderer: `src/renderer/index.html` and `src/renderer/loading.html`
4. Main process startup: `packages/desktop/src/main/index.ts`
5. Window creation: `packages/desktop/src/main/windows.ts`
6. IPC bridge: `packages/desktop/src/preload/index.ts`
7. Renderer entry: `packages/desktop/src/renderer/index.tsx`
8. Shared app UI: `packages/app/src/pages/layout.tsx`, `home.tsx`, `session.tsx`, `components/titlebar.tsx`
9. Shared UI components: `packages/ui/src`

## Run And Debug

Prefer VSCode configuration when the user wants one-click debugging:

- Use `OpenCode Prod: Main Entry` from `.vscode/launch.json`.
- It should run `opencode: desktop prepare prod debug`, which installs dependencies, builds desktop with `OPENCODE_CHANNEL=prod`, and launches Electron with sourcemaps.
- For a main-process breakpoint, start at `packages/desktop/src/main/index.ts` around the `Effect.gen` startup body.

Manual production-preview commands:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
cd '<repo-root>\packages\desktop'
$env:OPENCODE_CHANNEL = 'prod'
bun run build
bun run preview
```

Manual production package command:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;
cd '<repo-root>\packages\desktop'
$env:OPENCODE_CHANNEL = 'prod'
bun run build
bun run package:win
```

Remember:

- `bun dev:desktop` / `electron-vite dev` is development mode and shows the blue `DEV` badge and debug bar.
- `OPENCODE_CHANNEL=prod` plus `build` / `preview` is the production-style local preview.
- `package:win` creates a Windows installer under `packages/desktop/dist`.

## GitHub And Branch Workflow

Remote roles:

- `upstream` is the official `https://github.com/anomalyco/opencode.git` repository.
- `origin` is the user's personal GitHub repository.
- Official default branch is `dev`.
- Personal development branch is `work/windows-client-ui`.

To explain sync without operating:

```text
upstream/dev -> local dev -> origin/dev -> work/windows-client-ui -> origin/work/windows-client-ui
```

Use Git/P4 analogies for the user:

- `git status --short --branch`: like checking current stream and pending changelist.
- `git add`: add files to pending submit set.
- `git commit`: local changelist record.
- `git push`: submit to remote depot.
- `upstream/dev`: official mainline.
- `origin/work/windows-client-ui`: user's remote development stream.

If pushing this branch after history was intentionally rebased/reset to a release baseline, use `git push --force-with-lease`, not plain `--force`.

## Commit Rules

For this personal fork:

- Keep conventional commit type and optional scope, e.g. `docs:` or `chore(desktop):`.
- Write commit summaries and commit bodies in Chinese.
- Mention what changed in user-readable Chinese.
- If pre-push hooks fail only because of the known Windows symlink checkout issue, it is acceptable to set `HUSKY=0` for the push and explain that clearly.

Known environment issue:

- Windows checkout currently has `core.symlinks=false`.
- Official symlink `packages/enterprise/src/custom-elements.d.ts` may appear as a plain text file and break root pre-push typecheck.
- Prefer validating desktop changes with `bun run build` from `packages/desktop`.

## Documentation Maintenance

When a workflow decision or user preference should survive future threads:

- Update `AI_HELP_MD/CODEX_WORKFLOW_LOG.md`.
- Add or update a handoff under `AI_HELP_MD/HANDOFF_YYYY-MM-DD_*.md` when handing off larger work.
- Keep repo docs path-portable: prefer `<repo-root>`, `${workspaceFolder}`, and `OPENCODE_DEV_ROOT` over fixed local paths.
- If changing any repo-synced skill under `AI_HELP_MD/skills/`, update both installed and repo copies.