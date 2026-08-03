import type { ServerConnection } from "@/context/server"
import { authTokenFromCredentials } from "./server"

export type ServerProtocol = "v1" | "v2"

function headers(server: ServerConnection.HttpBase) {
  if (!server.password) return
  return {
    Authorization: `Basic ${authTokenFromCredentials({ username: server.username, password: server.password })}`,
  }
}

async function probe(server: ServerConnection.HttpBase, fetch: typeof globalThis.fetch, path: string) {
  const response = await fetch(new URL(path, server.url), {
    headers: headers(server),
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return
  const value: unknown = await response.json()
  if (!value || typeof value !== "object") return
  return value
}

function isHealthy(value: unknown) {
  return !!value && typeof value === "object" && "healthy" in value && value.healthy === true
}

function isV2Location(value: unknown) {
  if (!value || typeof value !== "object") return false
  if (!("directory" in value) || typeof value.directory !== "string") return false
  if (!("project" in value) || !value.project || typeof value.project !== "object") return false
  return (
    "id" in value.project &&
    typeof value.project.id === "string" &&
    "directory" in value.project &&
    typeof value.project.directory === "string"
  )
}

export async function detectServerProtocol(
  server: ServerConnection.HttpBase,
  fetch: typeof globalThis.fetch,
): Promise<ServerProtocol> {
  const [current, legacy] = await Promise.all([
    probe(server, fetch, "/api/health").catch(() => undefined),
    probe(server, fetch, "/global/health").catch(() => undefined),
  ])

  // Current sidecars are dual-stack, so a valid response from both generations
  // must prefer V2. Historical transitional V1 servers exposed only /api/health.
  if (isHealthy(current) && isHealthy(legacy)) return "v2"
  if (isHealthy(legacy)) return "v1"
  if (!isHealthy(current)) return "v2"
  if ("pid" in current && typeof current.pid === "number") return "v2"

  const location = await probe(server, fetch, "/api/location").catch(() => undefined)
  return isV2Location(location) ? "v2" : "v1"
}
