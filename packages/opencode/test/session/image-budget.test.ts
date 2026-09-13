import { describe, expect, test } from "bun:test"
import type { UIMessage } from "ai"
import { applyImageBudget, DEFAULT_IMAGE_BUDGET } from "../../src/session/message-v2"

function filePart(filename: string): any {
  return { type: "file", url: `data:image/png;base64,${filename}`, mediaType: "image/png", filename }
}

function textPart(text: string): any {
  return { type: "text", text }
}

function toolPart(attachments: any[]): any {
  return {
    type: "tool-read",
    state: "output-available",
    toolCallId: "call_1",
    input: {},
    output: attachments.length > 0 ? { text: "done", attachments } : "done",
  }
}

function userMessage(id: string, parts: any[]): UIMessage {
  return { id, role: "user", parts } as unknown as UIMessage
}

function imageParts(messages: UIMessage[]): number {
  let count = 0
  for (const msg of messages) {
    for (const part of msg.parts as any[]) {
      if (part.type === "file" && part.mediaType?.startsWith("image/")) count++
      if (typeof part.type === "string" && part.type.startsWith("tool-") && part.output?.attachments) {
        count += (part.output.attachments as any[]).filter((a) => a.mime?.startsWith("image/")).length
      }
    }
  }
  return count
}

describe("session.image-budget", () => {
  test("default budget is 40", () => {
    expect(DEFAULT_IMAGE_BUDGET).toBe(40)
  })

  test("leaves messages under budget untouched", () => {
    const messages = [userMessage("msg_1", [textPart("hi"), filePart("a.png"), filePart("b.png")])]
    const result = applyImageBudget(messages, 5)
    expect(imageParts(result)).toBe(2)
    expect(result[0].parts).toHaveLength(3)
  })

  test("drops oldest file images first, newest kept", () => {
    const parts = Array.from({ length: 8 }, (_, i) => filePart(`img${i}.png`))
    const messages = [userMessage("msg_1", parts)]
    const result = applyImageBudget(messages, 3)
    expect(imageParts(result)).toBe(3)
    const texts = (result[0].parts as any[]).filter((p) => p.type === "text")
    expect(texts).toHaveLength(5)
    expect(texts[0].text).toContain("img0.png")
    expect(texts[0].text).toContain("image budget")
    const kept = (result[0].parts as any[]).filter((p) => p.type === "file").map((p) => p.filename)
    expect(kept).toEqual(["img5.png", "img6.png", "img7.png"])
  })

  test("drops oldest tool attachments and collapses emptied outputs to text", () => {
    const messages = [
      userMessage("msg_1", [
        toolPart([
          { mime: "image/png", url: "data:image/png;base64,old", filename: "old.png" },
          { mime: "image/png", url: "data:image/png;base64,new", filename: "new.png" },
        ]),
      ]),
    ]
    const result = applyImageBudget(messages, 1)
    expect(imageParts(result)).toBe(1)
    const output = (result[0].parts as any[])[0].output
    expect(output.attachments).toHaveLength(1)
    expect(output.attachments[0].filename).toBe("new.png")
  })

  test("collapses tool output to plain text when all images dropped", () => {
    const messages = [userMessage("msg_1", [toolPart([{ mime: "image/png", url: "data:img", filename: "x.png" }])])]
    const result = applyImageBudget(messages, 0)
    expect(imageParts(result)).toBe(0)
    expect((result[0].parts as any[])[0].output).toBe("done")
  })

  test("counts file and tool images together, oldest first across both", () => {
    const messages = [
      userMessage("msg_1", [filePart("first.png")]),
      userMessage("msg_2", [toolPart([{ mime: "image/png", url: "data:second", filename: "second.png" }])]),
      userMessage("msg_3", [filePart("third.png")]),
    ]
    const result = applyImageBudget(messages, 2)
    expect(imageParts(result)).toBe(2)
    // oldest (first.png) replaced with placeholder text
    expect((result[0].parts as any[])[0].type).toBe("text")
    expect((result[2].parts as any[])[0].type).toBe("file")
  })
})
