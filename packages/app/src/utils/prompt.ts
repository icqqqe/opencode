import type { AgentPart as MessageAgentPart, FilePart, Part, TextPart } from "@opencode-ai/sdk/v2"
import type { AgentPart, FileAttachmentPart, ImageAttachmentPart, Prompt, SkillPart } from "@/context/prompt"

type Inline =
  | {
      type: "file"
      start: number
      end: number
      value: string
      path: string
      selection?: {
        startLine: number
        endLine: number
        startChar: number
        endChar: number
      }
    }
  | {
      type: "agent"
      start: number
      end: number
      value: string
      name: string
    }
  | {
      type: "skill"
      start: number
      end: number
      value: string
      name: string
      description?: string
      location?: string
      body: string
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function selectionFromFileUrl(url: string): Extract<Inline, { type: "file" }>["selection"] {
  const queryIndex = url.indexOf("?")
  if (queryIndex === -1) return undefined
  const params = new URLSearchParams(url.slice(queryIndex + 1))
  const startLine = Number(params.get("start"))
  const endLine = Number(params.get("end"))
  if (!Number.isFinite(startLine) || !Number.isFinite(endLine)) return undefined
  return {
    startLine,
    endLine,
    startChar: 0,
    endChar: 0,
  }
}

function skillSource(source: unknown) {
  if (!isRecord(source)) return
  if (typeof source.value !== "string") return
  if (typeof source.start !== "number") return
  if (typeof source.end !== "number") return
  return { value: source.value, start: source.start, end: source.end }
}

function skillsFromMetadata(metadata: unknown): Extract<Inline, { type: "skill" }>[] {
  if (!isRecord(metadata)) return []
  const skill = metadata.opencodeSkill
  if (!isRecord(skill)) return []
  if (typeof skill.name !== "string") return []
  if (typeof skill.content !== "string") return []
  if (skill.description !== undefined && typeof skill.description !== "string") return []
  if (skill.location !== undefined && typeof skill.location !== "string") return []
  const reference = {
    name: skill.name,
    description: skill.description,
    ...(skill.location ? { location: skill.location } : {}),
    body: skill.content,
  }
  const source = skillSource(skill.source)
  const sources = Array.isArray(skill.sources)
    ? skill.sources.map(skillSource).filter((item): item is NonNullable<typeof item> => !!item)
    : []
  return (sources.length > 0 ? sources : source ? [source] : []).map((item) => ({
    type: "skill",
    ...reference,
    value: item.value,
    start: item.start,
    end: item.end,
  }))
}

function textPartValue(parts: Part[]) {
  const candidates = parts
    .filter((part): part is TextPart => part.type === "text")
    .filter((part) => !part.synthetic && !part.ignored)
  return candidates.reduce((best: TextPart | undefined, part) => {
    if (!best) return part
    if (part.text.length > best.text.length) return part
    return best
  }, undefined)
}

/**
 * Extract prompt content from message parts for restoring into the prompt input.
 * This is used by undo to restore the original user prompt.
 */
export function extractPromptFromParts(parts: Part[], opts?: { directory?: string; attachmentName?: string }): Prompt {
  const textPart = textPartValue(parts)
  const text = textPart?.text ?? ""
  const directory = opts?.directory
  const attachmentName = opts?.attachmentName ?? "attachment"

  const toRelative = (path: string) => {
    if (!directory) return path

    const prefix = directory.endsWith("/") ? directory : directory + "/"
    if (path.startsWith(prefix)) return path.slice(prefix.length)

    if (path.startsWith(directory)) {
      const next = path.slice(directory.length)
      if (next.startsWith("/")) return next.slice(1)
      return next
    }

    return path
  }

  const inline: Inline[] = []
  const images: ImageAttachmentPart[] = []

  for (const part of parts) {
    if (part.type === "file") {
      const filePart = part as FilePart
      const sourceText = filePart.source?.text
      if (sourceText) {
        const value = sourceText.value
        const start = sourceText.start
        const end = sourceText.end
        let path = value
        if (value.startsWith("@")) path = value.slice(1)
        if (!value.startsWith("@") && filePart.source && "path" in filePart.source) {
          path = filePart.source.path
        }
        inline.push({
          type: "file",
          start,
          end,
          value,
          path: toRelative(path),
          selection: selectionFromFileUrl(filePart.url),
        })
        continue
      }

      if (filePart.url.startsWith("data:")) {
        images.push({
          type: "image",
          id: filePart.id,
          filename: filePart.filename ?? attachmentName,
          mime: filePart.mime,
          dataUrl: filePart.url,
        })
      }
    }

    if (part.type === "text" && part.synthetic) {
      inline.push(...skillsFromMetadata(part.metadata))
    }

    if (part.type === "agent") {
      const agentPart = part as MessageAgentPart
      const source = agentPart.source
      if (!source) continue
      inline.push({
        type: "agent",
        start: source.start,
        end: source.end,
        value: source.value,
        name: agentPart.name,
      })
    }
  }

  inline.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start
    return a.end - b.end
  })

  const result: Prompt = []
  let position = 0
  let cursor = 0

  const pushText = (content: string) => {
    if (!content) return
    result.push({
      type: "text",
      content,
      start: position,
      end: position + content.length,
    })
    position += content.length
  }

  const pushFile = (item: Extract<Inline, { type: "file" }>) => {
    const content = item.value
    const attachment: FileAttachmentPart = {
      type: "file",
      path: item.path,
      content,
      start: position,
      end: position + content.length,
      selection: item.selection,
    }
    result.push(attachment)
    position += content.length
  }

  const pushAgent = (item: Extract<Inline, { type: "agent" }>) => {
    const content = item.value
    const mention: AgentPart = {
      type: "agent",
      name: item.name,
      content,
      start: position,
      end: position + content.length,
    }
    result.push(mention)
    position += content.length
  }

  const pushSkill = (item: Extract<Inline, { type: "skill" }>) => {
    const content = item.value
    const skill: SkillPart = {
      type: "skill",
      name: item.name,
      description: item.description,
      ...(item.location ? { location: item.location } : {}),
      body: item.body,
      content,
      start: position,
      end: position + content.length,
    }
    result.push(skill)
    position += content.length
  }

  for (const item of inline) {
    if (item.start < 0 || item.end < item.start) continue

    const expected = item.value
    if (!expected) continue

    const mismatch = item.end > text.length || item.start < cursor || text.slice(item.start, item.end) !== expected
    const start = mismatch ? text.indexOf(expected, cursor) : item.start
    if (start === -1) continue
    const end = mismatch ? start + expected.length : item.end

    pushText(text.slice(cursor, start))

    if (item.type === "file") pushFile(item)
    if (item.type === "agent") pushAgent(item)
    if (item.type === "skill") pushSkill(item)

    cursor = end
  }

  pushText(text.slice(cursor))

  if (result.length === 0) {
    result.push({ type: "text", content: "", start: 0, end: 0 })
  }

  if (images.length === 0) return result
  return [...result, ...images]
}
