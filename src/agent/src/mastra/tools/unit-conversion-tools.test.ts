import { describe, it, expect } from "vitest";
import {
  convertUnitsToMetricTool,
  convertUnitsToImperialTool,
} from "./unit-conversion-tools.js";

describe("Unit Conversion Tools", () => {
  describe("convertUnitsToMetricTool", () => {
    it("should convert Fahrenheit to Celsius", async () => {
      const result = await convertUnitsToMetricTool.execute!({
        value: 32,
        unit: "fahrenheit",
      });

      expect(result.originalValue).toBe(32);
      expect(result.originalUnit).toBe("fahrenheit");
      expect(result.convertedValue).toBe(0);
      expect(result.convertedUnit).toBe("celsius");
      expect(result.formula).toBeTruthy();
    });

    it("should convert 212°F to 100°C (boiling point)", async () => {
      const result = await convertUnitsToMetricTool.execute!({
        value: 212,
        unit: "fahrenheit",
      });

      expect(result.convertedValue).toBe(100);
      expect(result.convertedUnit).toBe("celsius");
    });

    it("should convert miles to kilometers", async () => {
      const result = await convertUnitsToMetricTool.execute!({
        value: 10,
        unit: "miles",
      });

      expect(result.originalValue).toBe(10);
      expect(result.originalUnit).toBe("miles");
      expect(result.convertedValue).toBeCloseTo(16.09, 1);
      expect(result.convertedUnit).toBe("kilometers");
    });

    it("should convert pounds to kilograms", async () => {
      const result = await convertUnitsToMetricTool.execute!({
        value: 100,
        unit: "pounds",
      });

      expect(result.originalValue).toBe(100);
      expect(result.convertedValue).toBeCloseTo(45.36, 1);
      expect(result.convertedUnit).toBe("kilograms");
    });

    it("should convert ounces to grams", async () => {
      const result = await convertUnitsToMetricTool.execute!({
        value: 1,
        unit: "ounces",
      });

      expect(result.convertedValue).toBeCloseTo(28.35, 1);
      expect(result.convertedUnit).toBe("grams");
    });

    it("should convert gallons to liters", async () => {
      const result = await convertUnitsToMetricTool.execute!({
        value: 5,
        unit: "gallons",
      });

      expect(result.convertedValue).toBeCloseTo(18.93, 1);
      expect(result.convertedUnit).toBe("liters");
    });

    it("should convert feet to meters", async () => {
      const result = await convertUnitsToMetricTool.execute!({
        value: 10,
        unit: "feet",
      });

      expect(result.convertedValue).toBeCloseTo(3.05, 1);
      expect(result.convertedUnit).toBe("meters");
    });

    it("should convert inches to centimeters", async () => {
      const result = await convertUnitsToMetricTool.execute!({
        value: 12,
        unit: "inches",
      });

      expect(result.convertedValue).toBeCloseTo(30.48, 1);
      expect(result.convertedUnit).toBe("centimeters");
    });

    it("should convert yards to meters", async () => {
      const result = await convertUnitsToMetricTool.execute!({
        value: 100,
        unit: "yards",
      });

      expect(result.convertedValue).toBeCloseTo(91.44, 1);
      expect(result.convertedUnit).toBe("meters");
    });

    it("should round to 2 decimal places", async () => {
      const result = await convertUnitsToMetricTool.execute!({
        value: 1.234567,
        unit: "miles",
      });

      const decimalPlaces =
        result.convertedValue.toString().split(".")[1]?.length || 0;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });

  describe("convertUnitsToImperialTool", () => {
    it("should convert Celsius to Fahrenheit", async () => {
      const result = await convertUnitsToImperialTool.execute!({
        value: 0,
        unit: "celsius",
      });

      expect(result.originalValue).toBe(0);
      expect(result.originalUnit).toBe("celsius");
      expect(result.convertedValue).toBe(32);
      expect(result.convertedUnit).toBe("fahrenheit");
      expect(result.formula).toBeTruthy();
    });

    it("should convert 100°C to 212°F (boiling point)", async () => {
      const result = await convertUnitsToImperialTool.execute!({
        value: 100,
        unit: "celsius",
      });

      expect(result.convertedValue).toBe(212);
      expect(result.convertedUnit).toBe("fahrenheit");
    });

    it("should convert kilometers to miles", async () => {
      const result = await convertUnitsToImperialTool.execute!({
        value: 16.09,
        unit: "kilometers",
      });

      expect(result.convertedValue).toBeCloseTo(10, 0);
      expect(result.convertedUnit).toBe("miles");
    });

    it("should convert kilograms to pounds", async () => {
      const result = await convertUnitsToImperialTool.execute!({
        value: 45.36,
        unit: "kilograms",
      });

      expect(result.convertedValue).toBeCloseTo(100, 0);
      expect(result.convertedUnit).toBe("pounds");
    });

    it("should convert grams to ounces", async () => {
      const result = await convertUnitsToImperialTool.execute!({
        value: 28.35,
        unit: "grams",
      });

      expect(result.convertedValue).toBeCloseTo(1, 0);
      expect(result.convertedUnit).toBe("ounces");
    });

    it("should convert liters to gallons", async () => {
      const result = await convertUnitsToImperialTool.execute!({
        value: 18.93,
        unit: "liters",
      });

      expect(result.convertedValue).toBeCloseTo(5, 0);
      expect(result.convertedUnit).toBe("gallons");
    });

    it("should convert meters to feet", async () => {
      const result = await convertUnitsToImperialTool.execute!({
        value: 3.05,
        unit: "meters",
      });

      expect(result.convertedValue).toBeCloseTo(10, 0);
      expect(result.convertedUnit).toBe("feet");
    });

    it("should convert centimeters to inches", async () => {
      const result = await convertUnitsToImperialTool.execute!({
        value: 30.48,
        unit: "centimeters",
      });

      expect(result.convertedValue).toBeCloseTo(12, 0);
      expect(result.convertedUnit).toBe("inches");
    });

    it("should round to 2 decimal places", async () => {
      const result = await convertUnitsToImperialTool.execute!({
        value: 1.234567,
        unit: "kilometers",
      });

      const decimalPlaces =
        result.convertedValue.toString().split(".")[1]?.length || 0;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it("should handle negative temperatures", async () => {
      const result = await convertUnitsToImperialTool.execute!({
        value: -40,
        unit: "celsius",
      });

      expect(result.convertedValue).toBe(-40); // -40°C = -40°F
      expect(result.convertedUnit).toBe("fahrenheit");
    });
  });

  describe("Bidirectional conversion accuracy", () => {
    it("should maintain accuracy when converting back and forth (temperature)", async () => {
      const original = 25;

      const toImperial = await convertUnitsToImperialTool.execute!({
        value: original,
        unit: "celsius",
      });

      const backToMetric = await convertUnitsToMetricTool.execute!({
        value: toImperial.convertedValue,
        unit: "fahrenheit",
      });

      expect(backToMetric.convertedValue).toBeCloseTo(original, 0);
    });

    it("should maintain accuracy when converting back and forth (distance)", async () => {
      const original = 100;

      const toMetric = await convertUnitsToMetricTool.execute!({
        value: original,
        unit: "miles",
      });

      const backToImperial = await convertUnitsToImperialTool.execute!({
        value: toMetric.convertedValue,
        unit: "kilometers",
      });

      expect(backToImperial.convertedValue).toBeCloseTo(original, 0);
    });
  });
});
