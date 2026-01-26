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

/**
 * General Agent - Handles general conversation and non-specialized queries
 * Equipped with time and unit conversion utilities
 */
const persona = loadPersona();

export const generalAgent = new Agent({
  id: "general",
  name: "general",
  instructions: persona.systemPrompt,
  model: openai("gpt-4o-mini"),
  tools: {
    "get-current-time-utc": getCurrentTimeUTCTool,
    "convert-utc-to-timezone": convertUTCToTimezoneTool,
    "convert-units-to-metric": convertUnitsToMetricTool,
    "convert-units-to-imperial": convertUnitsToImperialTool,
  },
});
