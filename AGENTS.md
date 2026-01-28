# AGENTS.md

## Project Overview

This is a **Mastra TypeScript monorepo** that provides a multi-agent AI system with:

- **Agent Networks**: Uses Mastra's agent network pattern for intelligent routing and coordination
- **Agent API Server** (`src/agent/`): Express-based HTTP API exposing Mastra agents
- **CLI Client** (`src/cli/`): Command-line interface for interacting with the agent API
- **Multi-Agent Architecture**: Router agent uses LLM reasoning to delegate to specialized domain agents (general, weather)
- **Memory & RAG**: Persistent conversation memory with vector-based semantic search and knowledge base retrieval
- **MCP Integration**: Model Context Protocol server integration with tool allowlists
- **Persona System**: YAML-based agent personality configuration
- **Workflows**: Multi-step orchestrations with agent-as-step pattern

**Tech Stack:**

- TypeScript (strict mode)
- Mastra Framework (@mastra/core v1.0.4)
- Express v5 (API server)
- LibSQL (local database)
- Pino (structured logging)
- Zod (schema validation)
- pnpm workspaces + Turbo (monorepo orchestration)

## Setup Commands

### Initial Setup

```bash
# Install all dependencies (uses catalog pattern from pnpm-workspace.yaml)
pnpm install

# Create environment file
cp .env.example .env

# Edit .env with your API keys (especially OPENAI_API_KEY)
nano .env

# Create data directory and install (automated by setup:dev)
pnpm run setup:dev
```

### Environment Variables

Required in `.env`:

- `OPENAI_API_KEY`: Your OpenAI API key for agent LLM calls
- `PORT`: (Optional) API server port, defaults to 3000
- `DATABASE_URL`: (Optional) Database connection, defaults to local LibSQL file

### Package Manager

This project **requires pnpm v9.0.0+**. The catalog pattern in `pnpm-workspace.yaml` centralizes all dependency versions.

## Development Workflow

### Start Development Environment

```bash
# Start agent API server only (runs on port 3000)
pnpm run dev:agent

# Start agent API in background, then use CLI
pnpm run dev:agent &
pnpm run dev:cli -- list

# Start all workspaces in parallel (excludes CLI)
pnpm run dev
```

### Working with Specific Packages

```bash
# Jump to a specific package directory
cd src/agent  # or src/cli

# Run commands in specific workspace from root
pnpm --filter @mastra-starter/agent run dev
pnpm --filter @mastra-starter/cli run build

# Install dependency to specific workspace
pnpm --filter @mastra-starter/agent add <package-name>
```

### Hot Reload

Both packages use `tsx watch` for instant reloading during development:

- **Agent**: Auto-restarts on file changes in `src/agent/src/`
- **CLI**: Requires manual re-execution of CLI commands

### Database

The agent server uses LibSQL with file-based storage at `/workspaces/mastra-starter/data/app.db`. The database is auto-created on first run. To reset:

```bash
rm -f data/app.db
pnpm run dev:agent  # Will recreate database
```

## Testing Instructions

### Run All Tests

```bash
# Type-check all workspaces
pnpm run type-check

# Lint all workspaces
pnpm run lint

# Format check
pnpm run format:check

# Auto-fix formatting
pnpm run format
```

### Per-Package Testing

```bash
# Type-check specific package
pnpm --filter @mastra-starter/agent run type-check
pnpm --filter @mastra-starter/cli run type-check

# Lint specific package
pnpm --filter @mastra-starter/agent run lint
```

### Manual API Testing

```bash
# Start agent server
pnpm run dev:agent

# In another terminal:
# Health check
curl http://localhost:3000/health

# List agents
curl http://localhost:3000/api/agents

# Generate response
curl -X POST http://localhost:3000/api/agents/router/generate \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello!"}]}'

# Test with CLI
pnpm run dev:cli -- chat router -m "What is the weather like?"
pnpm run dev:cli -- list
```

### CI/CD Checks

Before committing, ensure these pass:

```bash
pnpm run type-check  # TypeScript compilation check
pnpm run lint        # ESLint validation
pnpm run format:check # Prettier formatting
pnpm run build       # Production build
```

## Code Style Guidelines

### TypeScript Conventions

- **Strict mode enabled**: `strict: true` in tsconfig.json
- **ES Modules**: Use `.js` extensions in imports (e.g., `import { x } from "./file.js"`)
- **Type safety**: Prefer explicit types over `any`
- **Zod schemas**: Use for runtime validation of external data

### File Organization

```txt
src/
├── agent/
│   └── src/
│       ├── agents/          # Agent definitions (router.ts, general.ts, weather.ts)
│       ├── mastra/
│       │   ├── tools/       # Reusable tools
│       │   └── workflows/   # Multi-step workflows
│       ├── mastra.ts        # Mastra instance configuration
│       ├── logger.ts        # Pino logger setup
│       └── index.ts         # Express server entry point
└── cli/
    └── src/
        └── index.ts         # Commander CLI setup
```

### Naming Conventions

- **Files**: kebab-case (e.g., `example-tools.ts`, `example-workflow.ts`)
- **Classes/Types**: PascalCase (e.g., `Agent`, `WorkflowContext`)
- **Functions/Variables**: camelCase (e.g., `createAgent`, `routerAgent`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_PORT`)

### Import Patterns

```typescript
// Use catalog dependencies from pnpm-workspace.yaml
import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";

// Always use .js extension for local imports (ESM requirement)
import { mastra } from "./mastra.js";
import { logger } from "../logger.js";
```

### Linting Rules

- ESLint configured for TypeScript
- Run `pnpm run lint` to check
- Run `pnpm run format` to auto-fix formatting issues

## Build and Deployment

### Build Commands

```bash
# Build all packages
pnpm run build

# Build specific package
pnpm --filter @mastra-starter/agent run build
pnpm --filter @mastra-starter/cli run build
```

### Build Outputs

- **Agent**: `src/agent/dist/` - Compiled Express server
- **CLI**: `src/cli/dist/` - Compiled CLI binary

### Production Start

```bash
# After building, start production server
cd src/agent
pnpm run start  # Runs: node dist/index.js

# Or from root
pnpm --filter @mastra-starter/agent run start
```

### Environment-Specific Builds

The build uses `tsup` with settings from `tsup.config.ts`. Key features:

- Generates ESM output
- Includes TypeScript declarations (`.d.ts`)
- Minification disabled for debugging
- Source maps included

### Clean Build

```bash
# Remove all build artifacts
pnpm run clean

# Clean specific package
pnpm --filter @mastra-starter/agent run clean
```

## Monorepo Instructions

### Workspace Structure

This monorepo uses **pnpm workspaces** with Turbo for task orchestration.

```txt
./
├── src/
│   ├── agent/          # @mastra-starter/agent
│   └── cli/            # @mastra-starter/cli
├── pnpm-workspace.yaml # Workspace config + dependency catalog
├── turbo.json          # Turbo task pipeline
└── package.json        # Root workspace scripts
```

### Finding Package Names

Check `package.json` in each workspace directory for the `name` field:

- `src/agent/package.json` → `@mastra-starter/agent`
- `src/cli/package.json` → `@mastra-starter/cli`

**Skip the top-level package.json name** - it's just the monorepo root.

### Dependency Management

This repo uses the **catalog pattern** in `pnpm-workspace.yaml`:

- All dependency versions are centralized in the `catalog:` section
- Workspaces reference `"catalog:"` instead of version numbers
- To update a dependency version, edit `pnpm-workspace.yaml` catalog, then run `pnpm install`

```yaml
# pnpm-workspace.yaml
catalog:
  "@mastra/core": ^1.0.4
  express: ^5.1.0
  
# src/agent/package.json
dependencies:
  "@mastra/core": "catalog:"  # Uses version from catalog
```

### Cross-Package Dependencies

Currently, the CLI calls the agent API via HTTP (not direct imports). If you need to share code:

1. Create a new workspace package: `src/shared/`
2. Add it to `pnpm-workspace.yaml`
3. Reference it: `"@mastra-starter/shared": "workspace:*"`

### Selective Building/Testing

```bash
# Build only agent
turbo run build --filter=@mastra-starter/agent

# Type-check only CLI
turbo run type-check --filter=@mastra-starter/cli

# Run task in all workspaces
turbo run lint
```

### Adding a New Workspace

1. Create directory: `src/<new-package>/`
2. Add `package.json` with unique name
3. It's auto-detected (workspace pattern: `src/*`)
4. Run `pnpm install` to register it

## Pull Request Guidelines

### Title Format

```txt
[component] Brief description

Examples:
[agent] Add sentiment analysis tool
[cli] Add streaming support for chat command
[monorepo] Update @mastra/core to v1.0.5
```

### Required Checks Before Submitting

```bash
# Run all these and ensure they pass:
pnpm run type-check
pnpm run lint
pnpm run format:check
pnpm run build

# Test manually:
pnpm run dev:agent  # Start server
pnpm run dev:cli -- list  # Verify CLI works
curl http://localhost:3000/health  # Verify API works
```

### Commit Message Conventions

- Use conventional commits format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- Examples:
  - `feat(agent): add memory persistence to router`
  - `fix(cli): handle empty response from API`
  - `docs(readme): update installation instructions`

### Code Review Process

- All code must be formatted with Prettier before commit
- TypeScript errors must be resolved (no `@ts-ignore` without explanation)
- Add or update tests when changing functionality
- Update AGENTS.md if workflow changes

## Debugging and Troubleshooting

### Common Issues

#### 1. `Cannot find module '@mastra/core'

```bash
# Solution: Reinstall dependencies
pnpm install
```

#### 2. `ELIFECYCLE Command failed` when running dev:agent

```bash
# Solution: Kill existing processes
pnpm run kill
# Or manually:
pkill -f 'tsx.*src/agent'
```

#### 3. Database connection errors

```bash
# Solution: Ensure data directory exists
mkdir -p data
# Or use setup script:
pnpm run setup:dev
```

#### 4. Port 3000 already in use

```bash
# Solution: Change port in .env
echo "PORT=3001" >> .env
# Or kill process using port:
lsof -ti:3000 | xargs kill -9
```

### Logging Patterns

The agent server uses **Pino** for structured logging:

```typescript
import { logger } from "./logger.js";

logger.info({ userId: "123" }, "User action completed");
logger.error({ error }, "Failed to process request");
```

View logs:

```bash
# Development logs are pretty-printed with pino-pretty
pnpm run dev:agent

# Production logs are JSON (pipe to pino-pretty if needed)
pnpm run start | pnpm exec pino-pretty
```

### Debug Configuration

For VS Code debugging, create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Agent Server",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/src/agent",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["run", "dev"],
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Performance Considerations

- **LibSQL database**: File-based storage is suitable for development; consider hosted LibSQL (Turso) for production
- **Agent LLM calls**: Each agent request makes OpenAI API calls - monitor usage and implement caching if needed
- **Memory**: Agents store conversation threads in database - implement cleanup for old threads

## Additional Notes

### MCP Servers

The project includes MCP (Model Context Protocol) server configuration in `mcp-servers.yaml`. Agents can use MCP tools with allowlists defined per agent.

### Persona Configuration

Agent personalities are defined in `personas/` directory using YAML files. Edit `personas/default.yaml` to customize agent behavior.

### Agent Architecture

This project uses **Mastra's agent network pattern** for intelligent task coordination:

- **Router Agent**: Network coordinator with LLM-powered routing
  - Analyzes user requests using GPT-4o-mini
  - Delegates to specialized agents based on descriptions and context
  - Configured with sub-agents: general, weather
  - Includes memory for task history and completion tracking
  - Uses `.network()` method for execution

- **General Agent**: Handles general conversation, knowledge queries, and utilities
  - Description: "Handles general conversation, greetings, and knowledge base queries"
  - Tools: Time operations (UTC, timezone conversion), unit conversions (metric/imperial)
  - RAG: Vector-based knowledge base query tool
  - Memory: Conversation history and semantic recall

- **Weather Agent**: Domain-specific for weather queries
  - Description: "Retrieves real-time weather information for any location"
  - Tools: Weather lookup via wttr.in API
  - Returns: Current conditions, temperature, humidity, wind data

**Network Routing Principles:**

1. Each agent has a clear `description` that guides routing decisions
2. Tools define `inputSchema` and `outputSchema` for type-safe execution
3. The LLM selects primitives based on descriptions, schemas, and context
4. More specific agents are favored when capabilities overlap
5. Memory is required for network execution and tracks task completion

**Example Network Flow:**

```typescript
// User request: "What's the weather and what time is it?"
routerAgent.network("What's the weather and what time is it?")
  → Analyzes request (both weather + time)
  → Calls weather agent for weather data
  → Calls general agent for time data
  → Synthesizes complete response
```

See Mastra docs: <https://mastra.ai/docs/agents/networks>

### Security Notes

- Never commit `.env` file
- Keep API keys in environment variables only
- The Express server includes basic error handling but add authentication for production use
- Database is local file - secure filesystem permissions accordingly

### Getting Help

- Check README.md for user-focused documentation
- Review example agent code in `src/agent/src/agents/`
- Mastra docs: <https://docs.mastra.ai/>
- MCP docs: <https://modelcontextprotocol.io/>

---

*This AGENTS.md follows the open format at <https://agents.md/> for AI coding agent compatibility.*
