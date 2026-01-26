/**
 * Alternative Mastra configuration using PostgreSQL with pgvector
 * 
 * This file demonstrates how to switch from LibSQL to PostgreSQL
 * for production deployments with semantic search capabilities.
 * 
 * To use this configuration:
 * 1. Set up PostgreSQL with pgvector extension (see MEMORY.md)
 * 2. Update DATABASE_URL in .env to point to PostgreSQL
 * 3. Replace imports in src/index.ts to use this file
 */

import { Mastra } from "@mastra/core";
import { PGStore } from "@mastra/pg";
import { routerAgent, generalAgent, weatherAgent, memoryAgent } from "./agents/index.js";
import { logger } from "./logger.js";

// PostgreSQL storage with pgvector support for semantic search
const storage = new PGStore({
  connectionString: process.env.DATABASE_URL || 
    "postgresql://postgres:password@localhost:5432/mastra",
});

logger.info("Initializing Mastra with PostgreSQL + pgvector storage");

// Create Mastra instance
export const mastra = new Mastra({
  agents: {
    router: routerAgent,
    general: generalAgent,
    weather: weatherAgent,
    memory: memoryAgent,
  },
  storage,
  server: {
    port: Number(process.env.PORT) || 3000,
  },
});

logger.info("Mastra initialized successfully with PostgreSQL storage");
