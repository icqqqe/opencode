import { spawnSync } from "node:child_process"
import * as http from "node:http"

type NodeHttpWithEnvProxy = typeof http & {
  setGlobalProxyFromEnv?: () => void
}

const INTERNET_SETTINGS_KEY = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"
const MANAGED_PROXY_ENV = "OPENCODE_DESKTOP_MANAGED_PROXY_ENV"
const LOOPBACK_NO_PROXY = ["127.0.0.1", "localhost", "::1"]
const PROXY_ENV_KEYS = ["HTTP_PROXY", "http_proxy", "HTTPS_PROXY", "https_proxy"] as const

type ProxyEnvKey = (typeof PROXY_ENV_KEYS)[number]

export function prepareProxyEnvironment() {
  syncWindowsSystemProxyEnv()
  ensureNoProxy(LOOPBACK_NO_PROXY)
  if (hasProxyEnv()) process.env.NODE_USE_ENV_PROXY ??= "1"
}

export function useEnvProxy(onError: (error: unknown) => void) {
  try {
    ;(http as NodeHttpWithEnvProxy).setGlobalProxyFromEnv?.()
  } catch (error) {
    onError(error)
  }
}

export function parseWindowsProxyServer(value: string) {
  const entries = value
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
  const hasProtocolEntries = entries.some((entry) => entry.includes("="))
  const perProtocol = Object.fromEntries(
    entries.flatMap((entry) => {
      const separator = entry.indexOf("=")
      if (separator === -1) return []
      const protocol = entry.slice(0, separator).trim().toLowerCase()
      const proxy = normalizeProxyURL(entry.slice(separator + 1))
      if (!proxy || (protocol !== "http" && protocol !== "https")) return []
      return [[protocol, proxy]]
    }),
  )

  if (hasProtocolEntries) {
    return {
      http: perProtocol.http ?? perProtocol.https,
      https: perProtocol.https ?? perProtocol.http,
    }
  }

  const proxy = normalizeProxyURL(value)
  return proxy ? { http: proxy, https: proxy } : {}
}

export function windowsProxyOverrideToNoProxy(value: string) {
  return value
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry.toLowerCase() !== "<local>")
}

function syncWindowsSystemProxyEnv() {
  if (process.platform !== "win32") return

  const settings = readWindowsInternetSettings()
  if (!settings.enabled || !settings.proxyServer) {
    clearManagedProxyEnv()
    return
  }

  const proxy = parseWindowsProxyServer(settings.proxyServer)
  if (proxy.http) setManagedProxyEnv(["HTTP_PROXY", "http_proxy"], proxy.http)
  if (proxy.https) setManagedProxyEnv(["HTTPS_PROXY", "https_proxy"], proxy.https)
  if (settings.proxyOverride) ensureNoProxy(windowsProxyOverrideToNoProxy(settings.proxyOverride))
}

function readWindowsInternetSettings() {
  return {
    enabled: parseRegistryDWORD(queryRegistryValue("ProxyEnable")) === 1,
    proxyServer: queryRegistryValue("ProxyServer"),
    proxyOverride: queryRegistryValue("ProxyOverride"),
  }
}

function queryRegistryValue(name: string) {
  const result = spawnSync("reg", ["query", INTERNET_SETTINGS_KEY, "/v", name], {
    encoding: "utf8",
    windowsHide: true,
  })
  if (result.error || result.status !== 0) return

  return result.stdout
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = line.match(new RegExp(`^\\s*${name}\\s+REG_\\w+\\s+(.+?)\\s*$`, "i"))
      return match?.[1] ? [match[1]] : []
    })
    .at(0)
}

function parseRegistryDWORD(value: string | undefined) {
  if (!value) return 0
  if (value.toLowerCase().startsWith("0x")) return Number.parseInt(value, 16)
  return Number.parseInt(value, 10)
}

function normalizeProxyURL(value: string) {
  const proxy = value.trim()
  if (!proxy || proxy.toLowerCase().startsWith("socks")) return
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(proxy)) return proxy
  return `http://${proxy}`
}

function setManagedProxyEnv(keys: readonly ProxyEnvKey[], value: string) {
  const managed = getManagedProxyEnv()
  if (keys.some((key) => process.env[key] && !managed.has(key))) return

  for (const key of keys) {
    process.env[key] = value
    managed.add(key)
  }
  process.env[MANAGED_PROXY_ENV] = [...managed].join(",")
}

function clearManagedProxyEnv() {
  const managed = getManagedProxyEnv()
  for (const key of managed) {
    delete process.env[key]
  }
  delete process.env[MANAGED_PROXY_ENV]
}

function getManagedProxyEnv() {
  return new Set(
    (process.env[MANAGED_PROXY_ENV] ?? "")
      .split(",")
      .map((key) => key.trim())
      .filter(isProxyEnvKey),
  )
}

function isProxyEnvKey(key: string): key is ProxyEnvKey {
  return (PROXY_ENV_KEYS as readonly string[]).includes(key)
}

function hasProxyEnv() {
  return PROXY_ENV_KEYS.some((key) => Boolean(process.env[key]))
}

function ensureNoProxy(values: string[]) {
  const merged = new Map<string, string>()

  for (const key of ["NO_PROXY", "no_proxy"]) {
    for (const value of (process.env[key] ?? "").split(/[;,]/)) {
      const item = value.trim()
      if (item) merged.set(item.toLowerCase(), item)
    }
  }

  for (const value of values) {
    if (value) merged.set(value.toLowerCase(), value)
  }

  const noProxy = [...merged.values()].join(",")
  process.env.NO_PROXY = noProxy
  process.env.no_proxy = noProxy
}
