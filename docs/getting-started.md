# Getting Started with Mastra

Welcome to the Mastra TypeScript starter template! This guide will help you understand how Mastra works by default and get you up and running quickly.

## What is Mastra?

Mastra is a TypeScript framework for building AI agents and workflows. This starter template demonstrates all core Mastra concepts in a ready-to-use application.

## How It Works By Default

### 1. **Agent Networks** - The Core Pattern

Mastra uses an **agent network** pattern where a **router agent** intelligently delegates tasks to specialized agents:

```
User Request → Router Agent → [General Agent | Weather Agent | Memory Agent]
                    ↓
              LLM analyzes request
                    ↓
           Selects best specialist
                    ↓
            Returns their response
```

**How it works:**
- The router agent receives your request
- It uses GPT-4o-mini to analyze which specialist can best help
- It delegates to that agent and returns their response
- All coordination happens automatically

### 2. **Storage** - LibSQL by Default

Out of the box, Mastra uses **LibSQL** (a file-based SQLite variant):

- **Location**: `./data/app.db`
- **Setup**: Zero configuration required
- **Perfect for**: Development, testing, prototyping
- **Stores**: Conversation threads, knowledge base, vectors

**Why LibSQL?**
- No database server needed
- Automatic creation on first run
- Easy to reset: just delete `data/app.db`
- Supports vector operations for RAG

### 3. **Memory & RAG** - Built-in Knowledge

The template includes **automatic knowledge base seeding**:

**On server startup:**
1. Mastra checks if knowledge base exists
2. If not, it loads markdown files from `/knowledge` directory
3. Documents are chunked, embedded, and stored
4. Agents can now search this knowledge via RAG tools

**Knowledge included by default:**
- BioSynth Corporation research
- Quantum Flux Capacitor technology
- Graviton Wave Theory

**How agents use it:**
- Agents have `query-knowledge-base` tool
- When you ask technical questions, they search the knowledge base
- Results are used to provide accurate, grounded answers

### 4. **Tools** - Zod Schema Validated

All tools use **Zod schemas** for type-safe validation:

```typescript
// Example: Weather Tool
inputSchema: z.object({
  location: z.string().describe("City name"),
  units: z.enum(["metric", "imperial"]).default("metric")
})

outputSchema: z.object({
  temperature: z.number(),
  condition: z.string(),
  // ... more fields
})
```

**What this means:**
- Input is validated before execution
- Output matches expected shape
- TypeScript gets full type inference
- Runtime errors are caught early

### 5. **Streaming** - Real-time Responses

The CLI uses **streaming by default** via Mastra Client SDK:

- Responses appear token-by-token
- See tool usage in real-time
- Faster perceived latency
- Use `--no-stream` to disable

## Quick Start

### Install & Run

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 3. Start the server
pnpm run dev
```

### Try It Out

```bash
# Chat with the router (auto-delegates)
pnpm run cli -- chat router -m "What's the weather in London?"

# Chat with memory agent (remembers context)
pnpm run cli -- chat memory

# Ask about knowledge base
pnpm run cli -- chat general -m "Tell me about BioSynth Corporation"

# List all agents
pnpm run cli -- list
```

## Default Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...                  # Your OpenAI API key

# Optional (defaults shown)
DATABASE_URL=file:./data/app.db        # LibSQL file location
PORT=3000                              # Server port
LOG_LEVEL=info                         # Logging verbosity
```

### File Structure

```
mastra-sample/
├── data/              # Created automatically
│   └── app.db        # LibSQL database (auto-created)
├── knowledge/        # Knowledge base markdown files
│   ├── biosynth-corporation.md
│   ├── quantum-flux-capacitor.md
│   └── graviton-wave-theory.md
├── src/agent/
│   ├── agents/       # Agent definitions
│   ├── mastra/
│   │   └── tools/    # Tool definitions (Zod validated)
│   ├── config.ts     # Centralized configuration
│   ├── rag.ts        # RAG setup (embeddings, vectors)
│   └── mastra.ts     # Mastra instance + knowledge seeding
└── docs/             # Documentation
```

## How Defaults Work

### Knowledge Base Seeding

**Automatic on first run:**

```typescript
// In mastra.ts - runs on server start
async function seedKnowledgeBase() {
  // 1. Check if knowledge already seeded
  const existing = await vector.query({ ... });
  if (existing.length > 0) return;
  
  // 2. Load markdown files from /knowledge
  const files = await glob("knowledge/**/*.md");
  
  // 3. Process each file
  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    
    // 4. Chunk the document
    const chunks = await chunker.chunk({ ... });
    
    // 5. Generate embeddings
    const { embeddings } = await embedMany({ ... });
    
    // 6. Store in vector database
    await vector.upsert({ ... });
  }
}
```

### Agent Network Routing

**Router decides which agent to use:**

```typescript
// Router analyzes the request using LLM
const router = new Agent({
  id: "router",
  model: openai("gpt-4o-mini"),
  instructions: `Analyze the request and delegate to:
    - general: for conversations, knowledge queries
    - weather: for weather information  
    - memory: for context-aware conversations
  `
});

// When you send a message
const response = await router.network({
  messages: [{ role: "user", content: "..." }]
});
```

### Tool Execution Flow

1. Agent receives request
2. LLM decides which tool(s) to call
3. Tool input validated with Zod schema
4. Tool executes
5. Tool output validated with Zod schema
6. LLM incorporates result into response

## Next Steps

- **[Memory & RAG Guide](./memory.md)** - Deep dive into memory and knowledge base
- **[Production Setup](./production.md)** - Deploy with PostgreSQL + pgvector
- **[Agent Development](./agents.md)** - Create custom agents
- **[Tool Development](./tools.md)** - Build custom tools

## Common Questions

**Q: Where is data stored?**
A: In `./data/app.db` (LibSQL file). Delete it to reset.

**Q: How do I add knowledge?**
A: Add markdown files to `/knowledge` directory, restart server.

**Q: Can I use PostgreSQL?**
A: Yes! See [Production Setup](./production.md) for pgvector configuration.

**Q: How do I create custom agents?**
A: See [Agent Development](./agents.md) for step-by-step guide.

**Q: Are tools type-safe?**
A: Yes! All tools use Zod schemas for input/output validation.
