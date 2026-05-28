# OpenCode Windows Client Change Log

> 本文件用于长期追踪个人 Windows 桌面端二开分支中的重要修改。以后新线程继续开发时，优先阅读本文件最近条目，再结合相关 handoff 文档和当前 `git status` 判断工作区状态。

## 记录规范

- 每次较大改动追加一个条目，不覆盖旧记录。
- 每个条目至少包含：时间、背景、修改原则、涉及文件、具体改动、验证结果、已知问题、后续接续建议。
- 只记录事实和工程判断，不记录账号、token、私钥等敏感信息。
- 本文件只做追踪记录，不代表已经提交到 Git 或推送到 GitHub。

## 2026-05-28 15:38:00 +08:00 - 增加 AGENTS 自动发现开关

### 背景

用户在非 Git 管理的公司工作区 `E:\workspace\game\ts_workspace` 使用 OpenCode，当前工作目录已经是 `ts_workspace`，但 OpenCode 默认 AGENTS 自动发现会继续向上查找到 `E:\workspace\game\AGENTS.md`。用户希望在 `opencode.json` 中显式关闭默认自动寻找 `AGENTS.md` 的机制，关闭后只以 `instructions` 配置为准。

### 涉及文件与修改内容

- `packages/opencode/src/config/config.ts`
  - 新增配置字段 `autodiscover_instructions?: boolean`。
  - 未配置时默认保持现状。
  - 配置为 `false` 时关闭自动发现 `AGENTS.md / CLAUDE.md / CONTEXT.md`。

- `packages/opencode/src/session/instruction.ts`
  - `systemPaths()` 在 `autodiscover_instructions === false` 时跳过全局和项目级默认 instruction 文件自动发现。
  - `resolve()` 在 `autodiscover_instructions === false` 时不再通过 read 工具自动补充邻近目录的 `AGENTS.md`。
  - 显式配置的 `instructions` 仍正常加载。

- `packages/opencode/test/session/instruction.test.ts`
  - 新增单测覆盖关闭后不加载项目/全局 `AGENTS.md`。
  - 新增单测覆盖关闭后 read 工具不再补充邻近 `AGENTS.md`。
  - 新增单测覆盖关闭后仍加载显式 `instructions`。

### 验证结果

- `packages/opencode`: `bun test test/session/instruction.test.ts`
  - 12 pass，1 todo。
- `packages/opencode`: `bun run typecheck`
  - 通过。

## 2026-05-28 15:03:29 +08:00 - 修复 Markdown 隐式相对路径误点击

### 背景

用户发现 assistant 回复中的 `CODEX\AGENTS.md` 会被桌面端渲染成可点击本地文件，并错误指向当前会话目录下的 `E:\workspace\game\ts_workspace\CODEX\AGENTS.md`，而真实目标应在 `E:\workspace\game\ts_workspace\ai_custom\CODEX\AGENTS.md`。

### 原因

- `packages/ui/src/components/markdown.tsx` 会扫描 Markdown 文本中所有看起来像本地路径的字符串。
- 原实现把非绝对、但带路径分隔符的字符串也加入本地文件别名，并用当前会话目录拼接。
- 因此 `CODEX\AGENTS.md` 这类“隐式相对路径”会被误判成可打开路径，违反了此前“只有真实全路径或可靠别名才可点击”的设计原则。

### 涉及文件与修改内容

- `packages/ui/src/components/markdown.tsx`
  - 新增本地路径别名选项，区分可信路径来源和普通 Markdown 文本。
  - 普通 Markdown 文本中只接受绝对路径、明确 `./` / `../` 开头的相对路径，或已经能通过绝对路径/工具元数据反查的别名。
  - 不再把 `CODEX\AGENTS.md`、`AI_HELP_MD\xxx.md` 这类隐式相对路径直接拼到当前会话目录。

- `packages/ui/src/components/markdown.test.ts`
  - 新增单测覆盖隐式相对路径不自动拼目录。
  - 新增单测覆盖同一消息内已有绝对路径时，短路径仍可通过别名解析。
  - 新增单测覆盖明确相对路径仍按会话目录解析。

### 验证结果

- `packages/ui`: `bun test src/components/markdown.test.ts`
  - 3 pass。
- `packages/ui`: `bun run typecheck`
  - 通过。

## 2026-05-28 14:30:34 +08:00 - 合并官方 dev 时处理 PromptInput 冲突

### 背景

用户已在 GitHub 网页把官方最新代码合入个人 `dev` 分支，随后本地将 `origin/dev` 合入 `work/windows-client-ui` 时，`packages/app/src/components/prompt-input.tsx` 与本地 `$ skill` 二开功能发生内容冲突。

### 修改原则

- 保留本地 `$ skill` 功能：`$` 触发 skill 列表、正文插入 skill pill、skill pill 高亮、点击 skill pill 查看完整内容 Dialog。
- 接入官方最新输入框结构：`settings.general.newLayoutDesigns()`、project picker、`ComposerModelControl`、`ComposerAgentControl`、新建 project 入口、官方新的拖拽/上下文/图片附件布局。
- 不恢复旧的 `MAIN_WORKTREE` / `CREATE_WORKTREE` 新会话 worktree 下拉逻辑，采用官方最新 project picker 流程。
- 只处理 merge 冲突和记录，不扩展新的交互行为。

### 涉及文件与修改内容

- `packages/app/src/components/prompt-input.tsx`
  - 同时保留 `skillPopoverRef` 与官方新增的 `projectSearchRef`。
  - 保留 placeholder 文案 `Ask anything, / for commands, $ for skills, @ for context...`。
  - 在官方新版 composer JSX 结构中保留 `PromptPopover` 的 skill props、`[data-type=skill]` 高亮 class 和 skill pill 点击 Dialog 行为。
  - 采用官方新版 project picker / composer state 逻辑，兼容 `origin/dev` 中的 session project 切换流程。

- `AI_HELP_MD/CODEX_OPENCODE_WINDOWS_CLIENT_CHANGELOG.md`
  - 追加本次 merge 冲突处理记录，方便后续继续维护 Windows UI 二开分支时追踪。

### 验证结果

- `packages/app/src/components/prompt-input.tsx` 已无标准 Git 冲突标记。
- `git diff --check` 针对本次手动处理的两个文件通过，仅有 Git 在 Windows 下提示未来可能做 LF/CRLF 转换。

### 已知问题

- 本仓库当前 Windows 环境仍可能因为 `@typescript/native-preview-win32-x64` 可选平台包入口或官方 symlink checkout 问题导致 pre-push/typecheck 失败；该问题不是本次 PromptInput 冲突处理新增。

## 2026-05-26 11:00:54 +08:00 - `$` skill 调用、skill 去重、文件点击打开

### 背景

用户希望把 OpenCode app 的 skill 调用从 `/` 迁移为类似 Codex 的 `$` 方式：输入 `$` 弹出 skill 列表；正文任意位置可多次引用 skill；发送后只显示短引用；点击短引用查看完整内容；同一个 skill 重复引用只展开一次完整内容；assistant 回复和工具卡片中的本地文件名/路径可以点击打开。

### 修改原则

- UI 输入层保留短引用，模型请求层通过 synthetic text part 注入 skill 内容。
- 同名 skill 在一次请求中只注入一次完整 `SKILL.md` 内容；重复引用只保留正文里的 `$skillName`，metadata 保留所有出现位置用于高亮。
- 发送后的用户消息只展示去重后的 skill chip；点击 chip 查看完整内容。
- 本地文件链接只在能解析出真实全路径或有可靠别名时可点击；不再把 `AGENTS.md`、`xxx.ts` 这类裸文件名硬拼到工作区一级目录。
- 文件打开复用 desktop 已有 `platform.openPath()` / Electron IPC，不新增主进程协议。
- Windows 上点击本地文件优先尝试 VSCode `code`，找不到时由平台层回退系统默认打开。
- 不启动 localhost dev server；用户会自行用正式 Debug 程序验证。

### 涉及文件与修改内容

#### App 输入与请求构建

- `packages/app/src/context/prompt.tsx`
  - 新增 `SkillPart` prompt part 类型。
  - 让 prompt 可以同时包含 text、file、agent、skill、image。

- `packages/app/src/components/prompt-input.tsx`
  - 支持 `$` 触发 skill 列表。
  - 支持在正文任意位置插入 skill pill。
  - 支持多次插入 skill。
  - skill pill 点击后弹出完整内容 Dialog。
  - 修复 skill 完整内容 Dialog 滚动布局，避免 scrollbar 溢出小窗口、底部显示不全。

- `packages/app/src/components/prompt-input/slash-popover.tsx`
  - 扩展 popover 数据结构以支持 skill 列表模式。
  - `/` 列表不再混入 skill，skill 改由 `$` 独立触发。

- `packages/app/src/components/prompt-input/editor-dom.ts`
  - 解析/渲染 contenteditable 时识别 skill pill。

- `packages/app/src/components/prompt-input/history.ts`
  - prompt history 支持保存和恢复 skill part。

- `packages/app/src/components/prompt-input/submit.ts`
  - 提交 prompt 时保留 skill part，交给 request builder 生成请求 part。

- `packages/app/src/components/prompt-input/build-request-parts.ts`
  - 将 `SkillPart` 转换为 synthetic text part。
  - synthetic 文本格式为 `<skill_content name="...">... </skill_content>`。
  - 同名 skill 去重：一次请求中只生成一个完整 skill 内容。
  - metadata 写入 `opencodeSkill.name`、`description`、`content`、`source`、`sources`。
  - `source` 保持首个出现位置，`sources` 保留所有重复引用位置。

- `packages/app/src/components/prompt-input/build-request-parts.test.ts`
  - 新增 `$skill` synthetic part 测试。
  - 覆盖重复 `$planner` 只生成一个 synthetic skill part 的行为。

- `packages/app/src/utils/prompt.ts`
  - 从已有 message parts 恢复 prompt 时识别 skill metadata。
  - 支持 undo/history 恢复 `$skill` 短引用和 skill pill。

#### App 与 UI 数据通道

- `packages/app/src/pages/directory-layout.tsx`
  - 从 app platform 注入 `openPath` 到 UI `DataProvider`。
  - Windows desktop 环境下优先传入 `code` 作为打开程序。

- `packages/ui/src/context/data.tsx`
  - `DataProvider` 新增 `openPath?: (path: string) => Promise<void> | void`。
  - UI 组件可以通过 `useData().openPath` 打开本地文件。

#### 消息展示与 Markdown 本地文件链接

- `packages/ui/src/components/message-part.tsx`
  - 用户消息显示 `$skill` 高亮。
  - 用户消息下方显示去重后的 skill chip。
  - 点击 skill chip 弹出完整 skill 内容 Dialog。
  - Dialog 改为可滚动布局，避免长 skill 内容显示不全。
  - edit/write/apply_patch 工具标题文件名可点击打开。
  - apply_patch diff 折叠区文件名可点击打开，点击右侧三角仍保持原展开/收起逻辑。
  - read 工具的“已读取”文件名可点击打开。
  - 新增本地路径别名收集：text/reasoning 中出现的 Windows 绝对路径、file part 的 `source.path` 和 `file://` URL、tool input 的 `filePath` / `path`、tool metadata 的 `filediff.file`、`loaded`、`diagnostics`、`files[].filePath`。
  - 裸文件名只有在能从真实路径别名反查时才可点击。

- `packages/ui/src/components/message-part.css`
  - 新增可点击文件名的 cursor 和 hover underline 样式。
  - 保持原工具卡片布局和折叠操作。

- `packages/ui/src/components/markdown.tsx`
  - Markdown 渲染后识别本地文件路径/文件名。
  - 通过 `localFileAliases` 解析裸文件名或相对片段到真实全路径。
  - 只对可解析路径生成 `markdown-local-file-link`。
  - 点击链接调用 `openLocalFile(path)`。
  - 避免在 `pre`、`code`、已有 `a`、`button` 内重复包裹。

- `packages/ui/src/components/markdown.css`
  - 新增本地文件链接样式。
  - 复用交互色和 hover underline。

- `packages/ui/src/components/dialog.css`
  - `dialog-body` 增加 `min-height: 0`，让内部 flex 滚动区域正确收缩。

### 当前工作区文件状态

本条记录对应的代码改动文件：

- `packages/app/src/components/prompt-input.tsx`
- `packages/app/src/components/prompt-input/build-request-parts.test.ts`
- `packages/app/src/components/prompt-input/build-request-parts.ts`
- `packages/app/src/components/prompt-input/editor-dom.ts`
- `packages/app/src/components/prompt-input/history.ts`
- `packages/app/src/components/prompt-input/slash-popover.tsx`
- `packages/app/src/components/prompt-input/submit.ts`
- `packages/app/src/context/prompt.tsx`
- `packages/app/src/pages/directory-layout.tsx`
- `packages/app/src/utils/prompt.ts`
- `packages/ui/src/components/dialog.css`
- `packages/ui/src/components/markdown.css`
- `packages/ui/src/components/markdown.tsx`
- `packages/ui/src/components/message-part.css`
- `packages/ui/src/components/message-part.tsx`
- `packages/ui/src/context/data.tsx`

额外说明：

- 当前工作区曾出现 `bun.lock` dirty 状态，但 `git diff --name-status` 和 `git diff --stat` 未显示实际内容差异；本次功能记录不把它视为有意修改内容。
- 当前还有历史生成的未跟踪文档，例如桌面架构说明和 `$ skill` handoff 文档，提交前需要统一审阅。

### 验证结果

已执行并通过：

- `packages/app`: `bun test src/components/prompt-input/build-request-parts.test.ts`
  - 13 pass。
  - 覆盖重复 `$planner` 只生成一个 synthetic skill 内容。

- `packages/app`: `bun run test:unit`
  - 334 pass。

- `packages/ui`: `bun run typecheck`
  - 通过。

- `packages/ui`: `bun run test`
  - 21 pass。

- `packages/app`: 临时 `tsgo` typecheck
  - 使用临时 `tsconfig.codex-check.json` 排除已知 Windows symlink 文件 `src/custom-elements.d.ts`。
  - 通过。

- 仓库根目录：`git diff --check`
  - 通过。

未通过但属于已知环境问题：

- `packages/app`: 正式 `bun run typecheck`
  - 失败在 `src/custom-elements.d.ts`。
  - Windows checkout 当前把官方 symlink 展开成普通文本 `../../ui/src/custom-elements.d.ts`，导致 TS 解析失败。
  - 此问题不是本次 `$ skill` / 文件点击改造引入。

### 行为确认清单

后续打开正式 Debug 程序时重点测：

- 空输入框输入 `$` 可以弹出 skill 列表。
- 正文中任意位置输入 `$` 可以弹出 skill 列表。
- 同一个 skill 多次插入后，发送消息下方只显示一个 skill chip。
- 同一个 skill 多次插入后，模型请求只包含一次完整 skill 内容。
- 点击 skill chip 可以查看完整 skill 内容，长内容滚动正常。
- undo/history 可以恢复 skill pill。
- assistant 回复中的完整 Windows 本地路径可点击打开。
- 只有在消息/工具上下文中能反查真实路径时，裸文件名才可点击。
- edit/write/apply_patch 工具标题文件名点击打开文件，右侧三角仍只负责展开/收起。

### 后续接续建议

新线程继续时可直接说：

```text
继续 OpenCode Windows 桌面端 `$ skill` 二开。先读 AI_HELP_MD/CODEX_OPENCODE_WINDOWS_CLIENT_CHANGELOG.md 最新条目，再检查当前 git status。不要提交。重点验证 `$skill` 去重、skill chip 展示、Markdown 本地文件点击打开、apply_patch 文件名点击打开和正式 Debug 程序中的实际行为。
```
