#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import readline from "node:readline";
import { MastraClient } from "@mastra/client-js";

const program = new Command();
const API_BASE_URL = process.env.API_URL || "http://localhost:3000";

// Initialize Mastra Client
const mastraClient = new MastraClient({
  baseUrl: API_BASE_URL,
});

program
  .name("mastra-cli")
  .description("CLI for interacting with Mastra agents via Mastra Client SDK")
  .version("0.1.0");

// Chat with an agent
program
  .command("chat")
  .description("Start an interactive chat session with an agent")
  .argument(
    "[agent]",
    "Agent to chat with (general, weather, router)",
    "router",
  )
  .option(
    "-m, --message <message>",
    "Send a single message instead of interactive mode",
  )
  .option("-t, --thread <threadId>", "Thread ID to continue conversation")
  .option("-s, --stream", "Enable streaming responses for real-time output")
  .action(
    async (
      agentName: string,
      options: { message?: string; thread?: string; stream?: boolean },
    ) => {
      const threadId = options.thread || `cli-${Date.now()}`;
      const useStreaming = options.stream ?? true; // Default to streaming

      if (options.message) {
        // Single message mode
        console.log(`\n💬 Sending to ${agentName}...`);
        try {
          const agent = mastraClient.getAgent(agentName);

          if (useStreaming) {
            // Streaming mode
            process.stdout.write(`\n🤖 ${agentName}: `);
            const stream = await agent.stream(options.message, {
              resourceId: threadId,
            });

            const toolsUsed = new Set<string>();
            await stream.processDataStream({
              onChunk: async (chunk) => {
                if (chunk.type === "text-delta" && chunk.payload?.text) {
                  process.stdout.write(chunk.payload.text);
                } else if (
                  chunk.type === "tool-call" &&
                  chunk.payload?.toolName
                ) {
                  toolsUsed.add(chunk.payload.toolName);
                } else if (chunk.type === "step-finish" && toolsUsed.size > 0) {
                  process.stdout.write(
                    `\n   🔧 [Tools: ${Array.from(toolsUsed).join(", ")}]`,
                  );
                }
              },
            });
            console.log(`\n\n📋 Thread ID: ${threadId}`);
          } else {
            // Non-streaming mode
            const response = await agent.generate(options.message, {
              resourceId: threadId,
            });
            console.log(`\n🤖 ${agentName}:`, response.text);
            console.log(`\n📋 Thread ID: ${threadId}`);
          }
        } catch (error) {
          console.error(
            "\n❌ Error:",
            error instanceof Error ? error.message : error,
          );
          process.exit(1);
        }
      } else {
        // Interactive mode
        console.log(`\n🤖 Starting chat with ${agentName} agent`);
        console.log(`📋 Thread ID: ${threadId}`);
        console.log(
          `${useStreaming ? "🌊 Streaming mode enabled" : "📝 Standard mode"}\n`,
        );
        console.log(
          'Type your message and press Enter. Type "exit" or "quit" to end.\n',
        );

        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          prompt: "You: ",
        });

        rl.prompt();

        rl.on("line", async (line) => {
          const input = line.trim();

          if (input === "exit" || input === "quit") {
            console.log("\n👋 Goodbye!");
            rl.close();
            process.exit(0);
          }

          if (!input) {
            rl.prompt();
            return;
          }

          try {
            const agent = mastraClient.getAgent(agentName);

            if (useStreaming) {
              // Streaming mode for interactive chat
              process.stdout.write(`\n🤖 ${agentName}: `);
              const stream = await agent.stream(input, {
                resourceId: threadId,
              });

              const toolsUsed = new Set<string>();
              await stream.processDataStream({
                onChunk: async (chunk) => {
                  if (chunk.type === "text-delta" && chunk.payload?.text) {
                    process.stdout.write(chunk.payload.text);
                  } else if (
                    chunk.type === "tool-call" &&
                    chunk.payload?.toolName
                  ) {
                    toolsUsed.add(chunk.payload.toolName);
                  } else if (
                    chunk.type === "step-finish" &&
                    toolsUsed.size > 0
                  ) {
                    process.stdout.write(
                      `\n   🔧 [Tools: ${Array.from(toolsUsed).join(", ")}]`,
                    );
                  }
                },
              });
              console.log("\n");
            } else {
              // Non-streaming mode
              const response = await agent.generate(input, {
                resourceId: threadId,
              });
              console.log(`\n🤖 ${agentName}:`, response.text, "\n");
            }
          } catch (error) {
            console.error(
              "\n❌ Error:",
              error instanceof Error ? error.message : error,
            );
          }

          rl.prompt();
        });
      }
    },
  );

// Get weather
program
  .command("weather")
  .description("Get weather information for a location")
  .argument("<location>", "City or location")
  .option("-f, --forecast", "Include multi-day forecast")
  .option("-d, --days <number>", "Number of forecast days", "3")
  .action(
    async (
      location: string,
      options: { forecast?: boolean; days?: string },
    ) => {
      console.log(`\n🌤️  Getting weather for ${location}...`);

      try {
        const message = `What's the weather in ${location}${options.forecast ? " with forecast" : ""}?`;
        const agent = mastraClient.getAgent("weather");
        const response = await agent.generate(message, {
          resourceId: `weather-${Date.now()}`,
        });

        console.log(`\n${response.text}\n`);
      } catch (error) {
        console.error(
          "❌ Error:",
          error instanceof Error ? error.message : error,
        );
        process.exit(1);
      }
    },
  );

// List agents
program
  .command("list")
  .description("List all available agents")
  .action(async () => {
    try {
      // Use fetch for listing since SDK doesn't expose this
      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const result = await response.json();
      console.log("\n🤖 Available agents:\n");
      if (Array.isArray(result)) {
        result.forEach((agent: { name?: string; id?: string }) => {
          console.log(`  • ${agent.name || agent.id}`);
        });
      } else {
        // Fallback to known agents
        console.log("  • router");
        console.log("  • general");
        console.log("  • weather");
      }
      console.log();
    } catch (_error) {
      console.log("\n🤖 Available agents:\n");
      console.log("  • router");
      console.log("  • general");
      console.log("  • weather");
      console.log();
    }
  });

// Get agent info
program
  .command("info")
  .description("Get detailed information about an agent")
  .argument("<agent>", "Agent name")
  .action(async (agentName: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/agents/${agentName}`);
      const result = await response.json();
      console.log(`\n🤖 Agent: ${agentName}\n`);
      console.log(JSON.stringify(result, null, 2));
      console.log();
    } catch (error) {
      console.error(`❌ Agent '${agentName}' not found or error occurred`);
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Server status check
program
  .command("status")
  .description("Check if the Mastra API server is running")
  .option("-p, --port <port>", "Port number", process.env.PORT || "3000")
  .action(async (options: { port: string }) => {
    const baseUrl = `http://localhost:${options.port}`;
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Server is running");
        console.log(`🌐 API: ${baseUrl}/api`);
        console.log("Status:", data);
      } else {
        console.log("⚠️  Server responded but not healthy");
      }
    } catch (_error) {
      console.log("❌ Server is not running");
      console.log(`Run 'npm run dev:agent' to start the server`);
    }
  });

// Run a workflow
program
  .command("workflow")
  .description("Execute a workflow")
  .argument("<name>", "Workflow name")
  .option("-i, --input <json>", "Input data as JSON string", "{}")
  .action(async (workflowName: string, options: { input: string }) => {
    console.log(`\n⚙️  Running workflow: ${workflowName}`);

    try {
      const input = JSON.parse(options.input);
      const response = await fetch(
        `${API_BASE_URL}/api/workflows/${workflowName}/execute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ triggerData: input }),
        },
      );
      const result = await response.json();

      console.log("\n✅ Workflow completed");
      console.log("\nResult:");
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error("❌ Invalid JSON input");
      } else {
        console.error(
          "❌ Error executing workflow:",
          error instanceof Error ? error.message : error,
        );
      }
      process.exit(1);
    }
  });

program.parse();
