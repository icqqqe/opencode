# OpenCode `$` Skill 调用改造接续记录

> 状态：历史接续记录。后续长期追踪以 `AI_HELP_MD/CODEX_OPENCODE_WINDOWS_CLIENT_CHANGELOG.md` 为准；本文保留本轮 `$` skill 改造的接续要点。

时间：2026-05-25 到 2026-05-26
仓库：`E:\mygithub\opencode`
技能：`opencode-windows-desktop-dev`

## 当前目标

把 OpenCode app 的 skill 调用从输入框开头的 `/skill` 优化为类似 Codex 的 `$skill` 引用：

- 输入 `$` 时弹出 skill 列表。
- `$` 可以在正文任意位置触发，可以多次引用 skill。
- 发送后用户消息只显示 `$skill` 短引用，不把完整 `SKILL.md` 直接展开到聊天 UI。
- 点击发送后的 skill chip 可以查看完整 skill 内容。
- 同一条消息里重复引用同名 skill 时，模型请求只注入一次完整 skill 内容，后续引用保留 `$skillName` 文本，避免浪费 token。
- undo/history 能恢复 `$skill` 引用。

## 当前实现摘要

新增 prompt part 类型 `SkillPart`，由输入框插入和渲染 `$skill` pill。发送时 `build-request-parts.ts` 把 `SkillPart` 转换为 synthetic text part：

```ts
<skill_content name="skill-name">
...
</skill_content>
```

该 synthetic part 只给模型请求使用；用户消息 UI 仍保留短引用。metadata 写入 `opencodeSkill`，用于发送后展示、点击查看完整内容、undo/history 恢复。

重复同名 skill 的当前规则：

- 一次请求中只生成一个完整 `<skill_content>` synthetic part。
- `metadata.opencodeSkill.source` 保留第一次出现位置。
- `metadata.opencodeSkill.sources` 保留所有出现位置。
- UI 高亮正文中所有 `$skill` 出现位置，但下方完整内容 chip 去重显示一个。

注意：字段名实际为 `opencodeSkill`，上面两条如果后续人工搜索请以代码为准。

## 已改文件

### App 输入与请求构建

- `packages/app/src/context/prompt.tsx`
  - 增加 `SkillPart`。
  - `ContentPart`、clone/equal 逻辑支持 skill。
- `packages/app/src/components/prompt-input.tsx`
  - 支持 `$` 触发 skill popover。
  - 支持正文任意位置插入 skill pill。
  - 支持 skill pill 点击打开完整内容 Dialog。
  - 修复 skill Dialog 滚动条溢出和底部显示不全。
- `packages/app/src/components/prompt-input/slash-popover.tsx`
  - 扩展 popover 支持 skill 列表模式。
  - `/` 列表过滤掉 skill，skill 改由 `$` 独立触发。
- `packages/app/src/components/prompt-input/editor-dom.ts`
  - contenteditable 渲染/解析支持 skill pill。
- `packages/app/src/components/prompt-input/history.ts`
  - prompt history 支持保存和恢复 skill part。
- `packages/app/src/components/prompt-input/submit.ts`
  - 提交时保留 skill part，交给 request builder 处理。
- `packages/app/src/components/prompt-input/build-request-parts.ts`
  - `SkillPart` 转 synthetic text part。
  - 同名 skill 请求去重。
  - metadata 保存 `opencodeSkill.name`、`description`、`content`、`source`、`sources`。
- `packages/app/src/components/prompt-input/build-request-parts.test.ts`
  - 覆盖 `$skill` synthetic part。
  - 覆盖重复 `$planner` 只生成一个 synthetic skill 内容。
- `packages/app/src/utils/prompt.ts`
  - 从 message parts 的 skill metadata 恢复 prompt。
  - 支持 undo/history 恢复 `$skill` pill。

### App 与 UI 数据通道

- `packages/app/src/pages/directory-layout.tsx`
  - 注入 `openPath` 到 UI `DataProvider`。
  - Windows desktop 下优先使用 `code` 打开文件。
- `packages/ui/src/context/data.tsx`
  - `DataProvider` 增加 `openPath?: (path: string) => Promise<void> | void`。

### 消息展示与本地文件打开

- `packages/ui/src/components/message-part.tsx`
  - 用户消息高亮 `$skill`。
  - 用户消息下方显示去重后的 skill chip。
  - 点击 skill chip 弹出完整内容 Dialog。
  - edit/write/read/apply_patch 工具卡片中的文件名可点击打开。
  - apply_patch diff 文件名可点击打开，右侧三角仍保持展开/收起逻辑。
  - 收集 text、reasoning、file part、tool input、tool metadata 中真实路径作为本地文件别名来源。
- `packages/ui/src/components/message-part.css`
  - 增加 skill chip 和可点击文件名样式。
- `packages/ui/src/components/markdown.tsx`
  - Markdown 渲染后识别本地绝对路径和可解析别名。
  - 只有能解析到真实路径时才把裸文件名变成可点击链接。
  - 避免把裸文件名硬拼到 workspace 一级目录。
- `packages/ui/src/components/markdown.css`
  - 增加本地文件链接样式。
- `packages/ui/src/components/dialog.css`
  - `dialog-body` 增加 `min-height: 0`，让内部滚动区域正确收缩。

### 文档

- `AI_HELP_MD/CODEX_OPENCODE_WINDOWS_CLIENT_CHANGELOG.md`
  - 新增长期变更记录，用于后续线程追溯。
- `AI_HELP_MD/CODEX_OPENCODE_DESKTOP_ARCHITECTURE.html`
  - 早前按用户要求生成的动态架构讲解页面。
- `AI_HELP_MD/CODEX_OPENCODE_DESKTOP_ARCHITECTURE.md`
  - 架构讲解页面的文字版记录。

## 已验证

已通过：

- `packages/app`: `bun test src/components/prompt-input/build-request-parts.test.ts`
- `packages/app`: `bun run test:unit`
- `packages/ui`: `bun run typecheck`
- `packages/ui`: `bun run test`
- `git diff --check`

已知环境问题：

- `packages/app` 完整 `bun run typecheck` 在 Windows checkout 下会被官方 symlink 文件 `packages/app/src/custom-elements.d.ts` 阻塞；该文件在 `core.symlinks=false` 时是文本占位，不是本轮改造引入的问题。
- `bun.lock` 可能显示 dirty，但当前没有实际内容 diff，提交时不纳入。

## 后续接续建议

新线程继续时优先读：

1. `AI_HELP_MD/CODEX_OPENCODE_WINDOWS_CLIENT_CHANGELOG.md`
2. 当前 `git status --short --branch`
3. 本文件仅作为历史补充

建议验证点：

- `$` 在空输入和正文任意位置都能弹出 skill 列表。
- 同一消息多次引用同名 skill，发送后 UI 只有一个完整内容 chip，模型请求只注入一次完整 skill。
- undo/history 恢复后 skill pill 仍可点击查看完整内容。
- assistant 回复里的真实本地路径可点击打开，裸文件名只有能从别名反查到真实路径时才可点击。
