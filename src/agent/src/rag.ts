import fs from "node:fs";
import { PgVector } from "@mastra/pg";
import { LibSQLVector } from "@mastra/libsql";
import { ModelRouterEmbeddingModel } from "@mastra/core/llm";
import { embedMany } from "ai";
import { MDocument } from "@mastra/rag";
import glob from "fast-glob";

import { logger } from "./logger.js";
import { config } from "./config.js";
import { join } from "node:path";

/**
 * RAG (Retrieval-Augmented Generation) Configuration for Mastra
 *
 * This module provides vector storage and embedding functionality for
 * semantic search across knowledge base documents.
 *
 * Supports two vector storage backends:
 * - PgVector (PostgreSQL extension): Production-ready with full ACID compliance
 * - LibSQLVector (LibSQL): Development-friendly, file-based SQLite with vector support
 *
 * The storage backend is automatically detected from DATABASE_URL:
 * - PostgreSQL: postgres://... or postgresql://...
 * - LibSQL: file:... or :memory:
 *
 * Features:
 * - Automatic document loading from knowledge base directory
 * - Document chunking with configurable strategies
 * - Embedding generation using OpenAI text-embedding-3-small (1536 dimensions)
 * - Vector indexing with cosine similarity
 * - Semantic search across knowledge base
 */

/**
 * Configuration options for RAG functionality
 */
export interface RAGConfig {
  /** Vector index name for knowledge base */
  indexName: string;
  /** Path to knowledge base directory containing markdown files */
  knowledgeBasePath: string;
  /** Database connection string */
  databaseUrl: string;
  /** Embedding model configuration */
  embeddingModel: {
    provider: string;
    model: string;
    dimension: number;
  };
  /** Document chunking configuration */
  chunking: {
    strategy:
      | "html"
      | "json"
      | "markdown"
      | "latex"
      | "recursive"
      | "character"
      | "token"
      | "sentence"
      | "semantic-markdown";
    maxSize: number;
    overlap: number;
  };
}

/**
 * Default RAG configuration options
 * These can be overridden via environment variables or function parameters
 */
export const defaultRAGConfig: RAGConfig = {
  indexName: "knowledgeBase",
  knowledgeBasePath: config.knowledgeBase.path,
  databaseUrl: config.database.vectorUrl,
  embeddingModel: {
    provider: "openai",
    model: "text-embedding-3-small",
    dimension: 1536,
  },
  chunking: {
    strategy: "recursive",
    maxSize: 2048,
    overlap: 50,
  },
};

/**
 * Load knowledge base documents from markdown files
 *
 * Scans the knowledge base directory for all .md files and converts them
 * to MDocument instances for processing and indexing.
 *
 * @param config - Optional RAG configuration overrides
 * @returns Array of MDocument instances
 *
 * Usage:
 * ```typescript
 * const documents = await getKnowledgeDocuments();
 * console.log(`Loaded ${documents.length} documents`);
 * ```
 */
export async function getKnowledgeDocuments(
  config: Partial<RAGConfig> = {},
): Promise<MDocument[]> {
  const knowledgeBasePath =
    config.knowledgeBasePath || defaultRAGConfig.knowledgeBasePath;

  const docs: MDocument[] = [];
  const files = glob.sync("**/*.md", {
    cwd: knowledgeBasePath,
  });

  for (const file of files) {
    const filePath = join(knowledgeBasePath, file);
    const content = fs.readFileSync(filePath, "utf-8");

    const doc = MDocument.fromMarkdown(content, {
      source: filePath,
    });

    docs.push(doc);
  }

  logger.info(`Loaded ${docs.length} documents from knowledge base`);
  return docs;
}

/**
 * Generate embeddings for text chunks using the configured embedding model
 *
 * @param chunks - Array of text chunks to generate embeddings for
 * @returns Array of embedding vectors (number arrays)
 *
 * Usage:
 * ```typescript
 * const chunks = [{ text: "Sample text 1" }, { text: "Sample text 2" }];
 * const embeddings = await generateEmbedding(chunks);
 * ```
 */
export async function generateEmbedding(
  chunks: Array<{ text: string }>,
): Promise<number[][]> {
  const { embeddings } = await embedMany({
    values: chunks.map((chunk) => chunk.text),
    model: embeddingModel,
  });

  return embeddings;
}

/**
 * Get the configured vector index name for the knowledge base
 *
 * @param config - Optional RAG configuration overrides
 * @returns Vector index name
 */
export function getKnowledgeIndexName(config: Partial<RAGConfig> = {}): string {
  return config.indexName || defaultRAGConfig.indexName;
}

/**
 * Create vector storage adapter based on database URL
 * - PostgreSQL: Uses PgVector for production-grade vector search
 * - LibSQL: Uses LibSQLVector for development (file-based SQLite)
 */
const createVector = async (connectionString: string) => {
  const isPgVector = connectionString.startsWith("postgres");

  const storage = isPgVector
    ? new PgVector({
        id: "vector", // Must match vectorStoreName in createVectorQueryTool
        connectionString,
      })
    : new LibSQLVector({
        id: "vector", // Must match vectorStoreName in createVectorQueryTool
        url: connectionString,
      });

  logger.info(
    `Vector storage initialized: ${isPgVector ? "PgVector" : "LibSQLVector"}`,
  );

  return storage;
};

/**
 * Shared vector storage instance for RAG functionality
 * Used by agents for semantic search across knowledge base
 */
export const vector = await createVector(config.database.vectorUrl);

/**
 * Create embedding model for generating text embeddings
 * Uses OpenAI's text-embedding-3-small model (1536 dimensions)
 */
const createEmbeddingModel = () =>
  new ModelRouterEmbeddingModel(
    `${defaultRAGConfig.embeddingModel.provider}/${defaultRAGConfig.embeddingModel.model}`,
  );

/**
 * Shared embedding model instance
 * Used for generating embeddings during indexing and querying
 */
export const embeddingModel = createEmbeddingModel();

/**
 * Generate a sample embedding for index validation
 *
 * Used to check if the vector index exists and has data by attempting
 * a query with a known embedding.
 *
 * @returns Sample embedding vector
 */
async function generateSampleEmbedding(): Promise<number[]> {
  const embeddings = await generateEmbedding([{ text: "sample" }]);
  return embeddings[0];
}

/**
 * Seed the vector database with knowledge base documents
 *
 * This function:
 * 1. Checks if the index already exists and has data
 * 2. Loads markdown documents from the knowledge base directory
 * 3. Chunks documents using the configured strategy
 * 4. Generates embeddings for all chunks
 * 5. Creates the vector index if needed
 * 6. Upserts chunks with their embeddings
 *
 * Runs automatically when the module is imported.
 *
 * @param config - Optional RAG configuration overrides
 *
 * Usage:
 * ```typescript
 * // Seed with default configuration
 * await seedVectorKnowledgeBase();
 *
 * // Seed with custom configuration
 * await seedVectorKnowledgeBase({
 *   indexName: "custom-index",
 *   chunking: { maxSize: 512, overlap: 100 }
 * });
 * ```
 */
export async function seedVectorKnowledgeBase(config: Partial<RAGConfig> = {}) {
  try {
    const indexName = getKnowledgeIndexName(config);
    const chunkingConfig = {
      ...defaultRAGConfig.chunking,
      ...config.chunking,
    };

    // Check if index already exists and has data
    try {
      const existingResults = await vector.query({
        indexName,
        queryVector: await generateSampleEmbedding(),
        topK: 1,
      });

      if (existingResults && existingResults.length > 0) {
        logger.info("Vector knowledge base already seeded");
        return;
      }
    } catch (error) {
      // Index doesn't exist yet, continue with seeding
      logger.info({ error }, "Creating new vector index for knowledge base");
    }

    logger.info("Seeding vector knowledge base with embeddings...");

    // Load knowledge documents
    const documents = await getKnowledgeDocuments(config);

    if (documents.length === 0) {
      logger.warn("No knowledge documents found to seed");
      return;
    }

    // Chunk documents for better retrieval
    const chunks = (
      await Promise.all(
        documents.map((doc) =>
          doc.chunk({
            strategy: "recursive" as const,
            maxSize: chunkingConfig.maxSize,
            overlap: chunkingConfig.overlap,
          }),
        ),
      )
    ).flat();

    logger.info(
      `Processing ${chunks.length} chunks from ${documents.length} documents`,
    );

    // Generate embeddings for all chunks
    const embeddings = await generateEmbedding(chunks);

    // Create index if it doesn't exist
    await vector.createIndex({
      indexName,
      dimension: embeddings[0].length,
      metric: "cosine",
    });

    // Prepare data for upsert: embeddings with content in metadata
    const records = embeddings.map((embedding, index) => ({
      id: `chunk-${index}`,
      vector: embedding,
      metadata: {
        content: chunks[index].text,
        source: chunks[index].metadata?.source || "unknown",
      },
    }));

    // Upsert chunks with embeddings and metadata (content stored in metadata)
    await vector.upsert({
      indexName,
      vectors: records.map((r) => r.vector),
      metadata: records.map((r) => r.metadata),
      ids: records.map((r) => r.id),
    });

    logger.info(
      `Vector knowledge base seeded successfully: ${chunks.length} chunks indexed`,
    );
  } catch (error) {
    logger.error({ error }, "Failed to seed vector knowledge base");
    throw error;
  }
}

/**
 * Initialize knowledge base seeding
 *
 * This runs automatically when the module is imported, seeding the vector
 * database asynchronously in the background.
 */
logger.info(
  "Initializing vector knowledge base seeding in the background on module load",
);

setImmediate(() => {
  seedVectorKnowledgeBase().catch((error) => {
    logger.error(
      { error },
      "Error during vector knowledge base initialization",
    );
  });
});
