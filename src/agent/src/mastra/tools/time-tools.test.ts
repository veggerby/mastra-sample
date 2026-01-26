import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getCurrentTimeUTCTool,
  convertUTCToTimezoneTool,
} from "./time-tools.js";

describe("Time Tools", () => {
  describe("getCurrentTimeUTCTool", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("should return current UTC time", async () => {
      const testDate = new Date("2026-01-26T12:30:45.000Z");
      vi.setSystemTime(testDate);

      const result = await getCurrentTimeUTCTool.execute!({});

      expect(result).toEqual({
        utcTime: "Mon, 26 Jan 2026 12:30:45 GMT",
        timestamp: testDate.getTime(),
        iso8601: "2026-01-26T12:30:45.000Z",
      });

      vi.useRealTimers();
    });

    it("should return a valid timestamp", async () => {
      vi.useRealTimers();
      const result = await getCurrentTimeUTCTool.execute!({});

      expect(typeof result.timestamp).toBe("number");
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.utcTime).toMatch(/GMT$/);
      expect(result.iso8601).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe("convertUTCToTimezoneTool", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("should convert UTC timestamp to specified timezone", async () => {
      const testDate = new Date("2026-01-26T12:00:00.000Z");
      vi.setSystemTime(testDate);

      const result = await convertUTCToTimezoneTool.execute!({
        utcTimestamp: testDate.getTime(),
        timezone: "America/New_York",
      });

      expect(result.timezone).toBe("America/New_York");
      expect(result.localTime).toContain("01/26/2026");
      expect(typeof result.offset).toBe("string");
      expect(result.iso8601).toContain("2026-01-26");

      vi.useRealTimers();
    });

    it("should use current time when timestamp is not provided", async () => {
      vi.useRealTimers();
      const result = await convertUTCToTimezoneTool.execute!({
        timezone: "Europe/Copenhagen",
      });

      expect(result.timezone).toBe("Europe/Copenhagen");
      expect(typeof result.localTime).toBe("string");
      expect(typeof result.offset).toBe("string");
    });

    it("should use local timezone when timezone is 'local'", async () => {
      vi.useRealTimers();
      const result = await convertUTCToTimezoneTool.execute!({
        timezone: "local",
      });

      const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      expect(result.timezone).toBe(localTz);
      expect(typeof result.localTime).toBe("string");
    });

    it("should handle invalid timezone gracefully", async () => {
      const testDate = new Date("2026-01-26T12:00:00.000Z");

      await expect(
        convertUTCToTimezoneTool.execute!({
          utcTimestamp: testDate.getTime(),
          timezone: "Invalid/Timezone",
        }),
      ).rejects.toThrow("Failed to convert timezone");

      vi.useRealTimers();
    });

    it("should convert to multiple different timezones correctly", async () => {
      const testDate = new Date("2026-01-26T12:00:00.000Z");
      vi.setSystemTime(testDate);

      const timezones = [
        "America/New_York",
        "Europe/London",
        "Asia/Tokyo",
        "Australia/Sydney",
      ];

      for (const tz of timezones) {
        const result = await convertUTCToTimezoneTool.execute!({
          utcTimestamp: testDate.getTime(),
          timezone: tz,
        });

        expect(result.timezone).toBe(tz);
        expect(result.localTime).toBeTruthy();
        expect(result.offset).toBeTruthy();
      }

      vi.useRealTimers();
    });
  });
});
