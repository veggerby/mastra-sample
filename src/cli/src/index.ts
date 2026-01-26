#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import readline from "node:readline";

const program = new Command();
const API_BASE_URL = process.env.API_URL || "http://localhost:3000";

// Type for API responses
interface AgentResponse {
  text?: string;
  content?: string;
  response?: string;
  message?: string;
}

program
  .name("mastra-cli")
  .description("CLI for interacting with Mastra agents via API")
  .version("0.1.0");

// Helper function to make API requests
async function apiRequest(
  endpoint: string,
  options: RequestInit = {},
): Promise<AgentResponse> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API request failed: ${response.status} - ${error}`);
  }

  return response.json() as Promise<AgentResponse>;
}

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
  .action(
    async (
      agentName: string,
      options: { message?: string; thread?: string },
    ) => {
      const threadId = options.thread || `cli-${Date.now()}`;

      if (options.message) {
        // Single message mode
        console.log(`\n💬 Sending to ${agentName}...`);
        try {
          const result = await apiRequest(`/api/agents/${agentName}/generate`, {
            method: "POST",
            body: JSON.stringify({
              messages: [{ role: "user", content: options.message }],
              resourceid: threadId,
            }),
          });

          // Extract text from Mastra response
          const responseText =
            result.text ||
            result.content ||
            result.response ||
            JSON.stringify(result);
          console.log(`\n🤖 ${agentName}:`, responseText);
          console.log(`\n📋 Thread ID: ${threadId}`);
        } catch (error) {
          console.error(
            "❌ Error:",
            error instanceof Error ? error.message : error,
          );
          process.exit(1);
        }
      } else {
        // Interactive mode
        console.log(`\n🤖 Starting chat with ${agentName} agent`);
        console.log(`📋 Thread ID: ${threadId}`);
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
            const result = await apiRequest(
              `/api/agents/${agentName}/generate`,
              {
                method: "POST",
                body: JSON.stringify({
                  messages: [{ role: "user", content: input }],
                  resourceid: threadId,
                }),
              },
            );

            // Extract text from Mastra response
            const responseText =
              result.text ||
              result.content ||
              result.response ||
              JSON.stringify(result);
            console.log(`\n🤖 ${agentName}:`, responseText, "\n");
          } catch (error) {
            console.error(
              "❌ Error:",
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
        const result = await apiRequest("/api/agents/weather/generate", {
          method: "POST",
          body: JSON.stringify({
            messages: [{ role: "user", content: message }],
            threadId: `weather-${Date.now()}`,
          }),
        });

        console.log(`\n${result.text || result.message}\n`);
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
      // Try to get agent list from API
      const result = await apiRequest("/api/agents");
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
      const result = await apiRequest(`/api/agents/${agentName}`);
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
      const result = await apiRequest(
        `/api/workflows/${workflowName}/execute`,
        {
          method: "POST",
          body: JSON.stringify({ triggerData: input }),
        },
      );

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
