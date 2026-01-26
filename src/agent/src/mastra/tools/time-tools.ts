import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const getCurrentTimeUTCTool = createTool({
  id: "get-current-time-utc",
  description: "Get the current date and time in UTC format",
  inputSchema: z.object({}),
  outputSchema: z.object({
    utcTime: z.string(),
    timestamp: z.number(),
    iso8601: z.string(),
  }),
  execute: async () => {
    const now = new Date();
    return {
      utcTime: now.toUTCString(),
      timestamp: now.getTime(),
      iso8601: now.toISOString(),
    };
  },
});

export const convertUTCToTimezoneTool = createTool({
  id: "convert-utc-to-timezone",
  description:
    "Convert a UTC timestamp to a specific timezone. Supports IANA timezone names like 'America/New_York', 'Europe/Copenhagen', 'Asia/Tokyo', etc.",
  inputSchema: z.object({
    utcTimestamp: z
      .number()
      .optional()
      .describe(
        "UTC timestamp in milliseconds. If not provided, uses current time.",
      ),
    timezone: z
      .string()
      .default("local")
      .describe(
        "IANA timezone name (e.g., 'America/New_York', 'Europe/Copenhagen') or 'local' for system timezone",
      ),
  }),
  outputSchema: z.object({
    localTime: z.string(),
    timezone: z.string(),
    offset: z.string(),
    iso8601: z.string(),
  }),
  execute: async (inputData) => {
    const { utcTimestamp, timezone } = inputData;
    const date = utcTimestamp ? new Date(utcTimestamp) : new Date();

    // Determine the timezone to use
    const tz =
      timezone === "local"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : timezone;

    try {
      // Format the time in the target timezone
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZoneName: "short",
      });

      const localTime = formatter.format(date);

      // Get the timezone offset
      const offsetFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        timeZoneName: "longOffset",
      });
      const offsetParts = offsetFormatter.formatToParts(date);
      const offsetPart = offsetParts.find(
        (part) => part.type === "timeZoneName",
      );
      const offset = offsetPart ? offsetPart.value : "Unknown";

      // Get ISO string in the target timezone
      const iso8601 = date
        .toLocaleString("sv-SE", { timeZone: tz })
        .replace(" ", "T");

      return {
        localTime,
        timezone: tz,
        offset,
        iso8601: `${iso8601}`,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to convert timezone: ${message}. Please check the timezone name.`,
      );
    }
  },
});
