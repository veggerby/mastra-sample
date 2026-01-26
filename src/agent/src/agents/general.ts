import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { loadPersona } from "../mastra/factories.js";
import {
  getCurrentTimeUTCTool,
  convertUTCToTimezoneTool,
} from "../mastra/tools/time-tools.js";
import {
  convertUnitsToMetricTool,
  convertUnitsToImperialTool,
} from "../mastra/tools/unit-conversion-tools.js";
import {
  queryKnowledgeTool,
  addKnowledgeTool,
} from "../mastra/tools/rag-tools.js";

/**
 * General Agent - Handles general conversation and non-specialized queries
 * Equipped with time and unit conversion utilities, plus RAG knowledge base access
 */
const persona = loadPersona();

export const generalAgent = new Agent({
  id: "general",
  name: "general",
  instructions: `${persona.systemPrompt}

You have access to a knowledge base with information about:
- Mastra framework and its features
- AI agent best practices
- RAG (Retrieval-Augmented Generation) implementation
- TypeScript development patterns
- Vector databases and embeddings

When users ask about these topics, use the query-knowledge-base tool to retrieve 
accurate information before responding. This ensures your answers are grounded in 
factual knowledge rather than just your training data.`,
  model: openai("gpt-4o-mini"),
  tools: {
    "get-current-time-utc": getCurrentTimeUTCTool,
    "convert-utc-to-timezone": convertUTCToTimezoneTool,
    "convert-units-to-metric": convertUnitsToMetricTool,
    "convert-units-to-imperial": convertUnitsToImperialTool,
    "query-knowledge-base": queryKnowledgeTool,
    "add-knowledge": addKnowledgeTool,
  },
});
