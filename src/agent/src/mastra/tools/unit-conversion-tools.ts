import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const convertUnitsToMetricTool = createTool({
  id: "convert-units-to-metric",
  description:
    "Convert imperial units to metric units (e.g., Fahrenheit to Celsius, miles to kilometers, pounds to kilograms)",
  inputSchema: z.object({
    value: z.number().describe("The numeric value to convert"),
    unit: z
      .enum([
        "fahrenheit",
        "miles",
        "pounds",
        "ounces",
        "gallons",
        "feet",
        "inches",
        "yards",
      ])
      .describe("The imperial unit to convert from"),
  }),
  outputSchema: z.object({
    originalValue: z.number(),
    originalUnit: z.string(),
    convertedValue: z.number(),
    convertedUnit: z.string(),
    formula: z.string(),
  }),
  execute: async (inputData) => {
    const { value, unit } = inputData;
    let convertedValue: number;
    let convertedUnit: string;
    let formula: string;

    switch (unit) {
      case "fahrenheit":
        convertedValue = ((value - 32) * 5) / 9;
        convertedUnit = "celsius";
        formula = "(°F - 32) × 5/9 = °C";
        break;
      case "miles":
        convertedValue = value * 1.60934;
        convertedUnit = "kilometers";
        formula = "miles × 1.60934 = km";
        break;
      case "pounds":
        convertedValue = value * 0.453592;
        convertedUnit = "kilograms";
        formula = "lb × 0.453592 = kg";
        break;
      case "ounces":
        convertedValue = value * 28.3495;
        convertedUnit = "grams";
        formula = "oz × 28.3495 = g";
        break;
      case "gallons":
        convertedValue = value * 3.78541;
        convertedUnit = "liters";
        formula = "gal × 3.78541 = L";
        break;
      case "feet":
        convertedValue = value * 0.3048;
        convertedUnit = "meters";
        formula = "ft × 0.3048 = m";
        break;
      case "inches":
        convertedValue = value * 2.54;
        convertedUnit = "centimeters";
        formula = "in × 2.54 = cm";
        break;
      case "yards":
        convertedValue = value * 0.9144;
        convertedUnit = "meters";
        formula = "yd × 0.9144 = m";
        break;
    }

    return {
      originalValue: value,
      originalUnit: unit,
      convertedValue: Math.round(convertedValue * 100) / 100,
      convertedUnit,
      formula,
    };
  },
});

export const convertUnitsToImperialTool = createTool({
  id: "convert-units-to-imperial",
  description:
    "Convert metric units to imperial units (e.g., Celsius to Fahrenheit, kilometers to miles, kilograms to pounds)",
  inputSchema: z.object({
    value: z.number().describe("The numeric value to convert"),
    unit: z
      .enum([
        "celsius",
        "kilometers",
        "kilograms",
        "grams",
        "liters",
        "meters",
        "centimeters",
      ])
      .describe("The metric unit to convert from"),
  }),
  outputSchema: z.object({
    originalValue: z.number(),
    originalUnit: z.string(),
    convertedValue: z.number(),
    convertedUnit: z.string(),
    formula: z.string(),
  }),
  execute: async (inputData) => {
    const { value, unit } = inputData;
    let convertedValue: number;
    let convertedUnit: string;
    let formula: string;

    switch (unit) {
      case "celsius":
        convertedValue = (value * 9) / 5 + 32;
        convertedUnit = "fahrenheit";
        formula = "(°C × 9/5) + 32 = °F";
        break;
      case "kilometers":
        convertedValue = value / 1.60934;
        convertedUnit = "miles";
        formula = "km ÷ 1.60934 = miles";
        break;
      case "kilograms":
        convertedValue = value / 0.453592;
        convertedUnit = "pounds";
        formula = "kg ÷ 0.453592 = lb";
        break;
      case "grams":
        convertedValue = value / 28.3495;
        convertedUnit = "ounces";
        formula = "g ÷ 28.3495 = oz";
        break;
      case "liters":
        convertedValue = value / 3.78541;
        convertedUnit = "gallons";
        formula = "L ÷ 3.78541 = gal";
        break;
      case "meters":
        convertedValue = value / 0.3048;
        convertedUnit = "feet";
        formula = "m ÷ 0.3048 = ft";
        break;
      case "centimeters":
        convertedValue = value / 2.54;
        convertedUnit = "inches";
        formula = "cm ÷ 2.54 = in";
        break;
    }

    return {
      originalValue: value,
      originalUnit: unit,
      convertedValue: Math.round(convertedValue * 100) / 100,
      convertedUnit,
      formula,
    };
  },
});
