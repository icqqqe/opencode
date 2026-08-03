import type { JsonValue } from "@opencode-ai/client/promise"
import { getFilename } from "@opencode-ai/core/util/path"
import { type AgentPartInput, type FilePartInput, type Part, type TextPartInput } from "@opencode-ai/sdk/v2/client"
import type { FileSelection } from "@/context/file"
import { encodeFilePath } from "@/context/file/path"
import type { AgentPart, FileAttachmentPart, ImageAttachmentPart, Prompt, SkillPart } from "@/context/prompt"
import { Identifier } from "@/utils/id"
import { createCommentMetadata, formatCommentNote } from "@/utils/comment-note"

type PromptRequestPart = (TextPartInput | FilePartInput | AgentPartInput) & { id: string }

type ContextFile = {
  key: string
  type: "file"
  path: string
  selection?: FileSelection
  comment?: string
  commentID?: string
  commentOrigin?: "review" | "file"
  preview?: string
}

type BuildRequestPartsInput = {
  prompt: Prompt
  context: ContextFile[]
  images: ImageAttachmentPart[]
  text: string
  messageID: string
  sessionID: string
  sessionDirectory: string
}

const absolute = (directory: string, path: string) => {
  if (path.startsWith("/")) return path
  if (/^[A-Za-z]:[\\/]/.test(path) || /^[A-Za-z]:$/.test(path)) return path
  if (path.startsWith("\\\\") || path.startsWith("//")) return path
  return `${directory.replace(/[\\/]+$/, "")}/${path}`
}

const fileQuery = (selection: FileSelection | undefined) =>
  selection ? `?start=${selection.startLine}&end=${selection.endLine}` : ""

const mention = /(^|[\s([{"'])@(\S+)/g

const parseCommentMentions = (comment: string) => {
  return Array.from(comment.matchAll(mention)).flatMap((match) => {
    const path = (match[2] ?? "").replace(/[.,!?;:)}\]"']+$/, "")
    if (!path) return []
    return [path]
  })
}

const isFileAttachment = (part: Prompt[number]): part is FileAttachmentPart => part.type === "file"
const isAgentAttachment = (part: Prompt[number]): part is AgentPart => part.type === "agent"
const isSkillAttachment = (part: Prompt[number]): part is SkillPart => part.type === "skill"

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function jsonValue(value: unknown): JsonValue | undefined {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return value
  }
  if (Array.isArray(value)) {
    return value.flatMap((item): JsonValue[] => {
      const result = jsonValue(item)
      if (result === undefined) return []
      return [result]
    })
  }
  if (!isRecord(value)) return
  return jsonObject(value)
}

function jsonObject(value: Record<string, unknown>): Record<string, JsonValue> {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]): [string, JsonValue][] => {
      const result = jsonValue(item)
      if (result === undefined) return []
      return [[key, result]]
    }),
  )
}

function skillBaseDirectory(location?: string) {
  if (!location) return
  const normalized = location.replace(/\\/g, "/").replace(/\/+$/, "")
  if (!normalized || normalized === "<built-in>") return
  const index = normalized.lastIndexOf("/")
  if (index === 0) return "/"
  if (index < 0) return
  const directory = normalized.slice(0, index)
  if (/^[A-Za-z]:$/.test(directory)) return `${directory}/`
  return directory
}

function skillPromptText(skill: SkillPart) {
  const content = [`<skill_content name="${skill.name}">`, `# Skill: ${skill.name}`, "", skill.body.trim()]
  const directory = skillBaseDirectory(skill.location)
  if (directory) {
    content.push(
      "",
      `Base directory for this skill: ${directory}`,
      "Relative paths in this skill (e.g., scripts/, references/) are relative to this base directory.",
    )
  }
  content.push("</skill_content>")
  return content.join("\n")
}

const toOptimisticPart = (part: PromptRequestPart, sessionID: string, messageID: string): Part => {
  if (part.type === "text") {
    return {
      id: part.id,
      type: "text",
      text: part.text,
      synthetic: part.synthetic,
      ignored: part.ignored,
      time: part.time,
      metadata: part.metadata,
      sessionID,
      messageID,
    }
  }
  if (part.type === "file") {
    return {
      id: part.id,
      type: "file",
      mime: part.mime,
      filename: part.filename,
      url: part.url,
      source: part.source,
      sessionID,
      messageID,
    }
  }
  return {
    id: part.id,
    type: "agent",
    name: part.name,
    source: part.source,
    sessionID,
    messageID,
  }
}

export function buildRequestParts(input: BuildRequestPartsInput) {
  const requestParts: PromptRequestPart[] = input.text.trim()
    ? [
        {
          id: Identifier.ascending("part"),
          type: "text",
          text: input.text,
        },
      ]
    : []

  const files = input.prompt.filter(isFileAttachment).map((attachment) => {
    const path = absolute(input.sessionDirectory, attachment.path)
    const source = attachment.source
      ? {
          ...attachment.source,
          text: {
            value: attachment.content,
            start: attachment.start,
            end: attachment.end,
          },
        }
      : {
          type: "file" as const,
          text: {
            value: attachment.content,
            start: attachment.start,
            end: attachment.end,
          },
          path,
        }
    return {
      id: Identifier.ascending("part"),
      type: "file",
      mime: attachment.mime ?? "text/plain",
      url: attachment.url ?? `file://${encodeFilePath(path)}${fileQuery(attachment.selection)}`,
      filename: attachment.filename ?? getFilename(attachment.path),
      source,
    } satisfies PromptRequestPart
  })

  const agents = input.prompt.filter(isAgentAttachment).map((attachment) => {
    return {
      id: Identifier.ascending("part"),
      type: "agent",
      name: attachment.name,
      source: {
        value: attachment.content,
        start: attachment.start,
        end: attachment.end,
      },
    } satisfies PromptRequestPart
  })

  const used = new Set(files.map((part) => part.url))
  const context = input.context.flatMap((item) => {
    const path = absolute(input.sessionDirectory, item.path)
    const url = `file://${encodeFilePath(path)}${fileQuery(item.selection)}`
    const comment = item.comment?.trim()
    if (!comment && used.has(url)) return []
    used.add(url)

    const filePart = {
      id: Identifier.ascending("part"),
      type: "file",
      mime: "text/plain",
      url,
      filename: getFilename(item.path),
    } satisfies PromptRequestPart

    if (!comment) return [filePart]

    const mentions = parseCommentMentions(comment).flatMap((path) => {
      const url = `file://${encodeFilePath(absolute(input.sessionDirectory, path))}`
      if (used.has(url)) return []
      used.add(url)
      return [
        {
          id: Identifier.ascending("part"),
          type: "file",
          mime: "text/plain",
          url,
          filename: getFilename(path),
        } satisfies PromptRequestPart,
      ]
    })

    return [
      {
        id: Identifier.ascending("part"),
        type: "text",
        text: formatCommentNote({ path: item.path, selection: item.selection, comment }),
        synthetic: true,
        metadata: createCommentMetadata({
          path: item.path,
          selection: item.selection,
          comment,
          preview: item.preview,
          origin: item.commentOrigin,
        }),
      } satisfies PromptRequestPart,
      filePart,
      ...mentions,
    ]
  })

  const skills = Array.from(
    input.prompt.filter(isSkillAttachment).reduce((result, attachment) => {
      const source = {
        value: attachment.content,
        start: attachment.start,
        end: attachment.end,
      }
      const existing = result.get(attachment.name)
      if (existing) {
        existing.sources.push(source)
        return result
      }
      result.set(attachment.name, { attachment, sources: [source] })
      return result
    }, new Map<string, { attachment: SkillPart; sources: { value: string; start: number; end: number }[] }>()),
  ).map(([, item]) => {
    return {
      id: Identifier.ascending("part"),
      type: "text",
      text: skillPromptText(item.attachment),
      synthetic: true,
      metadata: {
        opencodeSkill: {
          name: item.attachment.name,
          description: item.attachment.description,
          ...(item.attachment.location ? { location: item.attachment.location } : {}),
          content: item.attachment.body,
          source: item.sources[0],
          sources: item.sources,
        },
      },
    } satisfies PromptRequestPart
  })

  const images = input.images.map((attachment) => {
    return {
      id: Identifier.ascending("part"),
      type: "file",
      mime: attachment.mime,
      url: attachment.dataUrl,
      filename: attachment.sourcePath ?? attachment.filename,
    } satisfies PromptRequestPart
  })

  requestParts.push(...files, ...context, ...agents, ...skills, ...images)

  return {
    requestParts,
    optimisticParts: requestParts.map((part) => toOptimisticPart(part, input.sessionID, input.messageID)),
    metadata: {
      opencodePrompt: {
        textParts: requestParts.flatMap((part) => {
          if (part.type !== "text") return []
          return [
            jsonObject({
              ...(part.synthetic && part.metadata ? {} : { text: part.text }),
              ...(part.synthetic === undefined ? {} : { synthetic: part.synthetic }),
              ...(part.ignored === undefined ? {} : { ignored: part.ignored }),
              ...(part.metadata === undefined ? {} : { metadata: part.metadata }),
            }),
          ]
        }),
      },
    } satisfies Record<string, JsonValue>,
  }
}
