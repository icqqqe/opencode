import { describe, expect, test } from "bun:test"
import type { Part } from "@opencode-ai/sdk/v2"
import { extractPromptFromParts } from "./prompt"

describe("extractPromptFromParts", () => {
  test("restores multiple uploaded attachments", () => {
    const parts = [
      {
        id: "text_1",
        type: "text",
        text: "check these",
        sessionID: "ses_1",
        messageID: "msg_1",
      },
      {
        id: "file_1",
        type: "file",
        mime: "image/png",
        url: "data:image/png;base64,AAA",
        filename: "a.png",
        sessionID: "ses_1",
        messageID: "msg_1",
      },
      {
        id: "file_2",
        type: "file",
        mime: "application/pdf",
        url: "data:application/pdf;base64,BBB",
        filename: "b.pdf",
        sessionID: "ses_1",
        messageID: "msg_1",
      },
    ] satisfies Part[]

    const result = extractPromptFromParts(parts)

    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({ type: "text", content: "check these" })
    expect(result.slice(1)).toMatchObject([
      { type: "image", filename: "a.png", mime: "image/png", dataUrl: "data:image/png;base64,AAA" },
      { type: "image", filename: "b.pdf", mime: "application/pdf", dataUrl: "data:application/pdf;base64,BBB" },
    ])
  })

  test("restores every structured skill reference with its location", () => {
    const parts = [
      {
        id: "text_1",
        type: "text",
        text: "use $planner then $planner",
        sessionID: "ses_1",
        messageID: "msg_1",
      },
      {
        id: "text_2",
        type: "text",
        text: "expanded skill content",
        synthetic: true,
        metadata: {
          opencodeSkill: {
            name: "planner",
            description: "Plan work",
            location: "C:\\Users\\dev\\.codex\\skills\\planner\\SKILL.md",
            content: "# Planner",
            source: { value: "$planner", start: 4, end: 12 },
            sources: [
              { value: "$planner", start: 4, end: 12 },
              { value: "$planner", start: 18, end: 26 },
            ],
          },
        },
        sessionID: "ses_1",
        messageID: "msg_1",
      },
    ] satisfies Part[]

    expect(extractPromptFromParts(parts)).toEqual([
      { type: "text", content: "use ", start: 0, end: 4 },
      {
        type: "skill",
        name: "planner",
        description: "Plan work",
        location: "C:\\Users\\dev\\.codex\\skills\\planner\\SKILL.md",
        body: "# Planner",
        content: "$planner",
        start: 4,
        end: 12,
      },
      { type: "text", content: " then ", start: 12, end: 18 },
      {
        type: "skill",
        name: "planner",
        description: "Plan work",
        location: "C:\\Users\\dev\\.codex\\skills\\planner\\SKILL.md",
        body: "# Planner",
        content: "$planner",
        start: 18,
        end: 26,
      },
    ])
  })

  test("restores legacy skill history without requiring a location", () => {
    const parts = [
      {
        id: "text_1",
        type: "text",
        text: "use $legacy",
        sessionID: "ses_1",
        messageID: "msg_1",
      },
      {
        id: "text_2",
        type: "text",
        text: "expanded skill content",
        synthetic: true,
        metadata: {
          opencodeSkill: {
            name: "legacy",
            content: "Legacy skill",
            source: { value: "$legacy", start: 4, end: 11 },
          },
        },
        sessionID: "ses_1",
        messageID: "msg_1",
      },
    ] satisfies Part[]

    expect(extractPromptFromParts(parts)).toEqual([
      { type: "text", content: "use ", start: 0, end: 4 },
      {
        type: "skill",
        name: "legacy",
        body: "Legacy skill",
        content: "$legacy",
        start: 4,
        end: 11,
      },
    ])
  })
})
