import { describe, it, expect } from "vitest";
import { memoryAgent } from "./memory-agent.js";

describe("Memory Agent", () => {
  it("should be defined with correct properties", () => {
    expect(memoryAgent).toBeDefined();
    expect(memoryAgent.id).toBe("memory");
    expect(memoryAgent.name).toBe("Memory Agent");
  });

  it("should be an Agent instance", () => {
    // Memory agent should be an instance of Agent
    expect(memoryAgent.constructor.name).toBe("Agent");
  });

  it("should have instructions for memory-aware behavior", async () => {
    const instructions = await memoryAgent.getInstructions({});
    
    expect(instructions).toContain("memory");
    expect(instructions).toContain("conversation");
  });
});
