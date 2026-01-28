import { Mastra } from "@mastra/core";
import { routerAgent, generalAgent, weatherAgent } from "./agents/index.js";
import { logger } from "./logger.js";
import { vector } from "./rag.js";
import { storage } from "./memory.js";

logger.info("Initializing Mastra with agents and workflows");

// Create Mastra instance
export const mastra: Mastra = new Mastra({
  agents: {
    router: routerAgent,
    general: generalAgent,
    weather: weatherAgent,
  },
  storage, // Shared storage for conversation history and working memory
  vectors: {
    vector, // Vector store for RAG and semantic search
  },
  server: {
    port: Number(process.env.PORT) || 3000,
  },
});

logger.info("Mastra initialized successfully");
