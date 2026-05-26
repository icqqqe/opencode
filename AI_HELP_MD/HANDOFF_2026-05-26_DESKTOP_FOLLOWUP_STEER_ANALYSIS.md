# OpenCode 桌面端中途引导对话机制调研交接

日期：2026-05-26

## 背景

用户希望 OpenCode 具备类似 Codex 的“中途引导对话”能力：当 agent 正在思考、读文件、跑工具或已经明显走偏时，用户可以直接发送一条纠偏消息，例如“方向错了，先查 X”，运行中的任务应尽快接收这条新指令，而不是只能排队到当前任务完全结束后再作为普通下一轮处理。

本次只做代码阅读和实现难度评估，没有修改功能代码。

## 初步结论

结论：可做，但需要补齐运行时调度语义。

- 做一个可用 MVP：中等难度。
- 做到接近 Codex 的“随时纠偏、必要时打断并重跑”：中等偏高。
- 真正把用户新输入塞进已经发出的同一次 LLM API 请求：不可行。

原因是一次 LLM 请求发出后，provider 侧 prompt 已经固定。所谓“中途引导”只能由 OpenCode 外层 runtime 实现：先把新用户消息写入会话，再在合适的边界让当前 loop 重新读取消息，或者主动 abort 当前请求/工具链后重新启动 loop。

当前 OpenCode 已经有一部分基础：

- 前端已有 `followup` / `steer` / `queue` 的概念。
- 忙碌时非空输入仍可以提交，不只是 stop。
- 后端 `runLoop` 已经有“检测 lastFinished 之后的新 user message 并包成 system-reminder”的逻辑。

但目前体验不完整：如果当前 assistant 一次模型调用直接 `stop` 结束，运行中插入的新 user message 可能只被写入会话，却不会自动触发下一轮回复。

## 关键概念

### Queue

排队模式：用户在 busy 时发送的 follow-up 先存到前端队列，等 session idle 后再自动发送。

### Steer

引导模式：用户在 busy 时发送的 follow-up 应立即写入当前 session，尽量让正在运行的 loop 在下一个安全边界读取这条消息。

### Interrupt / Restart

更强的引导模式：用户发送纠偏后，主动中断当前 LLM/tool run，再基于最新上下文启动新 loop。

这个模式体验最好，但风险也最大，因为可能打断 shell、工具调用、权限等待、半截 assistant message 和已有副作用。

## 当前前端链路

### 设置项

文件：`packages/app/src/context/settings.tsx`

关键点：

- `Settings.general.followup` 类型上支持 `"queue" | "steer"`。
- 默认值是 `"steer"`。
- 当前代码会把旧的 `"queue"` 自动迁移成 `"steer"`，并且 setter 也会把 `"queue"` 写成 `"steer"`。

关键位置：

- `packages/app/src/context/settings.tsx:25`
- `packages/app/src/context/settings.tsx:110`
- `packages/app/src/context/settings.tsx:166`
- `packages/app/src/context/settings.tsx:184`
- `packages/app/src/context/settings.tsx:188`

这说明 UI 文案里还保留“排队/引导”，但当前实际行为更偏向强制 steer。

### 输入框行为

文件：`packages/app/src/components/prompt-input.tsx`

关键点：

- `working() && blank()` 时，提交按钮显示 stop。
- `working() && 非空输入` 时，按钮仍是 send。
- 因此 busy 中发送纠偏消息在 UI 上是允许的。

关键位置：

- `packages/app/src/components/prompt-input.tsx:306`
- `packages/app/src/components/prompt-input.tsx:1666`

### 提交流程

文件：`packages/app/src/components/prompt-input/submit.ts`

关键点：

- `sendFollowupDraft()` 会构造 optimistic user message，并调用 `client.session.promptAsync(...)`。
- 如果 `shouldQueue()` 返回 true，则走 `onQueue(draft)`，不立即发。
- 但 `queueEnabled` 依赖 `settings.general.followup() === "queue"`，而 settings 当前会把 queue 映射成 steer，所以默认不会走 queue。
- 因此 busy 中非空输入通常会直接走 `promptAsync`，也就是“尝试 steer”。

关键位置：

- `packages/app/src/components/prompt-input/submit.ts:53`
- `packages/app/src/components/prompt-input/submit.ts:155`
- `packages/app/src/components/prompt-input/submit.ts:427`
- `packages/app/src/components/prompt-input/submit.ts:557`

### Follow-up 队列

文件：`packages/app/src/pages/session.tsx`

关键点：

- `followup.items` 使用前端持久化存储。
- `queueEnabled()` 只有在设置为 queue、session busy、不是 child session、composer 未 blocked 时才为 true。
- 队列发送逻辑会等 `busy(sessionID)` 为 false 后自动 `sendFollowup(...)`。

关键位置：

- `packages/app/src/pages/session.tsx:388`
- `packages/app/src/pages/session.tsx:1417`
- `packages/app/src/pages/session.tsx:1577`
- `packages/app/src/pages/session.tsx:1673`

由于 settings 当前强制 queue -> steer，这条队列链路更多像历史遗留或备用逻辑。

## 当前服务端链路

### HTTP API

文件：`packages/opencode/src/server/routes/instance/httpapi/handlers/session.ts`

`promptAsync` 的行为是 fork 一个后台任务：

```ts
yield* promptSvc.prompt({ ...ctx.payload, sessionID: ctx.params.sessionID }).pipe(
  Effect.catchCause(...),
  Effect.forkIn(scope, { startImmediately: true }),
)
```

关键位置：

- `packages/opencode/src/server/routes/instance/httpapi/handlers/session.ts:302`

这意味着前端发送 steer 后，请求本身很快返回，真正的 prompt 处理在服务端后台 fiber 内执行。

### Prompt 创建

文件：`packages/opencode/src/session/prompt.ts`

`SessionPrompt.prompt()` 的顺序：

1. 读取 session。
2. `revert.cleanup(session)`。
3. `createUserMessage(input)` 写入用户消息和 parts。
4. 如果 `noReply === true`，直接返回 user message。
5. 否则调用 `loop({ sessionID })`。

关键位置：

- `packages/opencode/src/session/prompt.ts:1215`
- `packages/opencode/src/session/prompt.ts:1220`
- `packages/opencode/src/session/prompt.ts:1233`

因此 busy 中 steer 消息至少会先写入会话。

### Runner 行为

文件：`packages/opencode/src/effect/runner.ts`

当前 `ensureRunning(work)` 的核心行为：

- Idle：启动 work。
- Running：不启动新 work，只等待当前 run 的 done。
- Shell：可以挂一个 `ShellThenRun`。
- ShellThenRun：等待已有 pending run。

关键位置：

- `packages/opencode/src/effect/runner.ts:115`

对应测试里也明确写了“second ensureRunning ignores new work if already running”，这说明当前语义是有意设计的。

影响：

如果 steer 消息在 session 正在 Running 时进入，`prompt()` 创建了 user message，但随后 `loop()` 调用 `ensureRunning` 时不会启动新的 loop，只会等待当前 loop 完成。

### SessionRunState

文件：`packages/opencode/src/session/run-state.ts`

`SessionPrompt.loop()` 最终调用：

```ts
state.ensureRunning(input.sessionID, lastAssistant(input.sessionID), runLoop(input.sessionID))
```

关键位置：

- `packages/opencode/src/session/run-state.ts:87`
- `packages/opencode/src/session/run-state.ts:92`
- `packages/opencode/src/session/prompt.ts:1503`

`cancel(sessionID)` 可以中断当前 runner 和相关 background jobs。

### Run loop

文件：`packages/opencode/src/session/prompt.ts`

每一轮 `runLoop` 会重新读取消息：

```ts
let msgs = yield* MessageV2.filterCompactedEffect(sessionID)
const { user: lastUser, assistant: lastAssistant, finished: lastFinished, tasks } = MessageV2.latest(msgs)
```

关键位置：

- `packages/opencode/src/session/prompt.ts:1254`
- `packages/opencode/src/session/message-v2.ts:1078`

`MessageV2.latest()` 通过最大 message id 找出最新 user、assistant、finished assistant 和未处理 task。

### 已存在的中途消息处理逻辑

文件：`packages/opencode/src/session/prompt.ts`

在 `step > 1 && lastFinished` 时，代码会把 `lastFinished.id` 之后的新 user text part 包成 system-reminder：

```ts
if (step > 1 && lastFinished) {
  for (const m of msgs) {
    if (m.info.role !== "user" || m.info.id <= lastFinished.id) continue
    for (const p of m.parts) {
      if (p.type !== "text" || p.ignored || p.synthetic) continue
      if (!p.text.trim()) continue
      p.text = [
        "<system-reminder>",
        "The user sent the following message:",
        p.text,
        "",
        "Please address this message and continue with your tasks.",
        "</system-reminder>",
      ].join("\n")
    }
  }
}
```

关键位置：

- `packages/opencode/src/session/prompt.ts:1415`

这段代码非常关键，说明后端已经部分支持“运行中新用户消息作为引导进入下一次模型调用”。

## 当前问题点

### 问题 1：一次性 stop 的 assistant 可能吞掉 steer

典型场景：

1. 用户 A 发起任务。
2. assistant 正在一次 LLM streaming 中。
3. 用户 B 在 busy 时发送纠偏。
4. `promptAsync(B)` 创建 user message B。
5. `promptAsync(B)` 调用 `loop()`，但 Runner 正在 Running，所以只等待 A 的 run。
6. A 的模型调用返回 `stop`。
7. `runLoop` 看到 result stop，直接 break。
8. Runner idle。
9. B 没有 assistant child，也没有自动启动下一轮。

结果：B 写入了会话，但没有被真正处理，用户感觉“我中途说了但没有引导成功”。

### 问题 2：只有多 step/tool loop 时 steer 才更可能生效

如果当前 assistant 返回 tool-calls，或者 loop 因任务继续执行进入下一 step，`runLoop` 会重新读取 `msgs`，此时 B 可能被 `MessageV2.latest()` 看到，并通过 system-reminder 进入下一次模型调用。

因此当前 steer 不是完全没有效果，而是不稳定，依赖当前 loop 是否还有下一步。

### 问题 3：interrupt 语义尚未定义

当前有 `abort`：

- 前端 blank + working 时是 stop。
- 后端 `SessionPrompt.cancel()` 调 `SessionRunState.cancel()`。

但还没有“写入一条 steer message 后自动 cancel 并重启”的专门语义。直接复用 abort 要处理半截 assistant、工具副作用、shell 中断、权限请求和 background job 清理。

## 推荐实现路径

### 方案 A：MVP，补齐 post-run continuation

目标：busy 中发送 steer 后，如果当前 run 没来得及处理这条 user message，则当前 run 结束后自动补跑一轮。

推荐优先做这个，风险最低。

核心思路：

1. `prompt()` 创建 user message 后记住 `message.id`。
2. 调用 `loop()`。
3. `loop()` 返回后检查该 user message 是否已经被处理。
4. 如果未处理，并且 session 当前 idle，则再次调用 `loop()`。

可选判定方式：

- 检查是否存在 `assistant.parentID === userMessage.id`。
- 或检查最新 finished assistant 是否在该 user message 之后。
- 或封装 `hasUnprocessedUserMessage(sessionID, messageID)`，避免散落判断。

优点：

- 不改 Runner 现有语义。
- 不影响 `ensureRunning` 现有测试。
- 不会中断正在进行的 LLM/tool。
- 能修复“steer 写入但当前 run stop 后没人处理”的核心问题。

不足：

- 不能立即打断当前模型请求。
- 如果当前 run 很长，用户仍要等到当前请求或工具边界结束。

### 方案 B：Runner 支持 RunningThenRun / dirty rerun

目标：当 Running 中又收到 `ensureRunning(work)`，不要只是 await 当前 run，而是记录“当前 run 结束后还要再跑一次”。

可能实现：

- 给 Runner 增加 `RunningThenRun` 状态。
- 或增加 dirty flag/pending handle。
- 或新增方法，不改变 `ensureRunning`：
  - `ensureRerunAfterCurrent(work)`
  - `queueRunAfterCurrent(work)`

优点：

- 语义更清晰，适合后续更多场景复用。

风险：

- 当前 Runner 测试明确要求 Running 中第二个 `ensureRunning` 忽略新 work。
- 直接改 `ensureRunning` 会破坏现有语义，影响范围大。
- 更推荐新增专门方法，而不是改旧方法。

### 方案 C：强 steer，写入后 cancel 当前 run 并重启

目标：用户纠偏后尽快停止当前方向，并以最新上下文重新请求模型。

流程可能是：

1. 前端 busy + 非空输入。
2. 调用新 endpoint，例如 `session.steer`。
3. 服务端创建 user message。
4. 如果 session busy，调用 `state.cancel(sessionID)`。
5. 等当前 interrupted assistant 标记完成。
6. 调用 `loop()` 重新启动。

优点：

- 体验最接近 Codex。
- 纠偏生效更快。

风险：

- LLM streaming 半截内容如何展示。
- 已经开始执行的 shell/tool 是否能安全停。
- 工具已有副作用时，模型后续必须知道“刚才被用户打断”。
- permission 请求、background job、subtask、compaction 中断都要测试。

建议在方案 A 稳定后再做。

## 建议开发顺序

1. 先实现方案 A：post-run continuation。
2. 补测试，确认 busy 中插入的 user message 最终一定有 assistant 回复。
3. 再考虑增加“立即打断”开关。
4. 最后再做 UI 层的明确反馈，例如“已发送引导，将在当前步骤后应用”。

## 测试建议

### 后端测试

建议在 `packages/opencode/test/session/prompt.test.ts` 或相邻测试中增加：

1. 当前 run 直接 stop 时，中途 `promptAsync` 追加 user message，旧 run 结束后应自动生成新 assistant。
2. 当前 run 有 tool-calls / 多 step 时，中途 user message 应进入 system-reminder，不重复生成额外 assistant。
3. 多条 steer 连续进入时，不丢消息，顺序合理。
4. steer message 带 file/image/agent part 时，不破坏 `createUserMessage` 现有解析。
5. cancel 后再 steer，assistant interrupted 状态和新 loop 都正确。

### Runner 测试

如果采用方案 A，不需要改 Runner 测试。

如果采用方案 B，需要新增测试而不是直接改旧语义：

- Running 中调用新方法会在当前 run 后再跑一次。
- 多个等待者共享同一个 pending rerun。
- cancel 时 pending rerun 被取消或按设计保留。

### 前端测试

建议补 `packages/app/src/components/prompt-input/submit.test.ts`：

1. busy + blank 提交触发 abort。
2. busy + nonblank 提交触发 `promptAsync`。
3. queue 设置如果未来恢复，不应和 steer 行为冲突。

## 关键风险

- 用户以为“立即引导”，但 MVP 只能在当前 LLM 请求结束后引导，需要 UI 文案降低误解。
- 打断工具调用可能造成副作用已经发生但模型不知道，需要明确写入 interrupted metadata。
- 如果用 system-reminder 改写原 user part，要避免重复改写或污染历史显示。
- 多条 steer 消息连续进入时，`MessageV2.latest()` 只选最新 user 作为 parent，但旧 user parts 仍可能被纳入 messages，需要验证模型能看到完整纠偏链。
- child session、subtask、compaction 状态下要小心，不一定应该允许强 interrupt。

## 当前推荐判断

优先做方案 A。

原因：

- 当前代码已经能在 busy 中写入 user message。
- 当前 `runLoop` 已经有 system-reminder 逻辑。
- 当前最大缺口是“已有 run stop 后，没有补跑处理 steer message”。
- 这个缺口可以在 `SessionPrompt.prompt()` 或相邻 helper 内补，不必先改 Runner。

一句话版本：

当前 OpenCode 已经有半套 steer 机制，但缺少“运行中新增用户消息未被当前 run 消费时，run 结束后自动继续处理”的保障。先补这个保障，就能得到一个稳定可用的中途引导 MVP。
