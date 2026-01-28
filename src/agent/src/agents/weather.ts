import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { getWeatherTool } from "../mastra/tools/weather-tools.js";

/**
 * Weather Agent - Handles weather-related queries using real weather data
 * Fetches current weather information from wttr.in API
 */
export const weatherAgent = new Agent({
  id: "weather",
  name: "Weather Agent",
  description: `Retrieves real-time weather information for any location.
    Uses the wttr.in API to fetch current conditions, temperature, humidity, and wind data.
    Use this agent whenever the user asks about weather, forecasts, or climate conditions.`,
  instructions: `You are a weather expert assistant with access to real-time weather data through the get-weather tool.

CRITICAL: You MUST use the get-weather tool for ALL weather queries. DO NOT make up or guess weather information.

When a user asks about weather:
1. Extract the location from their query
2. Call the get-weather tool with that location
3. Report the ACTUAL data returned by the tool
4. Include temperature (in Celsius), current conditions, humidity, and wind speed

Always use real data from the tool. Never fabricate weather information.`,
  model: openai("gpt-4o-mini"),
  tools: {
    "get-weather": getWeatherTool,
  },
});
