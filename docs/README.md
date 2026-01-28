# Documentation Index

Welcome to the Mastra TypeScript starter template documentation!

## Getting Started

New to Mastra? Start here:

- **[Getting Started](./getting-started.md)** - Understand how Mastra works by default and get up and running quickly

## Core Guides

### Development
- **[Creating Agents](./agents.md)** - Build custom agents with Zod-validated configurations
- **[Creating Tools](./tools.md)** - Develop type-safe tools using Zod schemas
- **[Memory & RAG](./memory.md)** - Implement knowledge bases and persistent memory

### Deployment
- **[Production Setup](./production.md)** - Deploy with PostgreSQL + pgvector for production

## Quick Reference

### How Mastra Works By Default

```
┌─────────────┐
│ Your Request │
└──────┬──────┘
       │
       ↓
┌──────────────────┐
│  Router Agent    │  ← GPT-4o-mini analyzes request
│  (Coordinator)   │
└────────┬─────────┘
         │
         ├→ General Agent    (Conversation, knowledge queries)
         ├→ Weather Agent    (Weather information)
         └→ Memory Agent     (Context-aware conversations)
```

### Default Stack

| Component | Technology | Location |
|-----------|-----------|----------|
| **Storage** | LibSQL (SQLite) | `./data/app.db` |
| **Vectors** | LibSQL Vector | Same file |
| **Knowledge** | Markdown files | `./knowledge/` |
| **Embeddings** | OpenAI text-embedding-3-small | API call |
| **LLMs** | OpenAI GPT-4o-mini | API call |
| **Validation** | Zod schemas | Inline in code |

### Key Files

```
src/agent/src/
├── agents/           # Agent definitions
│   ├── router.ts    # Coordinator agent
│   ├── general.ts   # General purpose agent
│   └── weather.ts   # Weather specialist
├── mastra/
│   └── tools/       # Zod-validated tools
│       ├── rag-tools.ts
│       ├── time-tools.ts
│       └── weather-tools.ts
├── config.ts        # Centralized configuration
├── rag.ts           # RAG setup (vectors, embeddings)
└── mastra.ts        # Mastra instance + seeding
```

## Common Tasks

### Add Knowledge to Your Agent

1. Add a markdown file to `/knowledge/`
2. Restart the server
3. Knowledge is automatically embedded and indexed

```bash
echo "# My Knowledge\n\nSome information..." > knowledge/my-topic.md
pnpm run dev
```

### Create a Custom Agent

See **[Creating Agents](./agents.md)** for step-by-step guide.

```typescript
import { Agent } from "@mastra/core/agent";

export const myAgent = new Agent({
  id: "my-agent",
  instructions: "You are...",
  model: openai("gpt-4o-mini"),
  tools: { /* ... */ },
});
```

### Create a Custom Tool

See **[Creating Tools](./tools.md)** for comprehensive guide.

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const myTool = createTool({
  id: "my-tool",
  description: "What it does",
  inputSchema: z.object({ /* ... */ }),
  outputSchema: z.object({ /* ... */ }),
  execute: async (input) => { /* ... */ },
});
```

### Deploy to Production

See **[Production Setup](./production.md)** for complete guide.

```bash
# 1. Set up PostgreSQL with pgvector
docker run -d pgvector/pgvector:pg16

# 2. Update environment
DATABASE_URL=postgres://user:pass@host/mastra

# 3. Deploy
pnpm run build
pnpm start
```

## Architecture Decisions

### Why LibSQL by Default?

- **Zero configuration**: Works out of the box
- **Easy reset**: Delete `data/app.db` to start fresh
- **Perfect for development**: Fast iteration
- **Vector support**: Built-in for RAG
- **Migration path**: Easy to switch to PostgreSQL

### Why Zod Schemas?

- **Runtime validation**: Catch errors at execution time
- **TypeScript inference**: Automatic type safety
- **Self-documenting**: Schemas describe expected data
- **Error messages**: Clear validation errors

### Why Agent Networks?

- **Separation of concerns**: Each agent specializes
- **Maintainability**: Easy to add/remove specialists
- **LLM-driven routing**: Intelligent delegation
- **Scalability**: Distribute agents as needed

## Best Practices

### 1. Tool Design

- ✅ Use Zod schemas for all inputs and outputs
- ✅ Add `.describe()` to help LLM understand parameters
- ✅ Keep tools focused (single responsibility)
- ✅ Test input validation and execution separately

### 2. Agent Instructions

- ✅ Be specific about agent capabilities
- ✅ Include examples in instructions
- ✅ Explain when to use which tools
- ✅ Keep instructions concise but complete

### 3. Knowledge Base

- ✅ Organize by topic (one file per topic)
- ✅ Use clear markdown structure
- ✅ Include metadata in frontmatter
- ✅ Keep chunks under 1024 tokens

### 4. Testing

- ✅ Test tool schemas separately
- ✅ Test tool execution logic
- ✅ Test agent integration end-to-end
- ✅ Use vitest for all tests

## Troubleshooting

### "Cannot find module..."

```bash
pnpm install
```

### Knowledge base not seeding

```bash
# Delete database and restart
rm -rf data/app.db
pnpm run dev
```

### Tool not being called

- Check tool description is clear
- Check input schema matches what LLM would provide
- Add logging to see what LLM is attempting

### Slow queries

- For development: Normal with LibSQL
- For production: Use PostgreSQL with HNSW indexes

## Resources

### Mastra Documentation

- [Mastra.ai Docs](https://mastra.ai/docs) - Official documentation
- [GitHub](https://github.com/mastra-ai/mastra) - Source code and issues

### Related Technologies

- [Zod](https://zod.dev) - Schema validation
- [pgvector](https://github.com/pgvector/pgvector) - Vector extension for PostgreSQL
- [OpenAI](https://platform.openai.com/docs) - LLM provider

## Support

- **Issues**: [GitHub Issues](https://github.com/veggerby/mastra-sample/issues)
- **Discussions**: [GitHub Discussions](https://github.com/veggerby/mastra-sample/discussions)

## Contributing

Contributions welcome! See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
