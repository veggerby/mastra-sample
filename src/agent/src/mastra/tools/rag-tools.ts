import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { embed } from "ai";
import { vector, embeddingModel, getKnowledgeIndexName } from "../../rag.js";

/**
 * Type definition for vector query results
 * This matches the structure returned by both PgVector and LibSQLVector
 */
interface VectorQueryResult {
  content?: string;
  text?: string;
  document?: {
    pageContent?: string;
  };
  metadata?: {
    content?: string;
    text?: string;
    [key: string]: unknown;
  };
  score?: number;
  [key: string]: unknown;
}

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
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(8)
      .describe("Number of relevant results to return (default: 8)"),
    filter: z
      .string()
      .optional()
      .describe("Optional metadata filter (JSON string)"),
    minScore: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(0)
      .describe(
        "Minimum similarity score (0-1) for returned results (default: 0)",
      ),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        content: z.string(),
        score: z.number(),
        metadata: z.record(z.any()).optional(),
      }),
    ),
  }),

  execute: async ({ queryText, topK, filter, minScore }) => {
    const indexName = getKnowledgeIndexName();

    const { embedding } = await embed({
      model: embeddingModel,
      value: queryText,
    });

    let parsedFilter: unknown = undefined;
    if (filter) {
      try {
        parsedFilter = JSON.parse(filter);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        throw new Error(`Invalid JSON in filter: ${message}`);
      }
    }

    const queryOnce = async (ms: number) =>
      vector.query({
        indexName,
        queryVector: embedding,
        topK,
        filter: parsedFilter,
        minScore: ms,
      });

    let results = await queryOnce(minScore ?? 0);

    // Fallback: if too strict, retry with no threshold so we can still provide context
    if ((!results || results.length === 0) && (minScore ?? 0) > 0) {
      results = await queryOnce(0);
    }

    return {
      results: results.map((r: VectorQueryResult) => {
        const content =
          r.content ??
          r.text ??
          r.document?.pageContent ??
          r.metadata?.content ??
          r.metadata?.text ??
          "";

        return {
          content,
          score: r.score ?? 0,
          metadata: r.metadata,
        };
      }),
    };
  },
});
