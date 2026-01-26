import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * RAG Knowledge Base
 * 
 * This module provides tools for Retrieval-Augmented Generation (RAG)
 * with a seeded general knowledge base.
 * 
 * The knowledge base is stored in the mastra instance storage and uses
 * a shared thread ID for all general knowledge.
 */

// Knowledge base thread ID for general knowledge
const KNOWLEDGE_BASE_THREAD_ID = "general-knowledge-base";

// Knowledge documents to seed the knowledge base
const KNOWLEDGE_DOCUMENTS = [
  {
    topic: "Mastra Framework",
    content: `Mastra is a TypeScript framework for building AI agents and workflows. 
It provides built-in support for:
- Multi-agent architectures with routing capabilities
- Memory and RAG (Retrieval-Augmented Generation) for persistent context
- MCP (Model Context Protocol) integration for external tool capabilities
- Workflows for multi-step orchestrations
- LibSQL storage for development and PostgreSQL for production
- Support for multiple LLM providers including OpenAI, Anthropic, and Google

Key features include type-safe agent definitions, tool creation with Zod schemas, 
and flexible storage backends.`,
  },
  {
    topic: "AI Agent Best Practices",
    content: `Best practices for building AI agents:
1. Use clear and specific instructions to guide agent behavior
2. Implement proper error handling and fallback mechanisms
3. Design tools with well-defined input/output schemas using Zod
4. Use memory for maintaining context across conversations
5. Implement routing patterns to delegate to specialized agents
6. Test agents thoroughly with various inputs and edge cases
7. Monitor token usage and costs in production
8. Implement rate limiting and request throttling
9. Use structured outputs when precise data formats are needed
10. Keep agent responsibilities focused and well-defined`,
  },
  {
    topic: "RAG Implementation",
    content: `Retrieval-Augmented Generation (RAG) enhances AI responses by:
- Retrieving relevant context from a knowledge base
- Using vector embeddings for semantic similarity search
- Combining retrieved information with LLM generation
- Reducing hallucinations by grounding responses in facts

Implementation steps:
1. Chunk documents into manageable pieces (256-1024 tokens)
2. Generate embeddings using models like text-embedding-3-small
3. Store embeddings in a vector database (pgvector, Pinecone, etc.)
4. Query with semantic search at inference time
5. Include retrieved context in the prompt
6. Generate responses based on both context and user query

Use pgvector with PostgreSQL for production RAG systems.`,
  },
  {
    topic: "TypeScript Development",
    content: `TypeScript best practices:
- Enable strict mode for better type safety
- Use Zod for runtime validation of external data
- Prefer interfaces for object types, types for unions
- Use const assertions for literal types
- Implement proper error handling with typed errors
- Use ES modules (import/export) over CommonJS
- Leverage generics for reusable, type-safe code
- Document complex types and functions
- Use .js extensions in imports for ESM compatibility`,
  },
  {
    topic: "Vector Databases",
    content: `Vector databases store and query high-dimensional embeddings:

Popular options:
- pgvector: PostgreSQL extension, good for existing PostgreSQL setups
- Pinecone: Managed service, easy to use, good for production
- Weaviate: Open source, feature-rich
- Qdrant: Fast, written in Rust
- Milvus: Scalable, good for large datasets

Key concepts:
- Embeddings: Dense vector representations of text/data
- Similarity search: Find vectors closest to a query vector
- Indexing: HNSW, IVF for fast approximate nearest neighbor search
- Distance metrics: Cosine similarity, Euclidean distance, dot product

pgvector is recommended for this project as it integrates seamlessly 
with PostgreSQL and supports HNSW indexing for fast queries.`,
  },
];

/**
 * Get seeded knowledge documents for initialization
 */
export function getKnowledgeDocuments() {
  return KNOWLEDGE_DOCUMENTS;
}

/**
 * Get the knowledge base thread ID
 */
export function getKnowledgeBaseThreadId() {
  return KNOWLEDGE_BASE_THREAD_ID;
}

/**
 * RAG Query Tool - Search the knowledge base for relevant information
 * 
 * Note: This tool requires the agent to have memory configured to function properly.
 */
export const queryKnowledgeTool = createTool({
  id: "query-knowledge-base",
  description: `Search the general knowledge base for information about Mastra framework, 
AI agent best practices, RAG implementation, TypeScript development, and vector databases. 
Use this when you need to provide accurate information about these topics.`,
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The search query to find relevant information in the knowledge base",
      ),
    limit: z
      .number()
      .min(1)
      .max(10)
      .default(3)
      .describe("Maximum number of relevant results to return"),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        content: z.string(),
        relevance: z.string(),
      }),
    ),
    summary: z.string(),
  }),
  execute: async ({ query, limit = 3 }, context) => {
    try {
      // Access memory from the agent context
      const agent = context?.agent;
      if (!agent || !agent.memory) {
        throw new Error(
          "This tool requires an agent with memory configured. " +
            "Please ensure the agent has a Memory instance attached.",
        );
      }

      // Query the knowledge base through the agent's memory
      const { messages } = await agent.memory.recall({
        threadId: KNOWLEDGE_BASE_THREAD_ID,
        vectorSearchString: query,
        limit,
      });

      if (messages.length === 0) {
        return {
          results: [],
          summary: "No relevant information found in the knowledge base.",
        };
      }

      // Format results
      const results = messages.map((msg) => {
        // Safely handle content that might not be a string
        const content = typeof msg.content === "string" 
          ? msg.content 
          : JSON.stringify(msg.content);
        
        return {
          content,
          relevance: "high", // Note: Actual relevance scoring would require similarity scores from vector search
        };
      });

      const summary = `Found ${results.length} relevant result(s) from the knowledge base.`;

      return {
        results,
        summary,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to query knowledge base: ${message}`);
    }
  },
});

/**
 * Add Knowledge Tool - Add new information to the knowledge base
 * 
 * Note: This tool requires the agent to have memory configured to function properly.
 */
export const addKnowledgeTool = createTool({
  id: "add-knowledge",
  description: `Add new information to the general knowledge base. Use this to expand 
the knowledge base with new facts, documentation, or learned information.`,
  inputSchema: z.object({
    topic: z.string().describe("The topic or category of the knowledge"),
    content: z.string().describe("The information to add to the knowledge base"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ topic, content }, context) => {
    try {
      // Access memory from the agent context
      const agent = context?.agent;
      if (!agent || !agent.memory) {
        throw new Error(
          "This tool requires an agent with memory configured. " +
            "Please ensure the agent has a Memory instance attached.",
        );
      }

      await agent.memory.saveMessages({
        messages: [
          {
            role: "system",
            content: `Topic: ${topic}\n\n${content}`,
            threadId: KNOWLEDGE_BASE_THREAD_ID,
          },
        ],
      });

      return {
        success: true,
        message: `Successfully added knowledge about "${topic}" to the knowledge base.`,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to add knowledge: ${message}`,
      };
    }
  },
});
