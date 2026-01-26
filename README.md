# Mastra TypeScript Starter Template

A minimal multi-agent solution template with routing, MCP servers, and custom instructions.

## Features

- **Multi-Agent Architecture**: Router agent that delegates to specialized domain agents
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

Option 1: **Using the CLI (Recommended)**

```bash
# List all available agents
npm run cli -- list

# Chat with an agent interactively
npm run cli -- chat router

# Send a single message
npm run cli -- chat general -m "Hello!"

# Get weather information
npm run cli -- weather "San Francisco" --forecast

# Check server status
npm run cli -- status

# Get help
npm run cli -- --help
```

See [CLI.md](CLI.md) for complete CLI documentation.

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
│   │   └── weather.ts   # Weather domain
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
```

## Key Concepts

### Routing Pattern

The router agent analyzes user intent and delegates to specialized domain agents:

```typescript
const router = createAgent({
    name: 'router',
    instructions: 'Analyze intent and route to appropriate agent',
    network: {
        general: generalAgent,
        weather: weatherAgent,
    },
});
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
DATABASE_URL=file:./data/app.db    # LibSQL/SQLite storage

# Optional
LOG_LEVEL=info
PORT=3000
```

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

# Execute workflow
curl -X POST http://localhost:3000/api/workflows/weather-analysis/execute \
  -H "Content-Type: application/json" \
  -d '{"data": {"location": "San Francisco"}}'
```

## Production Deployment

See AETHER's deployment docs for:

- Docker containerization
- Kubernetes/Helm charts
- Environment configuration
- Monitoring and observability

## Resources

- [Mastra Documentation](https://mastra.ai/docs)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [AETHER Architecture](../../docs/architecture/architecture.md)
- [AETHER Testing Guide](../../docs/testing/testing.md)

## License

Same as AETHER parent project.
