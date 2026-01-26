import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { Memory } from "@mastra/memory";

/**
 * Memory-Enabled Agent - Demonstrates RAG capabilities with conversation memory
 * 
 * This agent showcases how to use @mastra/memory for:
 * - Persistent conversation history
 * - Working memory for context retention
 * - Semantic search across past conversations (when using vector storage)
 */

// Initialize memory for this agent
const memory = new Memory();

export const memoryAgent = new Agent({
  id: "memory",
  name: "Memory Agent",
  instructions: `You are a helpful assistant with persistent memory. You can:
- Remember past conversations and context from previous interactions
- Build upon previous knowledge shared in this thread
- Maintain working memory of key facts and preferences

When responding:
1. Reference relevant information from past conversations when appropriate
2. Build upon established context
3. Ask clarifying questions to improve your working memory

Your goal is to provide increasingly personalized and context-aware responses over time.`,
  model: openai("gpt-4o-mini"),
  memory,
});
