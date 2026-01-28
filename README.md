# Mastra TypeScript Starter Template

A minimal multi-agent solution template with routing, MCP servers, **RAG/memory support**, and custom instructions.

## Features

- **Agent Networks**: Mastra's agent network pattern with intelligent routing and delegation
- **Multi-Agent Architecture**: Router agent coordinates specialized domain agents using LLM reasoning
- **Memory & RAG Support**: Persistent conversation memory with optional pgvector for semantic search
- **MCP Integration**: Example MCP server setup with tool allowlists
- **Persona System**: YAML-based personality configuration
- **Workflows**: Multi-step orchestrations with agent-as-step pattern
- **TypeScript**: Strict mode with Zod schemas
- **Factory Pattern**: Reusable agent/tool/workflow creation utilities

## Quick Start

### Prerequisites

- Node.js v20+
- pnpm v9+

**Or use Dev Container** (recommended):

- Docker Desktop
- VS Code with Dev Containers extension
- Open folder in VS Code → "Reopen in Container"

### Installation

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Run in development mode
pnpm run dev
```

### Usage

Option 1: **Using the CLI with Mastra Client SDK (Recommended)**

The CLI uses the official **Mastra Client SDK** (`@mastra/client-js`) for type-safe, streamlined agent interactions with **streaming support enabled by default**.

```bash
# List all available agents
npm run cli -- list

# Chat with an agent interactively (streaming enabled)
npm run cli -- chat router

# Send a single message with real-time streaming
npm run cli -- chat general -m "Hello!"

# Disable streaming for blocking mode
npm run cli -- chat general -m "Hello!" --no-stream

# Chat with the memory-enabled agent (remembers context)
npm run cli -- chat memory

# Get weather information
npm run cli -- weather "San Francisco" --forecast

# Check server status
npm run cli -- status

# Get help
npm run cli -- --help
```

**Streaming Features:**

- 🌊 Token-by-token real-time responses for faster perceived latency
- 🔧 Progress indicators when agents use tools
- ⚡ See agent reasoning as it happens

See [CLI.md](CLI.md) for complete CLI documentation.

### Memory and RAG Support

This template includes built-in support for persistent memory and RAG (Retrieval-Augmented Generation):

**Memory Agent:**

```bash
# Chat with memory agent (remembers conversation)
npm run cli -- chat memory

# The agent will remember context within the same thread
# Example conversation:
# You: "My name is Alice"
# Agent: "Nice to meet you, Alice!"
# You: "What is my name?"
# Agent: "Your name is Alice!"
```

**RAG Knowledge Base:**

The general agent has access to a knowledge base seeded with technical documentation. Ask questions to see RAG in action:

```bash
# Query about Graviton Wave Theory (from knowledge base)
npm run cli -- chat general -m "What is Graviton Wave Theory?"
npm run cli -- chat general -m "Who discovered gravitons?"
npm run cli -- chat general -m "What is the Thornfield Frequency?"

# Query about Quantum Flux Capacitor technology
npm run cli -- chat general -m "What is the size of a Micro-QFC?"
npm run cli -- chat general -m "What is the energy density of a QFC?"
npm run cli -- chat general -m "What applications use Quantum Flux Capacitors?"

# Query about BioSynth products
npm run cli -- chat general -m "What products does BioSynth offer?"
npm run cli -- chat general -m "Tell me about BioSynth's services"

# The agent uses RAG tools to query the seeded knowledge base
# Documents in knowledge/:
# - graviton-wave-theory.md (physics)
# - quantum-flux-capacitor.md (energy technology)
# - biosynth-products.md (biotechnology)
```

**Multi-Agent Coordination:**

Use the router agent to coordinate multiple agents for complex queries:

```bash
# Router delegates to general (RAG) + weather agents
npm run cli -- chat router -m "What is the location of BioSynth Corporation and what is the weather like there?"

# The router will:
# 1. Delegate to general agent → query knowledge base for BioSynth location
# 2. Delegate to weather agent → get weather for that location
# 3. Synthesize a complete response

# You'll see delegation in action:
#    ➤ Delegating to: general
#    ➤ Delegating to: weather
```

**Debug RAG Queries:**

See what the RAG tool is actually retrieving:

```bash
# Enable debug mode to see tool arguments and results
DEBUG_TOOLS=1 npm run cli -- chat general -m "What is a Micro-QFC?"

# Output will show:
#    ⚡ Using tool: query-knowledge-base
#       Args: { "queryText": "Micro-QFC size specifications", "topK": 5 }
#    ✓ Tool result:
#       {
#         "results": [
#           { "content": "...Micro-QFCs are 2mm³...", "score": 0.89 }
#         ]
#       }
```

The knowledge base is automatically seeded when the server starts and agents can both query and expand it.

See [MEMORY.md](MEMORY.md) for comprehensive guide on:

- Setting up memory-enabled agents
- Using RAG tools for knowledge retrieval
- Creating custom knowledge bases
- Using pgvector for semantic search
- Migrating from LibSQL to PostgreSQL
- RAG implementation patterns

Option 2: **Using the HTTP API**

```bash
# Start the HTTP server
pnpm run dev

# In another terminal, query the agent via Mastra API
curl -X POST http://localhost:3000/api/agents/router/generate \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is the weather like?"}]}'
```

## Project Structure

```txt
.devcontainer/
├── devcontainer.json # Dev container configuration
└── README.md         # Dev container docs
src/
├── mastra/
│   ├── agents/          # Domain-specific agents
│   │   ├── router.ts    # Routes to domain agents
│   │   ├── general.ts   # General conversation
│   │   ├── weather.ts   # Weather domain
│   │   └── memory-agent.ts  # Memory-enabled agent with RAG
│   ├── tools/           # Reusable tools
│   │   └── example-tools.ts
│   ├── workflows/       # Multi-step orchestrations
│   │   └── example-workflow.ts
│   └── index.ts         # Exports
├── mastra.ts            # Mastra instance initialization
├── logger.ts            # Pino logger
└── index.ts             # Express server with @mastra/express
personas/
├── default.yaml         # Default personality
mcp-servers.yaml         # MCP server configuration
MEMORY.md                # RAG/Memory setup and usage guide
```

## Key Concepts

### Agent Network Pattern

This template uses Mastra's **agent network** pattern for intelligent routing and coordination. The router agent uses LLM reasoning to delegate tasks to specialized agents, workflows, and tools based on descriptions and context.

**How it works:**

1. User sends a request to the router agent
2. Router analyzes the request using the LLM
3. Router decides which primitive(s) to invoke (agents, workflows, or tools)
4. Selected primitives execute and return results
5. Router synthesizes the final response

**Network Configuration:**

```typescript
const routerAgent = new Agent({
  id: 'router',
  name: 'Router Agent',
  instructions: 'You are a network coordinator...',
  model: openai('gpt-4o-mini'),
  agents: {
    general: generalAgent,    // Handles conversation, time, units, RAG
    weather: weatherAgent,    // Handles weather queries
  },
  memory: createMemory(),     // Required for networks
});
```

**Agent Descriptions:**

Each agent in the network has a clear `description` that helps the router make intelligent routing decisions:

```typescript
const generalAgent = new Agent({
  id: 'general',
  name: 'General Agent',
  description: `Handles general conversation, greetings, and knowledge base queries.
    Equipped with tools for time operations, unit conversions, and RAG access.`,
  // ...
});
```

**Calling Networks:**

When using the HTTP API, MastraServer automatically handles network routing when you call the router agent:

```bash
# The router will delegate to the appropriate agent based on the query
curl -X POST http://localhost:3000/api/agents/router/generate \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is the weather?"}]}'
```

### Agent Networks vs Direct Agent Calls

**Use the router agent (network pattern) when:**

- You want intelligent routing based on user intent
- The request might need coordination across multiple agents/tools
- You want the LLM to decide which capabilities to use

**Use specialized agents directly when:**

- You know exactly which agent is needed
- You want to bypass routing for specific use cases
- Testing individual agent capabilities

```bash
# Network routing (recommended for most use cases)
pnpm run cli -- chat router -m "What's the weather and what time is it?"

# Direct agent call (for specific scenarios)
pnpm run cli -- chat weather -m "Weather in London?"
pnpm run cli -- chat general -m "What is Mastra?"
```

### Agent Creation

Agents are created with consistent defaults using factory functions:

```typescript
const agent = createAgent({
    name: 'weather',
    instructions: 'You are a weather expert...',
    tools: { getCurrentWeather, getForecast },
});
```

### Tool Definition

Tools use Zod schemas for type-safe inputs/outputs:

```typescript
export const exampleTool = createTool({
    id: 'example-tool',
    description: 'Example tool description',
    inputSchema: z.object({ param: z.string() }),
    outputSchema: z.object({ result: z.string() }),
    execute: async ({ context }) => {
        return { result: 'success' };
    },
});
```

### Workflows

Multi-step orchestrations with agent-as-step pattern:

```typescript
const workflow = createWorkflow({
    id: 'example-workflow',
    inputSchema: z.object({ input: z.string() }),
})
    .then(agentStep)
    .then(toolStep)
    .commit();
```

### MCP Integration

MCP servers provide external capabilities with allowlist enforcement:

```yaml
# mcp-servers.yaml
- name: example-server
  baseUrl: stdio://node path/to/server.js
  allowlist:
      - tool_name_*
      - specific_tool
```

### Persona Configuration

YAML-based personality settings:

```yaml
name: 'Default'
tone: 'professional'
verbosity: 'balanced'
systemPrompt: |
    You are a helpful assistant...
```

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...              # Or other LLM provider
DATABASE_URL=file:./data/app.db    # LibSQL/SQLite storage (default)
# DATABASE_URL=postgresql://...     # PostgreSQL with pgvector (for RAG)

# Optional
LOG_LEVEL=info
PORT=3000
```

See [MEMORY.md](MEMORY.md) for PostgreSQL + pgvector setup instructions.

### Customization

1. **Add new agent**: Create file in `src/mastra/agents/`, add to router network
2. **Add new tool**: Create in `src/mastra/tools/`, add to agent tools
3. **Add workflow**: Create in `src/mastra/workflows/`, register in `mastra.ts`
4. **Modify persona**: Edit `personas/default.yaml`
5. **Add MCP server**: Update `mcp-servers.yaml`

## Development

```bash
# Build for production
pnpm run build

# Run production build
pnpm run start

# Type checking
pnpm run type-check

# Linting
pnpm run lint
```

## Workflows

This template includes a **Research Report Workflow** that demonstrates Mastra's workflow capabilities for multi-step task orchestration.

### What are Workflows?

Workflows let you define complex sequences of tasks using clear, structured steps rather than relying on the reasoning of a single agent. They give you full control over:

- **Step Execution Order**: Define explicit sequences with branching and parallel execution
- **Data Flow**: Type-safe input/output schemas with Zod validation
- **State Management**: Share values across steps without passing through every schema
- **Tool & Agent Integration**: Call tools and agents within workflow steps
- **Streaming**: Monitor progress with real-time step completion events

Use workflows when you have clearly defined multi-step processes that require precise control over execution flow and data transformations.

### Research Report Workflow

The included workflow demonstrates key features:

**Steps:**

1. **Query Knowledge Base** - Searches RAG for information on the topic
2. **Get Metadata** - Retrieves current time and date for the report
3. **Synthesize Report** - Uses the general agent to create a formatted research report

**Features Demonstrated:**

- Multi-step execution with type-safe schemas
- Tool usage (RAG query, time tools)
- Agent integration (general agent for synthesis)
- Workflow state management (tracks execution timestamps)
- Input/output validation with Zod

### Running Workflows via CLI

The CLI provides a `workflow` command:

```bash
# Basic usage with topic (maxResults defaults to 3)
pnpm run dev:cli workflow researchReport --topic "graviton wave theory"

# With custom result count
pnpm run dev:cli workflow researchReport --topic "quantum flux capacitor" --max-results 5

# Using JSON input (more flexible)
pnpm run dev:cli workflow researchReport --input '{"topic": "BioSynth Corporation", "maxResults": 3}'
```

**Output Example:**

```txt
╭─────────────────────────────────────────╮
│   🔄 Workflow: researchReport           │
╰─────────────────────────────────────────╯

📋 Input data:
{
  "topic": "graviton wave theory",
  "maxResults": 3
}

✅ Workflow completed

📄 Result:
────────────────────────────────────────
Status: success

📝 Summary:
This research report examines the theoretical framework of graviton wave manipulation...

📋 Full Report:
────────────────────────────────────────
## Executive Summary

This research report examines the theoretical framework of graviton wave manipulation...

## Overview

Graviton waves represent a revolutionary approach to understanding...

[...full formatted report...]

🔍 Step Execution Details:
────────────────────────────────────────
  • query-knowledge-base: ✓
  • get-metadata: ✓
  • synthesize-report: ✓

📊 Workflow State:
────────────────────────────────────────
{
  "researchStartTime": "2026-01-28T10:30:00.000Z",
  "metadataAddedTime": "2026-01-28T10:30:02.000Z",
  "reportCompletedTime": "2026-01-28T10:30:15.000Z"
}
────────────────────────────────────────
```

### Example Queries

Try these topics to explore the knowledge base through workflows:

```bash
# Graviton Wave Theory
pnpm run dev:cli workflow researchReport --topic "graviton wave theory applications"
pnpm run dev:cli workflow researchReport --topic "graviton wave detection methods"

# Quantum Flux Capacitor
pnpm run dev:cli workflow researchReport --topic "quantum flux capacitor"
pnpm run dev:cli workflow researchReport --topic "Micro-QFC specifications"

# BioSynth Corporation
pnpm run dev:cli workflow researchReport --topic "BioSynth products"
pnpm run dev:cli workflow researchReport --topic "NeuralSync implant features"
```

### Workflow via HTTP API

You can also execute workflows using Mastra's built-in workflow API (via Mastra Client SDK):

```typescript
import { MastraClient } from "@mastra/client-js";

const client = new MastraClient({ baseUrl: "http://localhost:3000" });

// Get and execute workflow
const workflow = client.getWorkflow("researchReport");
const run = await workflow.createRun();
const result = await run.start({
  inputData: {
    topic: "graviton wave theory",
    maxResults: 3,
  },
});

console.log(result);
```

For direct HTTP access, refer to the [Mastra API documentation](https://mastra.ai/docs).

### Creating Custom Workflows

To add your own workflow:

1. **Create the workflow file** in `src/agent/src/mastra/workflows/`:

```typescript
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const step1 = createStep({
  id: "step-1",
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ inputData, mastra }) => {
    // Your step logic here
    // Can call tools: mastra?.tools?.get("tool-name")
    // Can call agents: mastra?.agents?.get("agent-name")
    return { result: inputData.message.toUpperCase() };
  },
});

export const myWorkflow = createWorkflow({
  id: "my-workflow",
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ result: z.string() }),
})
  .then(step1)
  .commit();
```

1. **Register in Mastra** (`src/agent/src/mastra.ts`):

```typescript
import { myWorkflow } from "./mastra/workflows/my-workflow.js";

export const mastra = new Mastra({
  workflows: {
    researchReport: researchReportWorkflow,
    myWorkflow: myWorkflow, // Add here
  },
  // ...
});
```

1. **Execute via CLI**:

```bash
pnpm run dev:cli -- workflow myWorkflow --input '{"message": "hello"}'
```

**Key Features:**

- **Type Safety**: Input/output schemas validated with Zod
- **Tool Access**: Use `mastra?.tools?.get(name)` to call registered tools
- **Agent Access**: Use `mastra?.agents?.get(name)` to call agents
- **State Management**: Add `stateSchema` and use `setState()` to share data
- **Nested Workflows**: Use workflows as steps in larger compositions
- **Error Handling**: Steps can throw errors that halt execution
- **Streaming**: Monitor progress with step-start and step-finish events

See [Mastra Workflow Docs](https://mastra.ai/docs/workflows/overview) for:

- Control flow patterns (branching, parallel execution)
- Suspend & resume for long-running tasks
- Error handling strategies
- Advanced state management
- Testing with Mastra Studio

## Extending This Template

### Add a New Domain Agent

1. Create `src/mastra/agents/your-domain.ts`:

   ```typescript
   import { createAgent } from './factories';

   export const yourDomainAgent = createAgent({
       name: 'your-domain',
       instructions: 'Domain-specific instructions...',
       tools: { /* your tools */ },
   });
   ```

2. Add to router in `src/mastra/agents/router.ts`:

   ```typescript
   network: {
       general: generalAgent,
       weather: weatherAgent,
       yourDomain: yourDomainAgent, // Add here
   }
   ```

### Add Custom MCP Server

1. Create your MCP server (separate project or in this workspace)
2. Add to `mcp-servers.yaml`:

   ```yaml
   - name: your-server
     baseUrl: stdio://node path/to/server.js
     allowlist:
         - your_tool_*
   ```

3. Tools will be automatically available to agents

## Testing

```bash
# Run tests (if configured)
pnpm run test

# Manual testing - Generate with router agent
curl -X POST http://localhost:3000/api/agents/router/generate \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "test query"}], "threadId": "test-123"}'

# Test workflows via CLI
pnpm run dev:cli workflow researchReport --topic "test query"
```

## Resources

- [Mastra Documentation](https://mastra.ai/docs)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## License

MIT
