#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import readline from "node:readline";
import { MastraClient } from "@mastra/client-js";
import chalk from "chalk";
import ora from "ora";
import boxen from "boxen";
import cliWidth from "cli-width";
import { Marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { config } from "./config.js";

// Configure marked for terminal output
const marked = new Marked();
marked.use(
  markedTerminal({
    firstHeading: chalk.bold.cyan,
    heading: chalk.bold.yellow,
    blockquote: chalk.gray.italic,
    code: chalk.green,
    codespan: chalk.cyan,
    strong: chalk.bold.white,
    em: chalk.italic,
    listitem: (text: string) => `  • ${text}`,
    link: chalk.blue.underline,
    href: chalk.blue.underline,
    paragraph: (text: string) => `${text}\n`,
    width: Math.min(cliWidth(), 100),
  }) as any,
);

/**
 * Type definition for workflow execution result
 * This matches the structure returned by Mastra Client SDK's startAsync method
 */
interface WorkflowExecutionResult {
  status?: string;
  steps?: unknown[];
  input?: unknown;
  result?: {
    summary?: string;
    report?: string;
    [key: string]: unknown;
  };
  error?:
    | {
        message?: string;
        [key: string]: unknown;
      }
    | string;
  [key: string]: unknown;
}

const program = new Command();

// Initialize Mastra Client
const mastraClient = new MastraClient({
  baseUrl: config.api.baseUrl,
});

// Helper function to create a nice header
function showHeader(title: string, subtitle?: string, showConfig = false) {
  const width = Math.min(cliWidth(), 80);
  let content = subtitle
    ? `${chalk.bold.cyan(title)}\n${chalk.dim(subtitle)}`
    : chalk.bold.cyan(title);

  // Optionally add config info
  if (showConfig) {
    const configLines: string[] = [];
    configLines.push(chalk.dim.gray(`API: ${config.api.baseUrl}`));

    const debugFlags: string[] = [];
    if (config.debug.showChunks) debugFlags.push("CHUNKS");
    if (config.debug.showTools) debugFlags.push("TOOLS");

    if (debugFlags.length > 0) {
      configLines.push(chalk.dim.yellow(`Debug: ${debugFlags.join(", ")}`));
    }

    if (configLines.length > 0) {
      content += "\n" + chalk.dim("─".repeat(Math.min(width - 4, 56)));
      content += "\n" + configLines.join(" • ");
    }
  }

  console.log(
    boxen(content, {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: "round",
      borderColor: "cyan",
      width: Math.min(width, 60),
    }),
  );
}

// Helper function to format agent responses (renders markdown)
function formatResponse(_agentName: string, text: string) {
  try {
    // Render markdown to terminal-friendly format
    return marked.parse(text) as string;
  } catch (error) {
    // Fallback to plain text if markdown parsing fails
    return text;
  }
}

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
        const spinner = ora({
          text: chalk.cyan(`Connecting to ${chalk.bold(agentName)} agent...`),
          spinner: "dots",
        }).start();

        try {
          const agent = mastraClient.getAgent(agentName);
          spinner.succeed(chalk.green(`Connected to ${chalk.bold(agentName)}`));

          if (useStreaming) {
            // Streaming mode
            console.log(chalk.dim("─".repeat(Math.min(cliWidth(), 80))));
            process.stdout.write(chalk.blue.bold(`\n${agentName}:\n\n`));
            const stream = await agent.stream(options.message, {
              resourceId: threadId,
            });

            await stream.processDataStream({
              onChunk: async (chunk) => {
                // Debug: log chunk types (can remove later)
                if (config.debug.showChunks) {
                  const toolName =
                    "payload" in chunk &&
                    chunk.payload &&
                    typeof chunk.payload === "object" &&
                    "toolName" in chunk.payload
                      ? chunk.payload.toolName
                      : "N/A";
                  console.log(
                    chalk.gray(
                      `\n[DEBUG] Chunk type: ${chunk.type}, toolName: ${toolName}`,
                    ),
                  );
                  if (chunk.type === "tool-call" && "payload" in chunk) {
                    console.log(
                      chalk.gray(
                        `[DEBUG] Chunk payload: ${JSON.stringify(chunk.payload, null, 2)}`,
                      ),
                    );
                  }
                }

                if (chunk.type === "text-delta" && chunk.payload?.text) {
                  process.stdout.write(chunk.payload.text);
                } else if (
                  chunk.type === "tool-call" &&
                  chunk.payload?.toolName
                ) {
                  // Differentiate between agent delegation and actual tool usage
                  const toolName = chunk.payload.toolName;
                  const args = (chunk.payload as any)?.args;

                  if (toolName.startsWith("agent-")) {
                    process.stdout.write(
                      chalk.dim(
                        `\n   ${chalk.cyan("➤")} ${chalk.italic("Delegating to:")} ${chalk.cyan(toolName.replace("agent-", ""))}\n\n`,
                      ),
                    );
                  } else {
                    let toolDisplay = `\n   ${chalk.yellow("⚡")} ${chalk.italic("Using tool:")} ${chalk.yellow(toolName)}`;

                    // Show tool arguments if available and DEBUG_TOOLS is set
                    if (config.debug.showTools && args) {
                      toolDisplay += chalk.dim(
                        `\n      Args: ${JSON.stringify(args, null, 2).split("\n").join("\n      ")}`,
                      );
                    }

                    toolDisplay += "\n\n";
                    process.stdout.write(chalk.dim(toolDisplay));
                  }
                } else if (
                  chunk.type === "tool-result" &&
                  (chunk.payload as any)?.result
                ) {
                  // Show tool results if DEBUG_TOOLS is enabled
                  if (config.debug.showTools) {
                    const result = (chunk.payload as any).result;
                    const resultStr =
                      typeof result === "string"
                        ? result
                        : JSON.stringify(result, null, 2);
                    process.stdout.write(
                      chalk.dim(
                        `\n   ${chalk.green("✓")} ${chalk.italic("Tool result:")}\n      ${resultStr.split("\n").join("\n      ")}\n\n`,
                      ),
                    );
                  }
                } else if (
                  chunk.type === "reasoning-delta" &&
                  chunk.payload?.text
                ) {
                  // Show reasoning in a subtle way
                  process.stdout.write(chalk.dim.italic(chunk.payload.text));
                } else if (chunk.type === "reasoning-start") {
                  process.stdout.write(
                    chalk.dim(
                      `\n\n   ${chalk.magenta("🧠")} ${chalk.italic("Thinking...")}\n\n`,
                    ),
                  );
                }
              },
            });

            console.log("\n");
            console.log(chalk.dim("─".repeat(Math.min(cliWidth(), 80))));
            console.log(chalk.dim(`💾 Thread: ${threadId}`));
            console.log();
          } else {
            // Non-streaming mode
            const response = await agent.generate(options.message, {
              resourceId: threadId,
            });
            console.log(chalk.dim("─".repeat(Math.min(cliWidth(), 80))));
            console.log(chalk.blue.bold(`\n${agentName}:\n`));
            console.log(formatResponse(agentName, response.text));
            console.log();
            console.log(chalk.dim("─".repeat(Math.min(cliWidth(), 80))));
            console.log(chalk.dim(`💾 Thread: ${threadId}`));
            console.log();
          }
        } catch (error) {
          spinner.fail(chalk.red.bold("Connection failed"));
          console.error(
            chalk.red.bold("\n✖ Error:"),
            chalk.red(error instanceof Error ? error.message : error),
          );
          process.exit(1);
        }
      } else {
        // Interactive mode
        showHeader(
          `🤖 Chat with ${agentName}`,
          `${useStreaming ? "🌊 Streaming mode" : "📝 Standard mode"} • Thread: ${threadId.slice(0, 16)}...`,
          true, // Show config info
        );

        console.log(chalk.dim("  💡 Tips:"));
        console.log(chalk.dim("     • Type your message and press Enter"));
        console.log(chalk.dim('     • Type "exit" or "quit" to end'));
        console.log(chalk.dim("     • Press Ctrl+C to cancel\n"));

        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          prompt: chalk.green.bold("You ➤ "),
        });

        rl.prompt();

        rl.on("line", async (line) => {
          const input = line.trim();

          if (input === "exit" || input === "quit") {
            console.log();
            console.log(
              boxen(chalk.cyan.bold("👋 Thanks for chatting!"), {
                padding: { left: 2, right: 2, top: 0, bottom: 0 },
                borderStyle: "round",
                borderColor: "cyan",
              }),
            );
            console.log();
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
              console.log(chalk.dim("─".repeat(Math.min(cliWidth(), 80))));
              process.stdout.write(chalk.blue.bold(`\n${agentName}:\n\n`));
              const stream = await agent.stream(input, {
                resourceId: threadId,
              });

              await stream.processDataStream({
                onChunk: async (chunk) => {
                  if (chunk.type === "text-delta" && chunk.payload?.text) {
                    process.stdout.write(chunk.payload.text);
                  } else if (
                    chunk.type === "tool-call" &&
                    chunk.payload?.toolName
                  ) {
                    // Differentiate between agent delegation and actual tool usage
                    const toolName = chunk.payload.toolName;
                    const args = (chunk.payload as any)?.args;

                    if (toolName.startsWith("agent-")) {
                      process.stdout.write(
                        chalk.dim(
                          `\n\n   ${chalk.cyan("➤")} ${chalk.italic("Delegating to:")} ${chalk.cyan(toolName.replace("agent-", ""))}\n\n`,
                        ),
                      );
                    } else {
                      let toolDisplay = `\n\n   ${chalk.yellow("⚡")} ${chalk.italic("Using tool:")} ${chalk.yellow(toolName)}`;

                      // Show tool arguments if available and DEBUG_TOOLS is set
                      if (config.debug.showTools && args) {
                        toolDisplay += chalk.dim(
                          `\n      Args: ${JSON.stringify(args, null, 2).split("\n").join("\n      ")}`,
                        );
                      }

                      toolDisplay += "\n\n";
                      process.stdout.write(chalk.dim(toolDisplay));
                    }
                  } else if (
                    chunk.type === "tool-result" &&
                    (chunk.payload as any)?.result
                  ) {
                    // Show tool results if DEBUG_TOOLS is enabled
                    if (config.debug.showTools) {
                      const result = (chunk.payload as any).result;
                      const resultStr =
                        typeof result === "string"
                          ? result
                          : JSON.stringify(result, null, 2);
                      process.stdout.write(
                        chalk.dim(
                          `\n   ${chalk.green("✓")} ${chalk.italic("Tool result:")}\n      ${resultStr.split("\n").join("\n      ")}\n\n`,
                        ),
                      );
                    }
                  } else if (
                    chunk.type === "reasoning-delta" &&
                    chunk.payload?.text
                  ) {
                    // Show reasoning in a subtle way
                    process.stdout.write(chalk.dim.italic(chunk.payload.text));
                  } else if (chunk.type === "reasoning-start") {
                    process.stdout.write(
                      chalk.dim(
                        `\n\n   ${chalk.magenta("🧠")} ${chalk.italic("Thinking...")}\n\n`,
                      ),
                    );
                  }
                },
              });

              console.log("\n");
              console.log(chalk.dim("─".repeat(Math.min(cliWidth(), 80))));
              console.log();
            } else {
              // Non-streaming mode
              const response = await agent.generate(input, {
                resourceId: threadId,
              });
              console.log(chalk.dim("─".repeat(Math.min(cliWidth(), 80))));
              console.log(chalk.blue.bold(`\n${agentName}:\n`));
              console.log(formatResponse(agentName, response.text));
              console.log();
              console.log(chalk.dim("─".repeat(Math.min(cliWidth(), 80))));
              console.log();
            }
          } catch (error) {
            console.error(
              chalk.red.bold("\n✖ Error:"),
              chalk.red(error instanceof Error ? error.message : error),
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
      const spinner = ora({
        text: chalk.cyan(`Getting weather for ${chalk.bold(location)}...`),
        spinner: "weather",
      }).start();

      try {
        const message = `What's the weather in ${location}${options.forecast ? " with forecast" : ""}?`;
        const agent = mastraClient.getAgent("weather");
        const response = await agent.generate(message, {
          resourceId: `weather-${Date.now()}`,
        });

        spinner.succeed(chalk.green(`Weather for ${chalk.bold(location)}`));
        console.log();
        console.log(chalk.dim("─".repeat(Math.min(cliWidth(), 80))));
        console.log();
        console.log(formatResponse("weather", response.text));
        console.log();
        console.log(chalk.dim("─".repeat(Math.min(cliWidth(), 80))));
        console.log();
      } catch (error) {
        spinner.fail(chalk.red.bold("Failed to get weather"));
        console.error(
          chalk.red.bold("✖ Error:"),
          chalk.red(error instanceof Error ? error.message : error),
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
      const spinner = ora("Loading agents...").start();
      // Use fetch for listing since SDK doesn't expose this
      const response = await fetch(`${config.api.baseUrl}/api/agents`);
      const result = await response.json();
      spinner.stop();

      showHeader("🤖 Available Agents", "Choose an agent for your task");

      if (Array.isArray(result)) {
        result.forEach((agent: { name?: string; id?: string }) => {
          console.log(chalk.cyan(`  ● ${chalk.bold(agent.name || agent.id)}`));
        });
      } else {
        // Fallback to known agents
        console.log(
          chalk.cyan(
            `  ● ${chalk.bold("router")} ${chalk.dim("- Intelligent task routing")}`,
          ),
        );
        console.log(
          chalk.cyan(
            `  ● ${chalk.bold("general")} ${chalk.dim("- General conversation & knowledge")}`,
          ),
        );
        console.log(
          chalk.cyan(
            `  ● ${chalk.bold("weather")} ${chalk.dim("- Weather information")}`,
          ),
        );
      }
      console.log();
    } catch (_error) {
      showHeader("🤖 Available Agents", "Choose an agent for your task");
      console.log(
        chalk.cyan(
          `  ● ${chalk.bold("router")} ${chalk.dim("- Intelligent task routing")}`,
        ),
      );
      console.log(
        chalk.cyan(
          `  ● ${chalk.bold("general")} ${chalk.dim("- General conversation & knowledge")}`,
        ),
      );
      console.log(
        chalk.cyan(
          `  ● ${chalk.bold("weather")} ${chalk.dim("- Weather information")}`,
        ),
      );
      console.log();
    }
  });

// Get agent info
program
  .command("info")
  .description("Get detailed information about an agent")
  .argument("<agent>", "Agent name")
  .action(async (agentName: string) => {
    const spinner = ora(`Loading ${agentName} agent info...`).start();
    try {
      const response = await fetch(
        `${config.api.baseUrl}/api/agents/${agentName}`,
      );
      const result = await response.json();
      spinner.succeed(chalk.green(`Agent info for ${chalk.bold(agentName)}`));

      console.log();
      console.log(chalk.dim("─".repeat(Math.min(cliWidth(), 80))));
      console.log(chalk.gray(JSON.stringify(result, null, 2)));
      console.log(chalk.dim("─".repeat(Math.min(cliWidth(), 80))));
      console.log();
    } catch (error) {
      spinner.fail(chalk.red.bold(`Agent '${agentName}' not found`));
      console.error(
        chalk.red("Error:"),
        chalk.red(error instanceof Error ? error.message : error),
      );
      process.exit(1);
    }
  });

// Server status check
program
  .command("status")
  .description("Check if the Mastra API server is running")
  .option("-p, --port <port>", "Port number", String(config.api.port))
  .action(async (options: { port: string }) => {
    const baseUrl = `http://localhost:${options.port}`;
    const spinner = ora("Checking server status...").start();

    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        const data = await response.json();
        spinner.succeed(chalk.green.bold("✅ Server is running"));

        console.log(
          boxen(
            chalk.cyan(`🌐 API: ${chalk.bold(baseUrl + "/api")}\n`) +
              chalk.dim(`Status: ${JSON.stringify(data)}`),
            {
              padding: 1,
              margin: { top: 0, bottom: 1 },
              borderStyle: "round",
              borderColor: "green",
            },
          ),
        );
      } else {
        spinner.warn(chalk.yellow.bold("⚠️  Server responded but not healthy"));
      }
    } catch (_error) {
      spinner.fail(chalk.red.bold("✖ Server is not running"));
      console.log();
      console.log(
        chalk.dim(
          `  Run ${chalk.cyan("npm run dev:agent")} to start the server`,
        ),
      );
      console.log();
    }
  });

// Run a workflow
program
  .command("workflow")
  .description("Execute a workflow")
  .argument("<name>", "Workflow name to execute")
  .option(
    "-t, --topic <topic>",
    "Research topic (for research-report workflow)",
  )
  .option(
    "-r, --max-results <number>",
    "Maximum number of results (default: 3)",
    "3",
  )
  .option(
    "-i, --input <json>",
    "Input data as JSON string (overrides other options)",
  )
  .action(
    async (
      workflowName: string,
      options: {
        topic?: string;
        maxResults: string;
        input?: string;
      },
    ) => {
      showHeader(`🔄 Workflow: ${workflowName}`);

      // Prepare input data
      let inputData: Record<string, unknown>;
      if (options.input) {
        try {
          inputData = JSON.parse(options.input);
        } catch (error) {
          console.error(chalk.red("✖ Invalid JSON input"));
          process.exit(1);
        }
      } else if (options.topic) {
        // Convenience options for research-report workflow
        inputData = {
          topic: options.topic,
          maxResults: parseInt(options.maxResults, 10),
        };
      } else {
        console.error(
          chalk.red(
            "✖ Please provide either --topic or --input with workflow data",
          ),
        );
        console.log(
          chalk.dim(
            '\nExample: workflow researchReport --topic "graviton wave theory"',
          ),
        );
        console.log(
          chalk.dim(
            'Example: workflow researchReport --input \'{"topic": "quantum flux capacitor", "maxResults": 5}\'',
          ),
        );
        process.exit(1);
      }

      console.log(chalk.dim(`\n📋 Input data:`));
      console.log(chalk.gray(JSON.stringify(inputData, null, 2)));
      console.log();

      // Execute workflow using Mastra Client SDK
      const spinner = ora({
        text: chalk.cyan("Executing workflow..."),
        spinner: "dots",
      }).start();

      try {
        // Use Mastra Client SDK to execute workflow
        const workflow = mastraClient.getWorkflow(workflowName);
        const run = await workflow.createRun();

        // Use startAsync to wait for workflow completion
        // Using unknown to handle the complex type from Mastra SDK
        const result = (await run.startAsync({
          inputData,
        })) as unknown as WorkflowExecutionResult;

        spinner.succeed(chalk.green.bold("✅ Workflow completed"));
        console.log();
        console.log(chalk.cyan.bold("📄 Result:"));
        console.log(chalk.dim("─".repeat(Math.min(cliWidth(), 80))));

        // Extract the workflow output from the result
        // startAsync returns { status, steps, input, result }
        // The workflow output is in result.result
        const workflowOutput = result?.result;

        if (workflowOutput?.summary && workflowOutput?.report) {
          // Success case - we have the expected output
          console.log(
            chalk.green(`Status: ${chalk.bold(result.status || "success")}`),
          );

          console.log();
          console.log(chalk.cyan.bold("📝 Summary:"));
          console.log(chalk.white(workflowOutput.summary));

          console.log();
          console.log(chalk.cyan.bold("📋 Full Report:"));
          console.log(chalk.dim("─".repeat(Math.min(cliWidth(), 80))));
          console.log(formatResponse("workflow", workflowOutput.report));
        } else if (result?.status === "failed" || result?.error) {
          // Error case
          console.log(chalk.red(`Status: ${chalk.bold("failed")}`));
          const errorMessage =
            typeof result.error === "string"
              ? result.error
              : result.error?.message || "Unknown error";
          console.log(chalk.red(`Error: ${errorMessage}`));
        } else {
          // Unknown result structure - show what we got
          console.log(
            chalk.yellow(
              `Status: ${chalk.bold(result?.status || "completed")}`,
            ),
          );
          console.log();
          console.log(chalk.dim("Raw result:"));
          console.log(chalk.gray(JSON.stringify(result, null, 2)));
        }

        console.log(chalk.dim("─".repeat(Math.min(cliWidth(), 80))));
        console.log();
      } catch (error) {
        spinner.fail(chalk.red.bold("✖ Workflow failed"));
        console.error(
          chalk.red(error instanceof Error ? error.message : String(error)),
        );
        process.exit(1);
      }
    },
  );

program.parse();
