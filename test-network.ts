#!/usr/bin/env tsx
/**
 * Test script to verify agent network routing
 * Run with: tsx test-network.ts
 */
import { config } from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, ".env") });

import { routerAgent } from "./src/agent/src/agents/router.js";

async function testNetwork() {
  console.log("🧪 Testing Agent Network Routing\n");

  const tests = [
    {
      name: "General conversation",
      query: "Hello! How are you?",
      expectedAgent: "general",
    },
    {
      name: "Weather query",
      query: "What's the weather in London?",
      expectedAgent: "weather",
    },
    {
      name: "Time query",
      query: "What time is it in UTC?",
      expectedAgent: "general",
    },
    {
      name: "Knowledge base query",
      query: "Tell me about the Quantum Flux Capacitor",
      expectedAgent: "general (RAG)",
    },
    {
      name: "Unit conversion",
      query: "Convert 100 kilometers to miles",
      expectedAgent: "general",
    },
  ];

  for (const test of tests) {
    console.log(`\n📝 Test: ${test.name}`);
    console.log(`   Query: "${test.query}"`);
    console.log(`   Expected routing: ${test.expectedAgent}`);
    console.log(`\n   Executing...`);

    try {
      const stream = await routerAgent.network(test.query);

      let agentCalled = "unknown";
      let finalResult = "";

      for await (const chunk of stream) {
        console.log(`   Event: ${chunk.type}`);

        // Track which agent was called
        if (chunk.type === "agent-execution-start") {
          agentCalled = chunk.payload.agentId || "unknown";
        }

        // Capture final result
        if (chunk.type === "network-execution-event-step-finish") {
          finalResult = chunk.payload.result || "";
        }
      }

      console.log(`\n   ✅ Routed to: ${agentCalled}`);
      console.log(`   Response preview: ${finalResult.substring(0, 100)}...`);
    } catch (error) {
      console.error(`   ❌ Error:`, error);
    }
  }

  console.log("\n\n✨ Network testing complete!");
  process.exit(0);
}

testNetwork();
