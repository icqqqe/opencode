import { describe, expect, test } from "bun:test"
import { resolveMarkdownLocalFileLinkTarget } from "./markdown"

describe("markdown local file links", () => {
  const directory = "E:\\workspace\\game\\ts_workspace"

  test("does not resolve implicit relative markdown paths against the session directory", () => {
    expect(
      resolveMarkdownLocalFileLinkTarget({
        text: "Read `CODEX\\AGENTS.md` first.",
        path: "CODEX\\AGENTS.md",
        directory,
      }),
    ).toBeUndefined()
  })

  test("resolves implicit relative markdown paths only through an absolute alias", () => {
    const absolute = "E:\\workspace\\game\\ts_workspace\\ai_custom\\CODEX\\AGENTS.md"
    expect(
      resolveMarkdownLocalFileLinkTarget({
        text: `Read ${absolute}, then CODEX\\AGENTS.md.`,
        path: "CODEX\\AGENTS.md",
        directory,
      }),
    ).toBe(absolute)
  })

  test("keeps explicit relative markdown paths relative to the session directory", () => {
    expect(
      resolveMarkdownLocalFileLinkTarget({
        text: "Read `.\\CODEX\\AGENTS.md` first.",
        path: ".\\CODEX\\AGENTS.md",
        directory,
      }),
    ).toBe("E:\\workspace\\game\\ts_workspace\\CODEX\\AGENTS.md")
  })
})
