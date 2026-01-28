import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LibSQLStore } from "@mastra/libsql";
import { PostgresStore } from "@mastra/pg";
import { Memory } from "@mastra/memory";

import { logger } from "./logger.js";
import { vector } from "./rag.js";

// Load environment variables (may already be loaded by rag.ts)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "../../../.env") });

/**
 * Memory Configuration for Mastra
 *
 * This module provides a consistent approach to memory storage,
 * similar to how RAG/vector storage is configured.
 *
 * Supports two storage backends:
 * - PostgreSQL (via @mastra/pg): Production-ready with full ACID compliance
 * - LibSQL (via @mastra/libsql): Development-friendly, file-based SQLite
 *
 * The storage backend is automatically detected from DATABASE_URL:
 * - PostgreSQL: postgres://... or postgresql://...
 * - LibSQL: file:... or :memory:
 *
 * Memory features enabled:
 * - Message history: Recent conversation context (lastMessages)
 * - Working memory: Persistent user-specific data
 * - Semantic recall: Vector search across past conversations (optional)
 * - Thread title generation: Automatic descriptive titles
 */

/**
 * Options for configuring Memory instances
 * Matches Mastra's MemoryConfig structure
 */
export interface MemoryConfig {
  /**
   * Number of recent messages to include in context
   */
  lastMessages?: number;

  /**
   * Working memory configuration for persistent user-specific data
   */
  workingMemory?: {
    enabled: boolean;
    maxTokens?: number;
  };

  /**
   * Semantic recall: Enable vector-based message retrieval
   * - true: Enable with default settings
   * - object: Configure with topK and messageRange (both required), minScore optional
   */
  semanticRecall?:
    | boolean
    | {
        topK: number;
        messageRange: number | { before: number; after: number };
        minScore?: number;
      };

  /**
   * Thread title generation configuration
   */
  generateTitle?: {
    model: string;
    instructions: string;
  };
}

const databaseUrl =
  process.env.DATABASE_URL ||
  `file:${join(__dirname, "../../../data/memory.db")}`;

/**
 * Create storage adapter based on database URL
 * - PostgreSQL: Uses PostgresStore for full ACID compliance and better performance
 * - LibSQL: Uses LibSQLStore for development (file-based SQLite)
 */
const createStorage = async (connectionString: string) => {
  const isPgStore = connectionString.startsWith("postgres");

  const storage = isPgStore
    ? new PostgresStore({
        id: "mastra-storage",
        connectionString,
        // Optional: Configure connection pool for PostgreSQL
        max: 20, // Maximum number of connections
        idleTimeoutMillis: 30000, // How long a connection can sit idle
        // ssl: { rejectUnauthorized: false }, // Uncomment for SSL
      })
    : new LibSQLStore({
        id: "mastra-storage",
        url: connectionString,
      });

  logger.info(
    `Memory storage initialized: ${isPgStore ? "PostgreSQL" : "LibSQL"}`,
  );

  return storage;
};

/**
 * Shared storage instance for all agents
 * Configure at the Mastra level for shared storage across agents
 *
 * This storage handles:
 * - Conversation threads and messages
 * - Workflow snapshots
 * - Evaluation datasets
 * - Traces and observability data
 */
export const storage = await createStorage(databaseUrl);

/**
 * Default memory configuration options
 * These can be overridden per agent for specialized needs
 */
export const defaultMemoryOptions: MemoryConfig = {
  // Message History: Number of recent messages to include in context
  lastMessages: 20,

  // Working Memory: Enable persistent user-specific data storage
  workingMemory: {
    enabled: true,
    maxTokens: 2000, // Reserve 2000 tokens for working memory
  },

  // Thread Title Generation: Auto-generate descriptive titles
  generateTitle: {
    model: "openai/gpt-4o-mini", // Smaller model for cost efficiency
    instructions:
      "Generate a concise, descriptive title (5-7 words) based on the user's first message. Focus on the main topic or question.",
  },
};

/**
 * Create a Memory instance with default configuration
 *
 * Usage:
 * ```typescript
 * import { createMemory } from "./memory";
 *
 * const agent = new Agent({
 *   id: "my-agent",
 *   memory: createMemory(),
 * });
 * ```
 *
 * For custom configuration:
 * ```typescript
 * const agent = new Agent({
 *   id: "my-agent",
 *   memory: createMemory({
 *     lastMessages: 50,
 *     semanticRecall: { topK: 10, minScore: 0.6 },
 *   }),,
 * });
 * ```
 */
export function createMemory(options?: Partial<MemoryConfig>): Memory {
  return new Memory({
    storage,
    vector, // Use shared vector store for semantic recall
    options: {
      ...defaultMemoryOptions,
      ...options,
    },
  });
}

/**
 * Create a Memory instance with semantic recall enabled
 *
 * This is a convenience function for agents that need vector-based
 * retrieval across conversation history.
 *
 * Usage:
 * ```typescript
 * import { createMemoryWithSemanticRecall } from "./memory";
 *
 * const agent = new Agent({
 *   id: "my-agent",
 *   memory: createMemoryWithSemanticRecall(),
 * });
 * ```
 */
export function createMemoryWithSemanticRecall(
  options?: Partial<MemoryConfig>,
): Memory {
  return new Memory({
    storage,
    vector, // Required for semantic recall
    options: {
      ...defaultMemoryOptions,
      semanticRecall: {
        topK: 5,
        messageRange: 1,
        minScore: 0.5,
        ...((typeof options?.semanticRecall === "object" &&
          options?.semanticRecall) ||
          {}),
      },
      ...options,
    },
  });
}

/**
 * Default memory instance for backward compatibility
 * Prefer using createMemory() or createMemoryWithSemanticRecall() for new agents
 */
export const memory = createMemory();

/**
 * Create a basic Memory instance (message history only)
 * Useful for simple agents that don't need advanced memory features
 *
 * @param lastMessages - Number of recent messages to retain (default: 20)
 *
 * Usage:
 * ```typescript
 * const agent = new Agent({
 *   id: "simple-agent",
 *   memory: createBasicMemory(30),
 * });
 * ```
 */
export function createBasicMemory(lastMessages: number = 20): Memory {
  return new Memory({
    storage,
    vector,
    options: {
      lastMessages,
    },
  });
}

/**
 * Create an advanced Memory instance with all features enabled
 * Best for complex agents that need full context awareness
 *
 * @param options - Optional configuration overrides
 *
 * Usage:
 * ```typescript
 * const agent = new Agent({
 *   id: "advanced-agent",
 *   memory: createAdvancedMemory({
 *     lastMessages: 30,
 *     workingMemory: { enabled: true, maxTokens: 3000 },
 *     semanticRecall: { topK: 8, minScore: 0.65 }
 *   }),
 * });
 * ```
 */
export function createAdvancedMemory(options?: Partial<MemoryConfig>): Memory {
  return new Memory({
    storage,
    vector,
    options: {
      lastMessages: 50,
      workingMemory: {
        enabled: true,
        maxTokens: 4000,
      },
      semanticRecall: {
        topK: 10,
        messageRange: 2,
        minScore: 0.6,
        ...((typeof options?.semanticRecall === "object" &&
          options?.semanticRecall) ||
          {}),
      },
      generateTitle: {
        model: "openai/gpt-4o-mini",
        instructions:
          "Generate a concise, descriptive title (5-7 words) based on the user's first message. Focus on the main topic or question.",
      },
      ...options,
    },
  });
}
