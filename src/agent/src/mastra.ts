import { Mastra } from "@mastra/core";
import { LibSQLStore } from "@mastra/libsql";
import { routerAgent, generalAgent, weatherAgent, memoryAgent } from "./agents/index.js";
import { logger } from "./logger.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getKnowledgeDocuments, getKnowledgeBaseThreadId } from "./mastra/tools/rag-tools.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// LibSQL storage for conversation threads
const storage = new LibSQLStore({
  id: "mastra-store",
  url:
    process.env.DATABASE_URL ||
    `file:${join(__dirname, "../../../data/app.db")}`,
});

logger.info("Initializing Mastra with agents and workflows");

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

logger.info("Mastra initialized successfully");

/**
 * Seed the knowledge base with general information
 * This runs when the server starts
 */
async function seedKnowledgeBase() {
  try {
    const threadId = getKnowledgeBaseThreadId();
    
    // Check if already seeded by querying storage
    const threads = await storage.listThreads({ 
      limit: 100 
    });
    
    const knowledgeThread = threads.data.find((t) => t.id === threadId);
    
    if (knowledgeThread) {
      logger.info("Knowledge base already seeded");
      return;
    }

    logger.info("Seeding knowledge base with general information...");

    // Get knowledge documents
    const knowledgeDocuments = getKnowledgeDocuments();

    // Create thread for knowledge base
    await storage.saveThread({
      id: threadId,
      title: "General Knowledge Base",
      resourceId: "system",
      metadata: { type: "knowledge-base" },
    });

    // Save each knowledge document as a message
    for (const doc of knowledgeDocuments) {
      // Generate safe ID by replacing spaces and special characters
      const safeId = `knowledge-${doc.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
      
      await storage.saveMessage({
        id: safeId,
        threadId,
        role: "system",
        content: `Topic: ${doc.topic}\n\n${doc.content}`,
        resourceId: "system",
      });
    }

    logger.info(`Knowledge base seeded with ${knowledgeDocuments.length} documents`);
  } catch (error) {
    logger.error("Failed to seed knowledge base:", error);
  }
}

// Seed knowledge base asynchronously
seedKnowledgeBase().catch((error) => {
  logger.error("Error in knowledge base seeding:", error);
});
