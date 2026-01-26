import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

/**
 * Router Agent - Analyzes user intent and delegates to specialized agents
 */
export const routerAgent = new Agent({
  id: "router",
  name: "router",
  instructions: `You are a routing agent that delegates to specialized agents based on user requests.

When a user asks a question:
1. Determine which specialized agent can best handle it
2. Immediately delegate to that agent using the network
3. Return the agent's response directly

Available agents in your network:
- general: For general conversation, greetings, and non-specialized queries
- weather: For weather-related questions, forecasts, and climate information

Always use the appropriate agent from your network to answer questions. Do not just say you will route - actually delegate to the agent.`,
  model: openai("gpt-4o-mini"),
});
