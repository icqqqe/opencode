# 2026-05-26 Windows 桌面端系统代理修复 Handoff

## 背景

用户在中国大陆使用 OpenCode Windows 桌面端时，日志中出现网络请求超时和 `Transport error`，典型报错包括：

- `Transport error (GET https://www.google.com/search?q=...)`
- `AI_APICallError`
- `ConnectTimeoutError`
- `UND_ERR_CONNECT_TIMEOUT`
- 请求目标示例：`https://opencode.ai/zen/v1/chat/completions`

当时本机代理环境：

- Clash for Windows 开启 `System Proxy` 和 `TUN Mode`。
- WinINet 系统代理已启用：`ProxyEnable = 1`。
- WinINet `ProxyServer = 127.0.0.1:7890`。
- WinHTTP 显示 `Direct access (no proxy server)`。
- OpenCode 桌面端进程没有稳定继承 `HTTP_PROXY` / `HTTPS_PROXY` 环境变量。

结论：浏览器和部分 WinINet 程序能走系统代理，但 OpenCode sidecar 中的 Node/undici 网络请求仍可能直连，导致 Google、OpenCode Zen API 等请求在当前网络环境下超时。

## 目标

本次修复不是针对 Clash 写死逻辑，而是支持任意会写入 Windows 系统代理的软件，例如：

- Clash for Windows
- Clash Verge
- v2rayN
- sing-box GUI
- 企业代理客户端
- 其他设置 WinINet 系统代理的软件

期望行为：

- 系统代理开启时，OpenCode 桌面端自动把系统代理导入当前进程网络环境。
- 系统代理关闭时，OpenCode 不继续使用过期代理，回到直连。
- 不修改 Windows 全局代理设置，只读取当前系统代理。
- 不覆盖用户手动设置的 `HTTP_PROXY` / `HTTPS_PROXY`。
- 本地回环地址必须绕过代理，避免桌面 UI 访问本地 sidecar 时产生代理回环问题。

## 旧实现问题

修复前相关代码位于：

- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/sidecar.ts`

旧逻辑做了两件事：

- 手动把 `127.0.0.1`、`localhost`、`::1` 加入 `NO_PROXY`。
- 调用 Node 侧的 `http.setGlobalProxyFromEnv()`。

这个逻辑的问题是：

- `setGlobalProxyFromEnv()` 只消费环境变量，例如 `HTTP_PROXY`、`HTTPS_PROXY`、`NO_PROXY`。
- 它不会自动读取 Windows `Internet Settings` 注册表里的系统代理。
- Electron / utilityProcess 启动出来的 sidecar 不一定有代理环境变量。
- Node 24 的 `fetch` / undici 需要 `NODE_USE_ENV_PROXY=1` 或 `--use-env-proxy` 才会按环境变量走代理；只设置 env 但不启用该开关，仍可能直连。

## 新实现

新增文件：

- `packages/desktop/src/main/proxy.ts`

该模块统一处理桌面端代理初始化，暴露：

- `prepareProxyEnvironment()`
- `useEnvProxy(onError)`
- `parseWindowsProxyServer(value)`
- `windowsProxyOverrideToNoProxy(value)`

### 代理读取来源

Windows 下读取注册表：

- `HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings`
- `ProxyEnable`
- `ProxyServer`
- `ProxyOverride`

实现上使用 `reg query`，避免引入新依赖。

非 Windows 平台不读取注册表，只保留已有环境变量和 `NO_PROXY` 处理。

### 代理导入规则

当 `ProxyEnable = 1` 且 `ProxyServer` 存在时：

- `127.0.0.1:7890` 会转为 `http://127.0.0.1:7890`。
- 普通单代理格式会同时写入：
  - `HTTP_PROXY`
  - `http_proxy`
  - `HTTPS_PROXY`
  - `https_proxy`
- `http=...;https=...` 格式会分别映射到 HTTP 和 HTTPS。
- 只有 `socks=...` 的配置不导入，因为 Node 标准 `HTTP_PROXY` / `HTTPS_PROXY` 不能直接消费 SOCKS 代理；误导入会变成错误 HTTP 代理。

### 避免覆盖用户手动配置

新增内部标记：

- `OPENCODE_DESKTOP_MANAGED_PROXY_ENV`

用途：

- 记录哪些代理环境变量是 OpenCode 根据系统代理自动写入的。
- 如果用户启动 OpenCode 前已经手动设置了 `HTTP_PROXY` 或 `HTTPS_PROXY`，新逻辑不会覆盖它。
- 如果系统代理关闭，只清理 OpenCode 自己托管的代理环境变量，不删除用户手动设置的变量。

### 系统代理关闭时的行为

当 `ProxyEnable` 不是 `1`，或 `ProxyServer` 不存在时：

- 清理 `OPENCODE_DESKTOP_MANAGED_PROXY_ENV` 记录的变量。
- 不动用户手动设置的代理变量。
- 保持程序直连或继续使用用户显式配置的代理。

### NO_PROXY 处理

新逻辑会合并：

- 已存在的 `NO_PROXY`
- 已存在的 `no_proxy`
- Windows `ProxyOverride`
- 固定回环地址：
  - `127.0.0.1`
  - `localhost`
  - `::1`

输出同时写入：

- `NO_PROXY`
- `no_proxy`

这样主进程、sidecar、Node fetch、部分第三方库都能读到一致的绕过列表。

### Node fetch / undici 代理开关

当检测到代理环境变量存在时：

- 自动设置 `NODE_USE_ENV_PROXY=1`

原因：

- Node 24 的 fetch/undici 默认不一定按环境变量走代理。
- 本地验证显示，子进程启动时携带 `NODE_USE_ENV_PROXY=1` 和 `HTTPS_PROXY` 后，请求 `https://example.com` 会向代理发出 `CONNECT example.com:443 HTTP/1.1`。
- 这正是 sidecar 中 LLM 请求、webfetch 等网络请求需要的行为。

## 代码接入点

### Main Process

文件：

- `packages/desktop/src/main/index.ts`

接入位置：

- 应用初始化日志之后、设置 Chromium 命令行参数之前。
- 启动 sidecar 前再次调用一次，确保用户在应用启动期间切换系统代理后，sidecar 使用最新环境。

当前行为：

- 调用 `prepareProxyEnvironment()`。
- 调用 `useEnvProxy(...)`，保留旧的 Node HTTP 全局代理环境兼容逻辑。
- 保留 `app.commandLine.appendSwitch("proxy-bypass-list", "<-loopback>")`，让 Electron/Chromium 继续绕过本地回环。

### Sidecar

文件：

- `packages/desktop/src/main/sidecar.ts`

接入位置：

- sidecar 收到 `start` 命令后。
- 设置 OpenCode server env 后。
- 加载系统证书和导入 server 模块之前。

当前行为：

- sidecar 自己也调用 `prepareProxyEnvironment()`。
- 然后调用 `useEnvProxy(...)`。

这样即使 sidecar 启动环境中缺少部分变量，也会在子进程内部再同步一次 Windows 系统代理。

## 本次没有做的事

没有直接修改：

- Windows 系统代理
- WinHTTP 代理
- Clash / Clash Verge 配置
- OpenCode config 文件
- provider 配置

也没有实现：

- SOCKS 代理直接支持。
- PAC / AutoConfigURL 解析。
- 每一次单独请求失败后的动态代理切换。

原因：

- 当前最直接的问题是桌面端没有消费 WinINet 系统代理。
- HTTP 代理是 Clash、Clash Verge 等工具默认提供的主流入口。
- PAC 和 SOCKS 需要更复杂的代理解析或额外依赖，适合后续单独评估。

## 验证记录

本机系统代理读取结果：

- `ProxyEnable = 1`
- `ProxyServer = 127.0.0.1:7890`

验证脚本确认：

- `parseWindowsProxyServer("127.0.0.1:7890")` 输出：
  - `http: http://127.0.0.1:7890`
  - `https: http://127.0.0.1:7890`
- `parseWindowsProxyServer("http=127.0.0.1:7890;https=127.0.0.1:7890;socks=127.0.0.1:7891")` 正确提取 HTTP/HTTPS。
- `parseWindowsProxyServer("socks=127.0.0.1:7891")` 输出 `{}`，不会误导入。
- `prepareProxyEnvironment()` 在当前机器上写入：
  - `HTTP_PROXY=http://127.0.0.1:7890`
  - `HTTPS_PROXY=http://127.0.0.1:7890`
  - `NODE_USE_ENV_PROXY=1`
  - `NO_PROXY` 合并系统排除列表和回环地址。

构建验证：

- 在 `packages/desktop` 执行 `bun run build` 通过。

类型检查：

- 在 `packages/desktop` 执行 `bun typecheck` 仍被既有 Windows symlink 问题挡住。
- 具体表现是 `packages/app/src/custom-elements.d.ts` 第一行是 symlink 文本 `../../ui/src/custom-elements.d.ts`，当前 Windows checkout 的 `core.symlinks=false` 导致 TypeScript 报 `TS1128`。
- 该问题不是本次代理修复引入的。

## 后续排查建议

如果后续仍出现网络超时，按以下顺序排查：

1. 确认 Windows 系统代理是否开启。
2. 确认系统代理是否提供 HTTP 代理端口，而不是只有 SOCKS。
3. 查看 OpenCode 日志中是否仍是 `UND_ERR_CONNECT_TIMEOUT`。
4. 如果目标是本地地址，检查 `NO_PROXY` 是否包含 `127.0.0.1`、`localhost`、`::1`。
5. 如果使用 PAC 或 SOCKS-only 代理软件，需要考虑新增 PAC 解析或 SOCKS 代理支持。
6. 如果只有 LLM provider 失败而 webfetch 正常，再检查 provider SDK 是否绕过了 Node fetch 或自带代理实现。

## 给后续线程的重点

本次改动的核心判断是：

- 不要写死 Clash。
- 不要改系统全局代理。
- 读取 Windows 当前系统代理并映射到 OpenCode 进程环境。
- 用 `NODE_USE_ENV_PROXY=1` 让 Node fetch/undici 真正消费代理环境。
- 用 `NO_PROXY` 和 Chromium `proxy-bypass-list` 保护本地 sidecar 通信。

