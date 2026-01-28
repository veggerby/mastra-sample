import { createVectorQueryTool } from "@mastra/rag";
import { embeddingModel, getKnowledgeIndexName } from "../../rag.js";
import { Tool } from "@mastra/core/tools";

/**
 * RAG Query Tool - Search the knowledge base using semantic vector search
 *
 * This tool uses Mastra's built-in vector query capabilities:
 * - Automatically generates embeddings for queries
 * - Performs semantic similarity search in the vector store
 * - Supports both pgvector (PostgreSQL) and LibSQL vector stores
 * - Can use metadata filtering for advanced queries
 * - Optional re-ranking for improved relevance
 *
 * The tool name and description are crafted to help the agent understand
 * when to use this retrieval capability.
 */
export const queryKnowledgeTool: Tool = createVectorQueryTool({
  vectorStoreName: "vector", // Must match the vector store name in Mastra config
  indexName: getKnowledgeIndexName(),
  model: embeddingModel,
  // Database-specific configurations
  databaseConfig: {
    // pgvector-specific options (when using PostgreSQL)
    pgvector: {
      minScore: 0.5, // Filter results below this similarity threshold
      // ef: 200, // HNSW search parameter for accuracy/speed tradeoff
      // probes: 10, // IVFFlat probe parameter
    },
    // LibSQL-specific options
    // libsql: { },
  },
});
