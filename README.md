# Mastra TypeScript Starter Template

A production-ready multi-agent AI application demonstrating Mastra's core patterns: agent networks, RAG, memory, and Zod-validated tools.

## Features

- **Agent Networks**: Router agent delegates to specialized agents using LLM reasoning
- **RAG & Memory**: Automatic knowledge base seeding with semantic search
- **Type-Safe Tools**: Zod schemas for runtime validation and type inference
- **Production Ready**: LibSQL for development, PostgreSQL+pgvector for production
- **Streaming Support**: Real-time responses via Mastra Client SDK
- **Markdown Rendering**: Automatic terminal-formatted output for markdown responses
- **Comprehensive Testing**: Full test coverage with vitest

## Quick Start

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start server (auto-seeds knowledge base)
pnpm run dev

# In another terminal, try the CLI
pnpm run cli -- chat router -m "What's the weather in London?"
pnpm run cli -- chat general -m "Tell me about BioSynth Corporation"
```

## How It Works By Default

### Agent Network Pattern

```
User Request → Router Agent → [General | Weather | Memory] Agent → Response
                    ↓
            LLM analyzes request
                    ↓
         Delegates to specialist
```

The router agent uses GPT-4o-mini to analyze requests and delegate to the best specialist.

### Storage: LibSQL (Zero Config)

- **Database**: `./data/app.db` (auto-created)
- **Knowledge Base**: Markdown files in `/knowledge/`
- **Vector Search**: Built-in for RAG
- **Migration**: Easy switch to PostgreSQL for production

### RAG: Automatic Knowledge Seeding

On first run, the server:

1. Loads markdown files from `/knowledge/`
2. Chunks and embeds documents
3. Stores vectors for semantic search
4. Agents can now query knowledge via tools

**Included knowledge:**

- BioSynth Corporation research
- Quantum Flux Capacitor technology
- Graviton Wave Theory

### Tools: Zod Schema Validated

All tools use Zod for type-safe validation:

```typescript
createTool({
  id: "my-tool",
  description: "Clear description helps LLM decide when to use this",
  inputSchema: z.object({
    param: z.string().describe("What this parameter does"),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  execute: async (input) => { /* implementation */ },
});
```

## Documentation

Comprehensive guides are available in `/docs/`:

- **[Getting Started](./docs/getting-started.md)** - Understand how Mastra works by default
- **[Creating Agents](./docs/agents.md)** - Build custom agents step-by-step
- **[Creating Tools](./docs/tools.md)** - Develop Zod-validated tools
- **[Memory & RAG](./docs/memory.md)** - Knowledge bases and persistent memory
- **[Production Setup](./docs/production.md)** - Deploy with PostgreSQL + pgvector

📚 See **[Documentation Index](./docs/README.md)** for complete reference.

## CLI Usage

```bash
# List all agents
pnpm run cli -- list

# Chat with agents (streaming by default)
pnpm run cli -- chat router
pnpm run cli -- chat general -m "Hello!"
pnpm run cli -- chat memory   # Remembers context

# Get weather
pnpm run cli -- weather "San Francisco"

# Disable streaming
pnpm run cli -- chat general -m "Hello" --no-stream
```

See **[CLI Documentation](./src/cli/README.md)** for complete reference.

## Project Structure

```
mastra-sample/
├── docs/              # Comprehensive documentation
├── knowledge/         # Knowledge base (markdown files)
├── src/
│   ├── agent/        # Agent application
│   │   ├── agents/   # Agent definitions
│   │   ├── mastra/
│   │   │   └── tools/ # Zod-validated tools
│   │   ├── config.ts  # Centralized configuration
│   │   ├── rag.ts     # RAG setup (vectors, embeddings)
│   │   └── mastra.ts  # Mastra instance + knowledge seeding
│   └── cli/           # CLI client
├── data/              # Created automatically
│   └── app.db        # LibSQL database
└── tests/             # Test files
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @mastra-starter/agent run test
pnpm --filter @mastra-starter/cli run test

# Watch mode
pnpm --filter @mastra-starter/agent run test:watch

# Coverage
pnpm --filter @mastra-starter/agent run test:coverage
```

## Production Deployment

For production deployments with high concurrency and semantic search:

1. **Set up PostgreSQL with pgvector**
2. **Update environment variables**
3. **Deploy**

See **[Production Setup Guide](./docs/production.md)** for detailed instructions.

Quick production setup:

```bash
# 1. PostgreSQL with pgvector
docker run -d pgvector/pgvector:pg16 -e POSTGRES_PASSWORD=pass

# 2. Update .env
DATABASE_URL=postgres://postgres:pass@localhost:5432/mastra

# 3. Deploy
pnpm run build
NODE_ENV=production pnpm start
```

## Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...                  # Your OpenAI API key

# Optional (defaults shown)
DATABASE_URL=file:./data/app.db        # LibSQL file or PostgreSQL connection
PORT=3000                              # Server port
LOG_LEVEL=info                         # Logging verbosity
NODE_ENV=development                   # Environment
```

## Development

```bash
# Install dependencies
pnpm install

# Start dev server with hot reload
pnpm run dev

# Type check
pnpm run type-check

# Lint
pnpm run lint

# Format
pnpm run format

# Build for production
pnpm run build

# Clean build artifacts
pnpm run clean
```

## Key Concepts

### Zod Schemas Everywhere

Every tool uses Zod for runtime validation:

- Input is validated before execution
- Output matches expected shape
- TypeScript gets full type inference
- Runtime errors are caught early

See **[Tool Development Guide](./docs/tools.md)** for patterns and examples.

### Agent Networks

Agents work together via LLM-driven routing:

- Router analyzes requests
- Delegates to specialists
- Specialists have focused expertise
- Results flow back through router

See **[Agent Development Guide](./docs/agents.md)** for creating custom agents.

### RAG by Default

Knowledge base is automatically seeded:

- Markdown files → Chunks → Embeddings → Vector storage
- Agents query knowledge via tools
- Semantic search finds relevant information
- Grounded, factual responses

See **[Memory & RAG Guide](./docs/memory.md)** for advanced usage.

## Common Tasks

### Add Knowledge

```bash
echo "# New Topic\n\nContent here..." > knowledge/new-topic.md
pnpm run dev  # Restarts and seeds new knowledge
```

### Create Custom Agent

See **[Creating Agents](./docs/agents.md)**:

```typescript
// src/agent/src/agents/my-agent.ts
export const myAgent = new Agent({
  id: "my-agent",
  instructions: "You are...",
  model: openai("gpt-4o-mini"),
  tools: { /* ... */ },
});
```

### Create Custom Tool

See **[Creating Tools](./docs/tools.md)**:

```typescript
// src/agent/src/mastra/tools/my-tools.ts
export const myTool = createTool({
  id: "my-tool",
  description: "...",
  inputSchema: z.object({ /* ... */ }),
  outputSchema: z.object({ /* ... */ }),
  execute: async (input) => { /* ... */ },
});
```

## Troubleshooting

**Knowledge base not seeding:**

```bash
rm -rf data/app.db && pnpm run dev
```

**Dependencies issues:**

```bash
rm -rf node_modules pnpm-lock.yaml && pnpm install
```

**Tool not being called:**

- Check tool description is clear and specific
- Verify input schema matches expected LLM output
- Add logging to see what the LLM is attempting

See **[Getting Started Guide](./docs/getting-started.md)** for more troubleshooting tips.

## Resources

- **[Documentation](./docs/README.md)** - Comprehensive guides
- **[Mastra Docs](https://mastra.ai/docs)** - Official Mastra documentation
- **[Zod Documentation](https://zod.dev)** - Schema validation
- **[pgvector](https://github.com/pgvector/pgvector)** - PostgreSQL vector extension

## License

MIT

## Contributing

Contributions welcome! Please read our contributing guidelines first.
