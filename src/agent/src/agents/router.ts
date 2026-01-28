import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { generalAgent } from "./general.js";
import { weatherAgent } from "./weather.js";
import { createMemory } from "../memory.js";

/**
 * Router Agent - Network coordinator that delegates to specialized agents
 *
 * Uses Mastra's agent network pattern to intelligently route requests to:
 * - General agent: Conversation, knowledge base queries, time/unit tools
 * - Weather agent: Real-time weather data and forecasts
 */
export const routerAgent = new Agent({
  id: "router",
  name: "Router Agent",
  description: `Coordinates a network of specialized agents to handle diverse user requests.
    Routes queries to the appropriate agent based on context and intent.
    Manages general conversation, weather queries, time operations, unit conversions,
    and knowledge base access.`,
  instructions: `You are a network coordinator managing specialized agents.

Your network includes:
- A general conversation agent with knowledge base access, time tools, and unit conversion tools
- A weather agent with real-time weather data

Your job is to:
1. Understand the user's request
2. Delegate to the appropriate agent or tool
3. Return complete, well-formatted responses

Always respond with complete information—no bullet points unless specifically requested.
Write in full paragraphs for explanations.
Do not answer with incomplete or uncertain information.`,
  model: openai("gpt-4o-mini"),
  agents: {
    general: generalAgent,
    weather: weatherAgent,
  },
  memory: createMemory(),
});
