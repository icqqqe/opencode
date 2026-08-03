# OpenCode Windows Client Change Log

> 本文件用于长期追踪个人 Windows 桌面端二开分支中的重要修改。以后新线程继续开发时，优先阅读本文件最近条目，再结合相关 handoff 文档和当前 `git status` 判断工作区状态。

## 记录规范

- 每次较大改动追加一个条目，不覆盖旧记录。
- 每个条目至少包含：时间、背景、修改原则、涉及文件、具体改动、验证结果、已知问题、后续接续建议。
- 只记录事实和工程判断，不记录账号、token、私钥等敏感信息。
- 本文件只做追踪记录，不代表已经提交到 Git 或推送到 GitHub。

### 官方同步强制规则

本文件同时是唯一的官方同步与冲突解决台账。每次把官方 `dev` 合入 `work/windows-client-ui` 时必须：

1. 在 fetch 或 merge 前阅读本节、长期保护基线和最近一次同步记录。
2. 记录个人分支提交、官方提交、共同祖先和双方提交数量。
3. 逐个记录实际冲突文件；不得只写“保留 ours”或“采用 theirs”。
4. 对每个冲突说明官方改了什么、本地特性是什么、最终如何移植到官方新结构。
5. 记录没有产生 Git 冲突但为兼容新 API、新类型或文件迁移而修改的文件。
6. 每次都检查 VSCode F5 基线、依赖安装、受影响 package typecheck、桌面构建和 pre-push 结果。
7. 即使没有文本冲突，也要追加一条“无冲突”记录，并写明审查过的本地特性。
8. 本文件、仓库版 sync skill 和本次代码必须统一提交并推送到 `origin/work/windows-client-ui`。

### 长期保护基线

- `.vscode/launch.json`、`.vscode/tasks.json`、`.vscode/opencode.ps1` 提供的新电脑 F5 自举和正式版调试。
- 中国网络环境可用的 Electron 镜像与缺失二进制补装。
- Windows 桌面主进程、sidecar、系统代理和本地文件打开行为。
- prompt 中用 `$` 选择、插入、恢复和显示 skill 的完整链路。
- Markdown 与工具卡片中的可信本地文件路径解析和打开。
- `autodiscover_instructions` 等个人配置扩展。
- 本地模型快照回退、插件运行时桥接等个人分支提交。

保护本地特性不等于冻结旧代码。官方重构同一模块时，应把本地行为移植到官方最新的组件、类型和生命周期上。

## 2026-08-03 - 纠正双栈策略并恢复旧布局 Skill、Provider 和模型

### 背景与纠正结论

提交 `a15a8c7e39` 将同时暴露 V1/V2 健康接口的桌面 sidecar 整体判为 V2。重新启动后发现当前 sidecar 只实现了部分 V2 API，导致所有目录重载出现 `UnsupportedContentType`、`request.settings.temperature` 空引用、模型控件空白和设置页误显示“没有已连接的提供商”。用户当前主要使用旧布局，因此本次恢复双栈 sidecar 的 V1 主路径，同时保留真正纯 V2 服务的识别能力。

API Key 没有被删除：`C:\Users\Administrator\.local\share\opencode\auth.json` 最后修改时间仍为 `2026-05-26 20:51:45`，只读检查确认 provider ID 仍包含 `deepseek`、`google`，没有读取或输出 Key 内容。

### 运行时证据

- 主进程日志明确记录 sidecar `version: 'v1'`。
- 当前 sidecar 的 `/api/health` 与 `/global/health` 都返回 200，但 V2 `/api/model/default` 返回 `200 text/html` 的 renderer 页面；vendored V2 client 期待 JSON，因此抛出 `UnsupportedContentType`。
- V2 `/api/agent` 的 `request` 只有 `headers/body`，而旧 client adapter 仍读取 `request.settings.temperature`，因此产生空引用。
- V2 `/api/provider` 只返回 1 个 provider；V1 `/provider` 返回完整 catalog，已连接项包含 `google`、`deepseek`、`opencode`。
- 重启后的同一 sidecar 上，`ts_workspace`、`xls_config`、`opencode_chat` 三个目录的 V1 `/agent`、`/skill`、`/provider` 均返回 200；其中 `ts_workspace` 返回 7 个 Agent、24 个 Skill。

因此不在 Agent/Model normalize 层伪造缺失字段，也不为不存在的 V2 路由打补丁；根修复是避免把部分 V2 的双栈 sidecar 整体切到 V2。

### Changelist（3 个文件）

- `packages/app/src/utils/server-protocol.ts`
  - legacy 健康接口可用时立即选择 V1，恢复旧布局完整的 Skill、Agent、Provider、模型与原凭据读取链。
  - legacy 不可用时，保留历史 `pid` V2 识别，并用 `/api/location` 返回 shape 区分正式纯 V2 与过渡 V1。
  - 两个健康接口都不可用时保持原有默认 V2 行为。
- `packages/app/src/utils/server-protocol.test.ts`
  - 覆盖双栈优先 V1、历史含 `pid` 的 V2、正式纯 V2 location 能力、过渡 V1 和双健康端点缺失。
- `AI_HELP_MD/CODEX_OPENCODE_WINDOWS_CLIENT_CHANGELOG.md`
  - 记录上一策略的回归、凭据仍在的证据、V1/V2 现场响应差异和本次纠正文件清单。

公司工程目录只做只读 API/文件存在性检查，没有修改 `E:\workspace\game\ts_workspace` 或 `E:\workspace\game\xls_config` 的任何文件。

### 验证结果

- `packages/app`: 协议检测定向测试 `5 passed, 0 failed`。
- `packages/desktop`: Node `24.11.1` 下 `bun run build` 完整通过，main、preload、renderer 均成功生成。
- 当前 sidecar 实机只读验证：三个目录 V1 Agent/Skill/Provider 均为 200；`ts_workspace` 为 7 Agent、24 Skill，完整 Provider catalog 的 connected 包含 `google`、`deepseek`、`opencode`。
- 仓库根目录：`git diff --check` 通过，仅有 Windows LF/CRLF 提示。
- 正式 `bun typecheck` 仍受仓库既有的 Windows Git symlink checkout 问题影响；本次没有修改或提交该 symlink 文件。

## 2026-08-03 - 修复双栈协议误判导致目录 Skill 和模型缺失

### 背景与现场结论

同步官方 `dev` 后，`E:\workspace\game\ts_workspace` 根目录中的旧布局出现 `$` 无 Skill、Agent/Provider 加载 499、模型列表不显示已绑定 DeepSeek；同一桌面端中的 OpenCode 仓库和 `xls_config` 正常。

只读排查确认公司工程配置没有损坏：

- `ts_workspace\.opencode\skills` 是有效 Junction，目标为 `ai_custom\CODEX\.codex_skill_build`。
- 23 个磁盘 Skill 的 `SKILL.md` 均可读并能解析 frontmatter；加上内置 Skill，V2 接口返回 24 个。
- `ai_custom\OPENCODE\AGENTS.md`、`ai_custom\CODEX\AGENTS.md` 和根 `opencode.json` 均存在且可读。
- 同一 sidecar 的 V2 `/api/agent`、`/api/skill`、`/api/provider` 正常返回 7、24、1 项；DeepSeek 凭据仍处于 connected 状态。
- 出错的是被客户端选中的旧 V1 `/agent`、`/skill`、`/provider` 请求链，三个接口在该精确根目录均返回 499 空体。

根因是官方新增的双服务器兼容检测与当前 V2 健康契约不一致：当前 sidecar 同时暴露 `/api/health` 与 `/global/health`，但原检测优先把 legacy 健康响应判成 V1；同时又要求真实 V2 契约中不存在的 `pid` 字段。于是客户端整体选择旧 API，目录 Skill、Agent 和 Provider store 都没有加载，旧布局只能显示免费模型列表。

### Changelist（3 个文件）

- `packages/app/src/utils/server-protocol.ts`
  - 并行探测 V2 与 legacy 健康接口；双栈响应明确优先 V2，只有 legacy 可用时选择 V1。
  - 保留历史含 `pid` 的 V2 识别。
  - 对只有 `{ healthy: true }` 的单健康接口增加 V2 专属 `/api/location` shape 探测，避免破坏历史过渡 V1 服务器兼容。
  - 两个健康接口都不可用时保持原有默认 V2 行为。
- `packages/app/src/utils/server-protocol.test.ts`
  - 覆盖当前双栈、纯 V2、历史含 `pid` 的 V2、传统 V1、过渡 V1、V2 健康网络失败和双端点缺失共 7 种协议矩阵。
- `AI_HELP_MD/CODEX_OPENCODE_WINDOWS_CLIENT_CHANGELOG.md`
  - 记录本次目录排查证据、协议取舍、文件级 changelist 和验证结果。

公司工程目录只做了只读检查，本次没有修改 `E:\workspace\game\ts_workspace` 或 `E:\workspace\game\xls_config` 中的任何文件。

### 验证结果

- `packages/app`: 协议检测定向测试 `7 passed, 0 failed`。
- `packages/desktop`: Node `24.11.1` 下 `bun run build` 完整通过，main、preload 和 renderer 均成功生成。
- 仓库根目录：`git diff --check` 通过，仅有 Windows LF/CRLF 提示。
- `packages/app`: `bun typecheck` 已使用 Node `24.11.1` 执行，但被仓库既有的 Windows symlink checkout 问题阻断：Git mode `120000` 的 `src/custom-elements.d.ts` 在当前工作树中是只含目标路径的一行普通文本。本次没有修改或提交该文件，桌面完整构建已通过。

## 2026-08-03 - 同步官方 dev 并迁移 Windows/Skill 能力到 V2

### 背景

用户已在 GitHub 网页把个人仓库的 `dev` 同步到官方最新状态，随后要求把该官方状态合入 `work/windows-client-ui`，保留个人 Windows 桌面端和 `$ skill` 修改，同时接入官方的新功能。本次先将本地工作分支快进到 `origin/work/windows-client-ui`，再以 `origin/dev` 为官方来源执行真实双父 merge。

### 同步范围

| 项目 | 提交 |
| --- | --- |
| 个人分支同步前 | `7f46211fb57631c559218a7c87dc2b70caed6469` |
| 官方 `origin/dev` | `1882c33827cf0ce5c948b69ab5a87ed8f6790cf8` |
| 官方 `upstream/dev` | `1882c33827cf0ce5c948b69ab5a87ed8f6790cf8` |
| 共同祖先 | `fab213312927ea64cf968832c527206e8c944f9e` |
| 合并提交 | `99faaf3a4768c67aa170bb1247200749be92157e` |

- 共同祖先之后个人分支有 `37` 个提交，官方侧有 `222` 个提交。
- `origin/dev` 与 `upstream/dev` 完全一致，因此采用用户已在网页同步好的 `origin/dev` 不会遗漏官方提交。
- 使用 `git merge --no-ff --no-commit origin/dev`，最终提交有两个父节点，未压平或伪造官方历史。
- 合并提交相对第一父节点共变更 `412` 个文件，`22749` 行新增、`7568` 行删除；完整文件级 changelist 以 `git show --name-status 99faaf3a4768c67aa170bb1247200749be92157e` 为准。

### 实际 Git 冲突

| 冲突文件 | 官方变化 | 本地特性 | 最终解决 |
| --- | --- | --- | --- |
| `packages/app/src/components/prompt-input.tsx` | 官方继续重构 legacy composer，命令和 skill 数据改为 location-scoped 独立来源，并采用新的 `DockShellForm` 骨架 | `$` skill popover、pill、高亮、详情 Dialog、请求注入与恢复链路 | 以官方最新 composer 骨架为准；命令读取 `data.command`，skill 独立读取 `data.skill`；把 `$` 触发、skill pill、Dialog 和 `location` 传递迁移到新结构 |

本次只有上述一个文本冲突。解决后 `git ls-files -u` 为空，标准冲突标记扫描无命中。

### 人工兼容 Changelist（29 个文件）

#### Windows F5 自举（1）

- `.vscode/opencode.ps1`
  - 官方升级到 Vite 7 后，增加 Node engine 检测：接受 `^20.19.0` 或 `>=22.12.0`。
  - 在当前 Node、NVM 安装目录、NVM symlink、LocalAppData 和 Program Files 中寻找兼容 Node；缺失时用 WinGet 安装 LTS。
  - 构建阶段追加 `--max-old-space-size=8192`，避免 renderer sourcemap 构建超过默认 4 GB heap。

#### V1/V2 Skill 数据源和输入入口（10）

- `packages/app/src/components/prompt-input.tsx`
- `packages/app/src/components/prompt-input-v2.tsx`
- `packages/app/src/components/prompt-input/slash-popover.tsx`
- `packages/app/src/context/prompt-state.ts`
- `packages/app/src/context/global-sync/bootstrap.ts`
- `packages/app/src/context/global-sync/bootstrap.test.ts`
- `packages/app/src/context/global-sync/child-store.ts`
- `packages/app/src/context/global-sync/event-reducer.test.ts`
- `packages/app/src/context/global-sync/types.ts`
- `packages/app/src/context/server-sync.tsx`

具体处理：V2 调用 location-scoped `api.skill.list(...)`，V1 调用 `legacy.app.skills(...)`；V1 slash command 过滤旧 `source === skill` 项；`skill.updated` 同步刷新 command/skill；缺失 skill id 时回退到 name；`SkillPart.location` 保持可选以兼容旧草稿和 history。

#### 请求构造、持久化和历史恢复（10）

- `packages/app/src/components/prompt-input/build-request-parts.ts`
- `packages/app/src/components/prompt-input/build-request-parts.test.ts`
- `packages/app/src/components/prompt-input/submit.ts`
- `packages/app/src/components/prompt-input/submit.test.ts`
- `packages/app/src/components/prompt-input/history.ts`
- `packages/app/src/components/prompt-input/history.test.ts`
- `packages/app/src/utils/prompt.ts`
- `packages/app/src/utils/prompt.test.ts`
- `packages/app/src/utils/session-message.ts`
- `packages/app/src/utils/session-message.test.ts`

具体处理：

- 同一个 skill 重复引用时只向模型注入一次完整正文，但保留全部引用位置。
- metadata 记录 skill `location` 和原始 prompt text parts；消息投影、reload、edit、undo 能还原全部 `$skill` 引用，不把 synthetic 展开正文重复显示给用户。
- skill base directory 支持 Windows 路径、`/`、盘符根目录和 `<built-in>`；相对脚本/引用路径仍以 skill 目录为基准。
- prompt history 比较纳入 `location`，避免不同目录下同名 skill 被错误去重。
- 按官方新 `JsonValue` 合同递归归一化持久化 metadata，并剔除 `undefined`；未用 `any` 或类型断言绕过检查。
- `submit.test.ts` 保留真实 `server-sync` 导出再覆盖测试 hook，避免 Bun 全局 mock 污染官方 bootstrap 测试。

#### 官方 V2 Session UI Skill composer（8）

- `packages/session-ui/src/v2/components/prompt-input/types.ts`
- `packages/session-ui/src/v2/components/prompt-input/store.ts`
- `packages/session-ui/src/v2/components/prompt-input/store.test.ts`
- `packages/session-ui/src/v2/components/prompt-input/machine.ts`
- `packages/session-ui/src/v2/components/prompt-input/machine.test.ts`
- `packages/session-ui/src/v2/components/prompt-input/interaction.ts`
- `packages/session-ui/src/v2/components/prompt-input/index.tsx`
- `packages/session-ui/src/components/markdown-local-file-link.test.ts`

以上共 7 个 V2 composer 文件加 1 个 Markdown 测试文件。V2 新会话和现有会话均支持 `$` suggestion、结构化 mention、键盘选择、DOM 往返、skill pill 点击详情和 `$ for skills` placeholder；shell 模式的 `echo $PATH` 不会误触发 skill。Markdown 测试显式模拟 Vite worker URL，并在 Solid/Happy DOM 条件下验证本地文件链接。

### 自动合并后做过语义复核的重点文件

- `packages/app/src/components/prompt-input/build-request-parts.ts`
- `packages/app/src/components/prompt-input/submit.ts`
- `packages/app/src/pages/directory-layout.tsx`
- `packages/desktop/src/main/index.ts`
- `packages/session-ui/src/components/message-part.css`
- `packages/session-ui/src/components/message-part.tsx`
- `packages/session-ui/src/context/data.tsx`

复核结论：Windows V1/V2 sidecar 和系统代理初始化顺序保留；本地文件/HTTP 外链仍分别走可信本地打开和官方外链安全通道；Skill metadata、用户短文本和官方 V2 message 投影契约兼容。

### 官方新增、迁移和删除

- 官方 workspace 版本从 `1.18.3` 升到 `1.18.11`，引入 location-scoped V2 client、V1 compatibility 层、新 home/session controller 拆分、background CLI、外链安全处理、窗口全屏同步、新 toast 实现及多组回归测试。
- 官方删除 5 个旧文件，未恢复：
  - `packages/app/src/components/link.tsx`（改由 `external-link.tsx` 和 platform 外链流程承担）。
  - `packages/app/src/components/session/session-new-design-view.tsx`（迁移到 `pages/new-session/*`）。
  - `packages/app/src/utils/notification-click.ts` 与对应测试（并入 notification/platform/entry 流程）。
  - `packages/desktop/src/main/markdown.ts`（旧 parseMarkdown IPC 移除）。
- 保留官方生成和 vendored 结果：`packages/app/vendor/opencode-ai-client-1.17.13-v2.tgz`、`packages/sdk/js/src/v2/gen/types.gen.ts`、`packages/sdk/openapi.json`、Console migration/snapshot。
- 本地兼容代码没有修改公共 Protocol/Server `HttpApi`，因此没有额外手改或重新生成 SDK。
- 保留官方依赖与 patch 更新，包括 Mistral、dnd-kit、MCP SDK 和 Solid patch。官方 Mistral patch 自身包含有意义的尾随空格，整批 `git diff --cached --check` 只报告这些 patch payload 行，未擅自清理以免改变补丁语义；人工源码 `git diff --check` 通过。

### 依赖、F5 和构建验证

- Bun：`1.3.14`。
- 首次 F5 准备安装了官方新增依赖；后续 `bun install` 显示无变化，`bun.lock` 没有本地二次漂移。
- 早期验证暴露两个环境问题：默认 Node 18.16 下 Vite 7 缺少 `crypto.hash`；默认 4 GB heap 在 renderer sourcemap 构建时 OOM。
- 自举脚本首次寻找兼容 Node 时通过 WinGet 安装了 OpenJS Node LTS `24.18.1`；修正 NVM 非当前版本探测后，最终构建选择已有 NVM Node `24.11.1`。该选择只修改脚本进程 PATH，不切换用户全局 NVM 当前版本。
- F5 对应命令 `powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\.vscode\opencode.ps1 PrepareProdDebug` 最终退出码 `0`。
- 正式版 sourcemap 构建通过：main `25.43s`、preload `17ms`、renderer `17.59s`；仅保留官方已有的 eval、dynamic chunk 和 preload script 警告。

### 测试与类型检查

- App 定向回归：`57 passed, 0 failed`。
- Session UI 定向回归：`26 passed, 0 failed`。
- Desktop Electron Builder 与 external URL：`11 passed, 0 failed`。
- `packages/app`: `bun typecheck` 通过。
- `packages/session-ui`: `bun typecheck` 通过。
- `packages/desktop`: `bun typecheck` 通过。
- 全仓 `bun typecheck`: `30 successful, 30 total`。
- Windows 默认 checkout 会把 App/Enterprise 的 `custom-elements.d.ts` Git symlink 展开成一行目标路径；全仓检查时临时展开为真实声明文件，检查后精确恢复，未进入提交。

### Skill 双份同步与工作区保护

- 仓库版和安装版 `opencode-upstream-sync/SKILL.md` SHA256 均为 `1828879EDB762DFFCBD3B700D06AB775E4D41A6128606E8C7BCE04941BFE13B4`。
- 仓库版和安装版 `agents/openai.yaml` SHA256 均为 `28D4D13E327ED51FDABA5F14B9FEC66B2DC8C70A178E833E1C28E531FF2F88A9`。
- 同步前工作树干净，stash 为空；没有混入用户未提交改动。

### 提交与推送

- 主 merge commit：`99faaf3a4768c67aa170bb1247200749be92157e`，提交说明 `chore: 同步官方 dev 到 Windows 客户端分支`。
- 本条记录使用独立 `docs: 记录 2026-08-03 官方同步` 提交，避免 changelog 自引用提交 hash。
- 两个提交统一推送到 `origin/work/windows-client-ui`。

## 2026-07-18 - 官方 dev 合并记录与跨电脑 F5 自举

### 背景

个人 `work/windows-client-ui` 分支已合并官方 `dev` 到 `fab213312`。用户要求完整保留本地 Windows/UI 特性、长期记录冲突取舍，并保证其他 Windows 电脑从 GitHub 拉取后可在 VSCode 直接按 F5 运行。

### 同步范围

| 项目 | 提交 |
| --- | --- |
| 个人分支同步前 | `a831b080c331681147a0a7aaf7ae1e33dc016884` |
| 官方 `dev` | `fab213312927ea64cf968832c527206e8c944f9e` |
| 共同祖先 | `2fe68b5e91abda916cceebe27d9814c345dcb262` |
| 合并提交 | `9e0d2c4025956014aca54b3480a6815d2a0924ae` |

- 官方侧从共同祖先到目标提交共 `429` 个提交。
- 个人分支侧从共同祖先到同步前提交共 `35` 个提交。
- `origin/dev` 与 `upstream/dev` 均指向 `fab213312`，所以本次官方内容一致。
- 合并方式为 `git merge --no-ff upstream/dev`，保留双方历史。
- 合并提交已经推送到 `origin/work/windows-client-ui`。

### 实际冲突与解决

| 冲突文件 | 官方变化 | 本地特性 | 最终解决 |
| --- | --- | --- | --- |
| `packages/app/src/components/prompt-input.tsx` | 引入新版 composer、project picker、model/agent controls、附件布局和新旧布局分流 | `$` skill popover、skill pill、高亮、详情 Dialog 和请求链路 | 以官方新版 composer 结构为骨架，把 skill 触发、渲染和 Dialog 行为移植到新旧两套布局中，同时保留官方 project/model/agent 控件 |
| `packages/app/src/components/prompt-input/slash-popover.tsx` | 调整 slash command 菜单属性和渲染结构 | 同一个 popover 还承载独立的 skill 列表模式 | 合并两组 props 和分支渲染，`/` 继续显示命令，`$` 独立显示 skill |
| `packages/app/src/components/prompt-input/transient-state.ts` | 新增官方 slash menu 瞬态状态 | 本地 skill popover 瞬态状态 | 同时保留两套状态，并增加统一的 `variantOpen` 判断供新版输入框使用 |
| `packages/app/src/context/prompt.tsx` | Prompt context 改为从新的 state 模块导出类型 | 本地 `SkillPart` 类型 | 保留官方 re-export 结构，并公开 `SkillPart` |
| `packages/core/src/instruction-context.ts` | 接入新的 `fs.resolve` 和官方 Context 读取方式 | 配置驱动的 instruction context 扩展 | 将本地配置支持移植到官方解析流程，并补齐 `Config.node` 依赖 |
| `packages/core/src/system-context/builtins.ts` | 官方建立新的 `builtIns` 分层 | 旧分支内有本地 context 注册逻辑 | 采用官方分层并去掉已经过时的重复块；本地配置能力保留在 `instruction-context.ts` |
| `packages/session-ui/src/components/markdown.tsx` | 更新 Markdown 生命周期和 dispose 行为 | 可信本地文件链接解析与点击打开 | 保留本地路径解析 helpers，并接入官方最新清理生命周期 |
| `packages/session-ui/src/components/message-part.tsx` | 更新 V2 action/comment 消息显示 | `$skill` metadata 解析、skill chip 和本地文件打开 | 在官方 V2 结构上保留 skill metadata 与文件交互，不回退官方 action/comment 更新 |

### 非冲突兼容修复

- `packages/app/src/context/prompt-state.ts`
  - 将 `SkillPart` 纳入新的 `ContentPart` 联合类型。
  - 为 clone 和 equality 补齐 skill 分支。
- `packages/app/src/components/prompt-input/contracts.ts`
  - 让新旧布局共用的 contracts 同时支持可选 `newLayoutDesigns`、`variant` 和 `toolbar`。
- `packages/session-ui/src/v2/components/prompt-input/types.ts`
  - 增加 V2 skill part，使新版 Prompt 类型能携带本地 `$skill`。
- `packages/session-ui/src/components/markdown-local-file-link.test.ts`
  - 官方重构后 Markdown 实现已移动到 `session-ui`，将原来位于 `packages/ui` 的本地路径测试一并迁移，修复全仓 pre-push typecheck 的无效导入。

### 同步验证结果

- 标准 Git 冲突标记扫描通过。
- `packages/app`: `bun run typecheck` 通过。
- `packages/core`: `bun run typecheck` 通过。
- `packages/session-ui`: `bun run typecheck` 通过。
- `packages/desktop`: `OPENCODE_CHANNEL=prod bun run build` 通过。
- pre-push 全仓 `bun turbo typecheck`: `30 successful, 30 total`。
- GitHub 分支 `origin/work/windows-client-ui` 已更新到 `9e0d2c402`。

### 同步后 F5 加固

- 新增 `.vscode/opencode.ps1`，集中处理 Bun 查找、缺失时通过 WinGet 安装、Electron 镜像、依赖安装、Electron 二进制补齐和桌面构建。
- `.vscode/tasks.json` 的所有桌面任务改为调用该脚本，避免不同 Task 进程之间丢失临时 PATH。
- F5 的 `PrepareProdDebug` 会在同一进程中依次完成依赖准备和 `prod` sourcemap 构建。
- `.gitignore` 明确允许提交所需 VSCode 配置和脚本，同时继续忽略个人 `.vscode/settings.json`。
- 这次 F5、文档和 skill 加固统一随本条记录所在维护提交推送到 `origin/work/windows-client-ui`。

### 验证结果

- F5 对应的 `PrepareProdDebug` 真实执行通过。
- Bun `1.3.14` 解析成功，`bun install` 无依赖变化。
- Electron launcher、主进程产物和 sourcemap 均已生成。
- 桌面 Electron/Vite 生产调试构建退出码为 `0`。
- 使用与 F5 相同的 Electron executable、工作目录、参数和 `OPENCODE_CHANNEL=prod` 做启动 smoke test，12 秒后主进程仍正常运行，共检测到 9 个本次启动的仓库相关进程。
- smoke test 结束时仅终止本次新启动的进程，随后确认仓库相关残留进程数为 `0`。

### 工作区保护

同步前发现的两处用户未提交改动保存在 `stash@{0}: codex-before-upstream-sync`，未混入合并提交或本次维护提交。后续恢复前应先查看 stash 内容并确认与当前官方代码是否仍兼容。

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
