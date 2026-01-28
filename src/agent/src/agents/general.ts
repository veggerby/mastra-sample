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
import { queryKnowledgeTool } from "../mastra/tools/rag-tools.js";
import { createMemory } from "../memory.js";

/**
 * General Agent - Handles general conversation and non-specialized queries
 * Equipped with time and unit conversion utilities, plus RAG knowledge base access
 * Uses memory for conversation continuity and context retention
 */
const persona = loadPersona();

export const generalAgent: Agent = new Agent({
  id: "general",
  name: "General Agent",
  description: `Handles general conversation, greetings, and knowledge base queries.
    Equipped with tools for time operations (UTC time, timezone conversions),
    unit conversions (metric/imperial), and access to a RAG-based knowledge base.
    Use this agent for non-weather queries, including questions about stored information,
    time zones, unit conversions, and general assistance.`,
  instructions: `${persona.systemPrompt}

You have access to a knowledge base with information, as well as tools for getting the current time in UTC, converting UTC timestamps to specific timezones, and converting units between metric and imperial systems.

You also have memory capabilities:
- Recent conversation history for continuity
- Working memory to remember user preferences and facts
- Semantic recall to retrieve relevant past conversations

Use these capabilities to provide context-aware, personalized responses.
`,
  model: openai("gpt-4o-mini"),
  memory: createMemory(), // Default memory configuration
  tools: {
    "get-current-time-utc": getCurrentTimeUTCTool,
    "convert-utc-to-timezone": convertUTCToTimezoneTool,
    "convert-units-to-metric": convertUnitsToMetricTool,
    "convert-units-to-imperial": convertUnitsToImperialTool,
    "query-knowledge-base": queryKnowledgeTool,
  },
});
