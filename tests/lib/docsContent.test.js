import { describe, expect, it } from "vitest"
import { DOCS_GROUPS, DOCS_TOPICS } from "@/lib/docsContent"

describe("docsContent", () => {
  it("has unique topic ids and valid group references", () => {
    const groupIds = new Set(DOCS_GROUPS.map((group) => group.id))
    const topicIds = DOCS_TOPICS.map((topic) => topic.id)

    expect(groupIds.size).toBe(DOCS_GROUPS.length)
    expect(new Set(topicIds).size).toBe(topicIds.length)

    for (const topic of DOCS_TOPICS) {
      expect(groupIds.has(topic.groupId), `topic ${topic.id} has unknown groupId ${topic.groupId}`).toBe(true)
    }
  })

  it("has complete content for every topic", () => {
    for (const topic of DOCS_TOPICS) {
      expect(topic.title, `topic ${topic.id} missing title`).toBeTruthy()
      expect(topic.summary, `topic ${topic.id} missing summary`).toBeTruthy()
      expect(Array.isArray(topic.body), `topic ${topic.id} body must be an array`).toBe(true)
      expect(topic.body.length, `topic ${topic.id} body must not be empty`).toBeGreaterThan(0)
      for (const paragraph of topic.body) {
        expect(paragraph.trim().length, `topic ${topic.id} has an empty paragraph`).toBeGreaterThan(0)
      }
    }
  })

  it("renders every group with at least one topic", () => {
    for (const group of DOCS_GROUPS) {
      const topics = DOCS_TOPICS.filter((topic) => topic.groupId === group.id)
      expect(topics.length, `group ${group.id} has no topics`).toBeGreaterThan(0)
    }
  })
})
