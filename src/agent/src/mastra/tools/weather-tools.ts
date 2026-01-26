import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const getWeatherTool = createTool({
  id: "get-weather",
  description: "Get current weather information for a specific location",
  inputSchema: z.object({
    location: z
      .string()
      .describe("City name or location (e.g., 'Billund, Denmark' or 'London')"),
    units: z
      .enum(["metric", "imperial"])
      .default("metric")
      .describe("Temperature units"),
  }),
  outputSchema: z.object({
    location: z.string(),
    temperature: z.number(),
    condition: z.string(),
    humidity: z.number().optional(),
    windSpeed: z.number().optional(),
    forecast: z.string().optional(),
  }),
  execute: async (inputData) => {
    const { location, units } = inputData;

    try {
      // Use wttr.in API - free weather service
      const unitParam = units === "imperial" ? "u" : "m";
      const response = await fetch(
        `https://wttr.in/${encodeURIComponent(location)}?format=j1&${unitParam}`,
      );

      if (!response.ok) {
        throw new Error(`Weather API returned ${response.status}`);
      }

      const data = (await response.json()) as {
        current_condition: Array<{
          temp_C: string;
          weatherDesc: Array<{ value: string }>;
          humidity: string;
          windspeedKmph: string;
        }>;
        nearest_area: Array<{
          areaName: Array<{ value: string }>;
          country: Array<{ value: string }>;
        }>;
        weather: Array<{
          hourly: Array<{ weatherDesc: Array<{ value: string }> }>;
        }>;
      };
      const current = data.current_condition[0];
      const area = data.nearest_area[0];

      return {
        location: `${area.areaName[0].value}, ${area.country[0].value}`,
        temperature: parseFloat(current.temp_C),
        condition: current.weatherDesc[0].value,
        humidity: parseFloat(current.humidity),
        windSpeed: parseFloat(current.windspeedKmph),
        forecast:
          data.weather[0]?.hourly[0]?.weatherDesc[0]?.value ||
          "No forecast available",
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch weather data: ${message}`);
    }
  },
});
