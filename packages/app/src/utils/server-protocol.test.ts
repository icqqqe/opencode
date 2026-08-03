import { describe, expect, test } from "bun:test"
import { detectServerProtocol } from "./server-protocol"

const server = { url: "http://localhost:4096" }
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } })
const mockFetch = (run: (input: string | URL | Request) => Promise<Response>) =>
  Object.assign(run, { preconnect: globalThis.fetch.preconnect })

describe("detectServerProtocol", () => {
  test("prefers V2 when both API generations exist", async () => {
    const requested: string[] = []
    const fetcher = mockFetch((input) => {
      const path = new URL(input instanceof Request ? input.url : input).pathname
      requested.push(path)
      if (path === "/global/health") return Promise.resolve(json({ healthy: true, version: "1.18.4" }))
      return Promise.resolve(json({ healthy: true }))
    })

    expect(await detectServerProtocol(server, fetcher)).toBe("v2")
    expect(requested).toEqual(["/api/health", "/global/health"])
  })

  test("recognizes a pure V2 server by its location endpoint", async () => {
    const fetcher = mockFetch((input) => {
      const path = new URL(input instanceof Request ? input.url : input).pathname
      if (path === "/global/health") return Promise.resolve(json({}, 404))
      if (path === "/api/health") return Promise.resolve(json({ healthy: true }))
      return Promise.resolve(
        json({ directory: "/workspace", project: { id: "project", directory: "/workspace" } }),
      )
    })

    expect(await detectServerProtocol(server, fetcher)).toBe("v2")
  })

  test("recognizes historical V2 health by its process identifier", async () => {
    const requested: string[] = []
    const fetcher = mockFetch((input) => {
      const path = new URL(input instanceof Request ? input.url : input).pathname
      requested.push(path)
      if (path === "/global/health") return Promise.resolve(json({}, 404))
      return Promise.resolve(json({ healthy: true, version: "2.0.0", pid: 123 }))
    })

    expect(await detectServerProtocol(server, fetcher)).toBe("v2")
    expect(requested).toEqual(["/api/health", "/global/health"])
  })

  test("falls back to V1 when the V2 health endpoint is unavailable", async () => {
    const fetcher = mockFetch((input) => {
      const path = new URL(input instanceof Request ? input.url : input).pathname
      if (path === "/api/health") return Promise.resolve(json({}, 404))
      return Promise.resolve(json({ healthy: true, version: "1.18.4" }))
    })

    expect(await detectServerProtocol(server, fetcher)).toBe("v1")
  })

  test("recognizes a transitional V1 API health response", async () => {
    const fetcher = mockFetch((input) => {
      const path = new URL(input instanceof Request ? input.url : input).pathname
      if (path === "/api/health") return Promise.resolve(json({ healthy: true }))
      return Promise.resolve(json({}, 404))
    })

    expect(await detectServerProtocol(server, fetcher)).toBe("v1")
  })

  test("falls back to V1 when the V2 health request fails", async () => {
    const fetcher = mockFetch((input) => {
      const path = new URL(input instanceof Request ? input.url : input).pathname
      if (path === "/api/health") return Promise.reject(new Error("network failure"))
      return Promise.resolve(json({ healthy: true, version: "1.18.4" }))
    })

    expect(await detectServerProtocol(server, fetcher)).toBe("v1")
  })

  test("defaults to V2 when neither health endpoint is available", async () => {
    const fetcher = mockFetch(() => Promise.resolve(json({}, 404)))

    expect(await detectServerProtocol(server, fetcher)).toBe("v2")
  })
})
