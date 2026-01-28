import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { embed } from "ai";
import { vector, embeddingModel, getKnowledgeIndexName } from "../../rag.js";

/**
 * RAG Query Tool - Search the knowledge base using semantic vector search
 *
 * This tool provides semantic search capabilities across the knowledge base:
 * - Automatically generates embeddings for user queries
 * - Performs cosine similarity search in the vector store
 * - Supports both pgvector (PostgreSQL) and LibSQL vector stores
 * - Returns relevant document chunks with metadata
 *
 * The tool has direct access to the vector store instance to ensure
 * it works correctly in agent network contexts.
 */
export const queryKnowledgeTool = createTool({
  id: "query-knowledge-base",
  description:
    "Access the knowledge base to find information needed to answer user questions.",
  inputSchema: z.object({
    queryText: z
      .string()
      .describe("The search query or question to find relevant information"),
    topK: z
      .number()
      .optional()
      .default(5)
      .describe("Number of relevant results to return (default: 5)"),
    filter: z
      .string()
      .optional()
      .describe("Optional metadata filter for advanced queries"),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        content: z.string().describe("The relevant text content"),
        score: z.number().describe("Similarity score (0-1)"),
        metadata: z.record(z.any()).optional().describe("Document metadata"),
      }),
    ),
  }),
  execute: async ({ queryText, topK, filter }) => {
    const indexName = getKnowledgeIndexName();

    // Generate embedding for the query
    const { embedding } = await embed({
      model: embeddingModel,
      value: queryText,
    });

    // Parse filter if provided (should be JSON string)
    const parsedFilter = filter ? JSON.parse(filter) : undefined;

    // Query the vector store
    const results = await vector.query({
      indexName,
      queryVector: embedding,
      topK: topK || 5,
      filter: parsedFilter,
    });

    // Format results
    return {
      results: results.map((result) => ({
        content: (result as any).content || result.metadata?.text || "",
        score: result.score || 0,
        metadata: result.metadata,
      })),
    };
  },
});
