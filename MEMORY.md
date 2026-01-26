# Memory and RAG Support Guide

This guide explains how to use Mastra's memory and RAG (Retrieval-Augmented Generation) capabilities in the sample application.

## Overview

Mastra provides built-in support for:
- **Persistent Memory**: Store and retrieve conversation history across sessions
- **Working Memory**: Maintain context and key facts within a thread
- **Semantic Search**: Use vector embeddings for intelligent context retrieval
- **RAG (Retrieval-Augmented Generation)**: Enhance responses with relevant historical context

## Quick Start

### Using the Memory Agent

The sample includes a pre-configured memory agent that demonstrates these capabilities:

```bash
# Start the agent server
pnpm run dev:agent

# In another terminal, chat with the memory agent
pnpm run dev:cli -- chat memory

# Or via HTTP API
curl -X POST http://localhost:3000/api/agents/memory/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "My name is Alice"}],
    "threadId": "user-123"
  }'

# In a new conversation with the same threadId, the agent remembers
curl -X POST http://localhost:3000/api/agents/memory/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is my name?"}],
    "threadId": "user-123"
  }'
```

## Architecture

### Current Implementation (LibSQL)

By default, the sample uses **LibSQL** (SQLite) for storage:

```typescript
// src/agent/src/mastra.ts
const storage = new LibSQLStore({
  id: "mastra-store",
  url: process.env.DATABASE_URL || "file:./data/app.db",
});
```

**Benefits of LibSQL:**
- ✅ Zero configuration - works out of the box
- ✅ File-based storage - easy to backup and version
- ✅ Perfect for development and prototyping
- ✅ No external dependencies

**Limitations:**
- ❌ No built-in vector search (semantic similarity)
- ❌ Not suitable for high-concurrency production workloads
- ❌ Limited to single-server deployments

### Upgrading to PostgreSQL with pgvector

For production workloads with semantic search capabilities, use **PostgreSQL with pgvector**:

## PostgreSQL + pgvector Setup

### Why pgvector?

**pgvector** is a PostgreSQL extension for vector similarity search. It enables:
- 🔍 Semantic search across conversation history
- 🚀 Fast nearest-neighbor queries for context retrieval
- 📊 Production-grade scalability and reliability
- 🔗 Integration with existing PostgreSQL infrastructure

### Prerequisites

1. PostgreSQL 12+ installed
2. pgvector extension (install from https://github.com/pgvector/pgvector)

### Installation Steps

#### 1. Install pgvector Extension

**On Ubuntu/Debian:**
```bash
sudo apt install postgresql-14-pgvector
```

**On macOS (Homebrew):**
```bash
brew install pgvector
```

**On Docker:**
```bash
docker run -d \
  --name mastra-postgres \
  -e POSTGRES_PASSWORD=mypassword \
  -e POSTGRES_DB=mastra \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

#### 2. Enable pgvector in Your Database

```sql
CREATE DATABASE mastra;
\c mastra
CREATE EXTENSION vector;
```

Verify installation:
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

#### 3. Update Your Application

**Option A: Modify existing mastra.ts** (recommended for this sample)

Update `src/agent/src/mastra.ts`:

```typescript
import { Mastra } from "@mastra/core";
import { PGStore } from "@mastra/pg";
import { routerAgent, generalAgent, weatherAgent, memoryAgent } from "./agents/index.js";
import { logger } from "./logger.js";

// PostgreSQL storage with pgvector support
const storage = new PGStore({
  connectionString: process.env.DATABASE_URL || 
    "postgresql://user:password@localhost:5432/mastra",
});

logger.info("Initializing Mastra with PostgreSQL storage");

export const mastra = new Mastra({
  agents: {
    router: routerAgent,
    general: generalAgent,
    weather: weatherAgent,
    memory: memoryAgent,
  },
  storage,
  server: {
    port: Number(process.env.PORT) || 3000,
  },
});
```

**Option B: Use the provided mastra-pg.ts configuration**

The sample includes a ready-to-use PostgreSQL configuration in `src/agent/src/mastra-pg.ts`.
Simply update `src/agent/src/index.ts` to import from `mastra-pg.js` instead of `mastra.js`:

```typescript
// Change this line:
import { mastra } from "./mastra.js";

// To this:
import { mastra } from "./mastra-pg.js";
```

**Update `.env`:**

```bash
# PostgreSQL connection string
DATABASE_URL=postgresql://username:password@localhost:5432/mastra

# Required for embedding generation
OPENAI_API_KEY=sk-...
```

#### 4. Migrate from LibSQL to PostgreSQL (Optional)

If you have existing data in LibSQL that you want to migrate:

```bash
# Export from LibSQL
sqlite3 data/app.db .dump > backup.sql

# Convert SQLite syntax to PostgreSQL (manual adjustments needed)
# Import into PostgreSQL
psql -d mastra -f converted_backup.sql
```

> **Note:** Schema differences may require manual migration. Consider starting fresh with PostgreSQL for new deployments.

## Memory Configuration

### Basic Memory Setup

```typescript
import { Memory } from "@mastra/memory";
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

const memory = new Memory({
  embedding: {
    provider: "openai",
    model: "text-embedding-3-small", // Fast and cost-effective
    // Alternative: "text-embedding-3-large" for higher accuracy
  },
});

const agent = new Agent({
  id: "my-agent",
  name: "My Agent",
  instructions: "You are a helpful assistant with memory.",
  model: openai("gpt-4o-mini"),
  memory,
});
```

### Advanced Memory Configuration

```typescript
const memory = new Memory({
  embedding: {
    provider: "openai",
    model: "text-embedding-3-small",
  },
  // Customize chunk size for long conversations
  chunkSize: 512, // tokens per chunk (default: 500)
  
  // Enable working memory (persistent context summary)
  workingMemory: {
    enabled: true,
    maxTokens: 2000,
  },
});
```

## Memory API Usage

### Saving Messages

```typescript
await memory.saveMessages({
  messages: [
    { role: "user", content: "My favorite color is blue", threadId: "user-123" },
    { role: "assistant", content: "I'll remember that!", threadId: "user-123" },
  ],
  memoryConfig: {
    resourceId: "user-123",
  },
});
```

### Recalling Conversation History

```typescript
const { messages } = await memory.recall({
  threadId: "user-123",
  limit: 50, // Last 50 messages
});
```

### Semantic Search (pgvector only)

```typescript
const { messages } = await memory.recall({
  threadId: "user-123",
  vectorSearchString: "What did I say about my favorite color?",
  limit: 10,
});
```

### Working Memory

```typescript
// Update working memory (agent builds context over time)
await memory.updateWorkingMemory({
  threadId: "user-123",
  resourceId: "user-123",
  workingMemory: "User's name is Alice. Prefers concise responses.",
});

// Retrieve working memory
const context = await memory.getWorkingMemory({
  threadId: "user-123",
  resourceId: "user-123",
});
```

### Thread Management

```typescript
// List all threads for a user
const threads = await memory.listThreads({
  resourceId: "user-123",
  limit: 20,
});

// Get specific thread
const thread = await memory.getThreadById({
  threadId: "thread-456",
});

// Delete thread
await memory.deleteThread("thread-456");
```

## Best Practices

### 1. Thread ID Strategy

Use meaningful thread IDs to organize conversations:

```typescript
// User-specific threads
threadId: `user-${userId}`

// Session-based threads
threadId: `session-${sessionId}`

// Topic-based threads
threadId: `project-${projectId}-${userId}`
```

### 2. Embedding Model Selection

| Model | Use Case | Cost | Dimensions |
|-------|----------|------|------------|
| `text-embedding-3-small` | General purpose, cost-effective | Low | 1536 |
| `text-embedding-3-large` | High accuracy, production | Medium | 3072 |
| `text-embedding-ada-002` | Legacy compatibility | Low | 1536 |

### 3. Chunk Size Optimization

- **Smaller chunks (256-512 tokens)**: Better for precise retrieval, more embedding costs
- **Larger chunks (1024-2048 tokens)**: Better for context, fewer API calls

### 4. Working Memory Usage

Update working memory periodically to maintain relevant context:

```typescript
// After every 5-10 messages, summarize key points
if (messageCount % 10 === 0) {
  await memory.updateWorkingMemory({
    threadId,
    workingMemory: "Summary of conversation so far...",
  });
}
```

## Performance Considerations

### LibSQL Performance

- **Throughput**: ~1000 reads/sec, ~100 writes/sec (single instance)
- **Latency**: <10ms for local file access
- **Concurrency**: Limited (file locking)

### PostgreSQL + pgvector Performance

- **Throughput**: 10,000+ reads/sec, 1,000+ writes/sec (properly configured)
- **Latency**: 5-50ms (depending on network and query complexity)
- **Concurrency**: Excellent (connection pooling)
- **Vector Search**: Sub-100ms for millions of vectors with proper indexing

### Indexing for pgvector

Create indexes for optimal vector search performance:

```sql
-- Create HNSW index (recommended for large datasets)
CREATE INDEX ON message_embeddings USING hnsw (embedding vector_cosine_ops);

-- Or create IVFFlat index (faster build, slower query)
CREATE INDEX ON message_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

## Troubleshooting

### "Module not found: @mastra/memory"

Ensure dependencies are installed:
```bash
pnpm install
```

### pgvector Extension Not Found

```bash
# Check if extension is installed
psql -d mastra -c "SELECT * FROM pg_available_extensions WHERE name = 'vector';"

# If not available, install pgvector
# See: https://github.com/pgvector/pgvector#installation
```

### Embedding API Errors

Check your OpenAI API key:
```bash
# Verify key is set
echo $OPENAI_API_KEY

# Test API access
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### High Memory Usage

Reduce chunk size and limit recall queries:

```typescript
const memory = new Memory({
  chunkSize: 256, // Smaller chunks
});

const { messages } = await memory.recall({
  threadId: "user-123",
  limit: 20, // Limit results
});
```

## Cost Estimation

### Embedding Costs (OpenAI)

With `text-embedding-3-small` ($0.02 / 1M tokens):

- 100 messages/day × 100 tokens/message = 10k tokens
- Monthly cost: ~$0.006 (negligible)

For 1M messages:
- Cost: ~$2.00/month

### Storage Costs

**LibSQL (Local):**
- Storage: Free (local disk)
- ~1KB per message
- 1M messages ≈ 1GB

**PostgreSQL (Cloud):**
- Example (AWS RDS): $15-50/month for small instance
- Storage: $0.10/GB/month
- 1M messages with embeddings ≈ 5-10GB ≈ $0.50-1.00/month

## Examples

### Example 1: Personal Assistant with Memory

```typescript
import { Memory } from "@mastra/memory";
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

const assistantMemory = new Memory({
  embedding: {
    provider: "openai",
    model: "text-embedding-3-small",
  },
});

const assistant = new Agent({
  id: "personal-assistant",
  instructions: `You are a personal assistant. Remember user preferences, 
important dates, and ongoing projects. Use context from previous conversations 
to provide personalized assistance.`,
  model: openai("gpt-4o-mini"),
  memory: assistantMemory,
});
```

### Example 2: Document Q&A with RAG

```typescript
// Ingest documents
await memory.saveMessages({
  messages: documents.map(doc => ({
    role: "system",
    content: doc.content,
    threadId: "knowledge-base",
  })),
});

// Query with semantic search
const { messages } = await memory.recall({
  threadId: "knowledge-base",
  vectorSearchString: "How do I configure authentication?",
  limit: 5,
});

// Use retrieved context in agent
const response = await agent.generate({
  messages: [
    ...messages.map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: "Explain authentication setup" },
  ],
});
```

### Example 3: Multi-User Support

```typescript
// Different threads for different users
const userId = req.user.id;

await agent.generate({
  messages: [{ role: "user", content: "What were we discussing?" }],
  threadId: `user-${userId}`,
  memoryConfig: {
    resourceId: userId,
  },
});
```

## Migration Checklist

When migrating from LibSQL to PostgreSQL:

- [ ] Install PostgreSQL and pgvector extension
- [ ] Create database and enable vector extension
- [ ] Update `DATABASE_URL` in `.env`
- [ ] Update `src/agent/src/mastra.ts` to use `PGStore`
- [ ] Test connection with `pnpm run dev:agent`
- [ ] (Optional) Migrate existing data from LibSQL
- [ ] Create vector indexes for performance
- [ ] Update backup/restore procedures
- [ ] Monitor performance and costs

## Resources

- [Mastra Documentation](https://mastra.ai/docs)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)

## Support

For issues or questions:
- GitHub Issues: [veggerby/mastra-sample/issues](https://github.com/veggerby/mastra-sample/issues)
- Mastra Discord: [Join here](https://discord.gg/mastra)
