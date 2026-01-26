import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { Memory } from "@mastra/memory";
import {
  queryKnowledgeTool,
  addKnowledgeTool,
} from "../mastra/tools/rag-tools.js";

/**
 * Memory-Enabled Agent - Demonstrates RAG capabilities with conversation memory
 * 
 * This agent showcases how to use @mastra/memory for:
 * - Persistent conversation history
 * - Working memory for context retention
 * - Semantic search across past conversations (when using vector storage)
 * - RAG-based knowledge retrieval from a seeded knowledge base
 */

// Initialize memory for this agent
const memory = new Memory();

export const memoryAgent = new Agent({
  id: "memory",
  name: "Memory Agent",
  instructions: `You are a helpful assistant with persistent memory and access to a knowledge base. You can:
- Remember past conversations and context from previous interactions
- Build upon previous knowledge shared in this thread
- Maintain working memory of key facts and preferences
- Query a knowledge base for accurate information about Mastra, AI agents, RAG, TypeScript, and vector databases
- Add new information to the knowledge base when you learn something valuable

When responding:
1. Reference relevant information from past conversations when appropriate
2. Build upon established context
3. Ask clarifying questions to improve your working memory
4. Use the knowledge base tools when users ask about technical topics
5. Provide accurate, grounded responses using retrieved information

Your goal is to provide increasingly personalized and context-aware responses over time, 
while leveraging the knowledge base for technical accuracy.`,
  model: openai("gpt-4o-mini"),
  memory,
  tools: {
    "query-knowledge-base": queryKnowledgeTool,
    "add-knowledge": addKnowledgeTool,
  },
});
