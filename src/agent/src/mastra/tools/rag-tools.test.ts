import { describe, it, expect } from "vitest";
import {
  queryKnowledgeTool,
  addKnowledgeTool,
  getKnowledgeDocuments,
  getKnowledgeBaseThreadId,
} from "./rag-tools.js";

describe("RAG Tools", () => {
  describe("getKnowledgeDocuments", () => {
    it("should return knowledge documents", () => {
      const docs = getKnowledgeDocuments();
      expect(docs).toBeDefined();
      expect(Array.isArray(docs)).toBe(true);
      expect(docs.length).toBeGreaterThan(0);
    });

    it("should have documents with topic and content", () => {
      const docs = getKnowledgeDocuments();
      docs.forEach((doc) => {
        expect(doc).toHaveProperty("topic");
        expect(doc).toHaveProperty("content");
        expect(typeof doc.topic).toBe("string");
        expect(typeof doc.content).toBe("string");
        expect(doc.topic.length).toBeGreaterThan(0);
        expect(doc.content.length).toBeGreaterThan(0);
      });
    });

    it("should include key topics", () => {
      const docs = getKnowledgeDocuments();
      const topics = docs.map((doc) => doc.topic);
      
      expect(topics).toContain("Mastra Framework");
      expect(topics).toContain("AI Agent Best Practices");
      expect(topics).toContain("RAG Implementation");
      expect(topics).toContain("TypeScript Development");
      expect(topics).toContain("Vector Databases");
    });
  });

  describe("getKnowledgeBaseThreadId", () => {
    it("should return a consistent thread ID", () => {
      const threadId1 = getKnowledgeBaseThreadId();
      const threadId2 = getKnowledgeBaseThreadId();
      
      expect(threadId1).toBe(threadId2);
      expect(typeof threadId1).toBe("string");
      expect(threadId1.length).toBeGreaterThan(0);
    });
  });

  describe("queryKnowledgeTool", () => {
    it("should be defined with correct properties", () => {
      expect(queryKnowledgeTool).toBeDefined();
      expect(queryKnowledgeTool.id).toBe("query-knowledge-base");
      expect(queryKnowledgeTool.description).toContain("knowledge base");
    });

    it("should have proper input schema", () => {
      expect(queryKnowledgeTool.inputSchema).toBeDefined();
      const testInput = { query: "test query", limit: 3 };
      const result = queryKnowledgeTool.inputSchema.safeParse(testInput);
      expect(result.success).toBe(true);
    });

    it("should have proper output schema", () => {
      expect(queryKnowledgeTool.outputSchema).toBeDefined();
      const testOutput = {
        results: [{ content: "test", relevance: "high" }],
        summary: "test summary",
      };
      const result = queryKnowledgeTool.outputSchema.safeParse(testOutput);
      expect(result.success).toBe(true);
    });

    it("should have execute function", () => {
      expect(queryKnowledgeTool.execute).toBeDefined();
      expect(typeof queryKnowledgeTool.execute).toBe("function");
    });
  });

  describe("addKnowledgeTool", () => {
    it("should be defined with correct properties", () => {
      expect(addKnowledgeTool).toBeDefined();
      expect(addKnowledgeTool.id).toBe("add-knowledge");
      expect(addKnowledgeTool.description).toContain("knowledge base");
    });

    it("should have proper input schema", () => {
      expect(addKnowledgeTool.inputSchema).toBeDefined();
      const testInput = {
        topic: "Test Topic",
        content: "Test content",
      };
      const result = addKnowledgeTool.inputSchema.safeParse(testInput);
      expect(result.success).toBe(true);
    });

    it("should have proper output schema", () => {
      expect(addKnowledgeTool.outputSchema).toBeDefined();
      const testOutput = {
        success: true,
        message: "test message",
      };
      const result = addKnowledgeTool.outputSchema.safeParse(testOutput);
      expect(result.success).toBe(true);
    });

    it("should have execute function", () => {
      expect(addKnowledgeTool.execute).toBeDefined();
      expect(typeof addKnowledgeTool.execute).toBe("function");
    });
  });
});
