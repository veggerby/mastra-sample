# Production Setup Guide

This guide shows you how to deploy the Mastra sample application to production with PostgreSQL and pgvector for optimal performance.

## Production vs Development

### Development (Default)
- **Storage**: LibSQL (file-based SQLite)
- **Location**: `./data/app.db`
- **Vector Search**: LibSQL vector extension
- **Perfect For**: Local development, testing, prototyping

### Production (Recommended)
- **Storage**: PostgreSQL with pgvector
- **Location**: Managed database (AWS RDS, Google Cloud SQL, etc.)
- **Vector Search**: pgvector extension with HNSW indexing
- **Perfect For**: Production deployments, high concurrency, semantic search at scale

## PostgreSQL + pgvector Setup

### Why PostgreSQL + pgvector?

**pgvector** is a PostgreSQL extension that provides:
- 🔍 Fast semantic search with vector similarity
- 🚀 HNSW (Hierarchical Navigable Small World) indexing
- 📊 Production-grade ACID compliance
- 🔗 Integration with existing PostgreSQL infrastructure
- ⚡ Optimized cosine similarity and other distance metrics

### Step 1: Install PostgreSQL

#### Option A: Docker (Recommended for testing)

```bash
docker run -d \
  --name mastra-postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=mastra \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

#### Option B: Managed Service (Recommended for production)

**AWS RDS:**
1. Create PostgreSQL 14+ instance
2. Enable pgvector extension (available on RDS)
3. Note connection details

**Google Cloud SQL:**
1. Create PostgreSQL 14+ instance
2. Enable pgvector extension
3. Note connection details

**Supabase:**
1. Create new project (includes pgvector by default)
2. Get connection string from settings

#### Option C: Self-Hosted

**Ubuntu/Debian:**
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Install pgvector
sudo apt install postgresql-14-pgvector
```

**macOS:**
```bash
# Install PostgreSQL
brew install postgresql

# Install pgvector
brew install pgvector
```

### Step 2: Enable pgvector Extension

Connect to your database:

```bash
psql -h localhost -U postgres -d mastra
```

Enable the extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Step 3: Configure Environment

Update your `.env` file:

```bash
# Production PostgreSQL configuration
DATABASE_URL=******your_password@your-host:5432/mastra

# Vector storage (uses same database)
VECTOR_DATABASE_URL=******your_password@your-host:5432/mastra

# Required
OPENAI_API_KEY=sk-...

# Optional
PORT=3000
LOG_LEVEL=info
NODE_ENV=production
```

### Step 4: Update Code (No Changes Needed!)

The application automatically detects PostgreSQL from `DATABASE_URL`:

```typescript
// src/agent/src/config.ts
// This is already configured in the template!

export const config = {
  database: {
    // Automatically detects PostgreSQL vs LibSQL
    url: process.env.DATABASE_URL || "file:./data/app.db",
    vectorUrl: process.env.VECTOR_DATABASE_URL || 
               process.env.DATABASE_URL || 
               "file:./data/app.db",
  },
};
```

```typescript
// src/agent/src/rag.ts
// Vector store is auto-configured based on DATABASE_URL

const isPostgres = databaseUrl.startsWith("postgres");

export const vector = isPostgres
  ? new PgVector({
      connectionString: databaseUrl,
      dimensions: 1536,
      indexMethod: "hnsw", // Fast approximate search
    })
  : new LibSQLVector({
      url: databaseUrl,
      dimensions: 1536,
    });
```

### Step 5: Deploy and Seed

```bash
# Install dependencies
pnpm install

# Start server (will auto-seed knowledge base)
pnpm run dev

# Or for production
NODE_ENV=production pnpm start
```

The knowledge base will be automatically seeded on first run!

## Performance Optimization

### Create Vector Indexes

For optimal query performance, create HNSW indexes:

```sql
-- Connect to your database
psql -h your-host -U postgres -d mastra

-- Create HNSW index for fast approximate nearest neighbor search
CREATE INDEX ON knowledge_base_vectors 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Verify index
\d knowledge_base_vectors
```

**Index Parameters:**
- `m = 16`: Max connections per layer (higher = more accurate, slower build)
- `ef_construction = 64`: Size of dynamic candidate list (higher = better recall, slower build)

For production, consider:
- `m = 24-32` for better recall
- `ef_construction = 100-200` for higher quality

### Connection Pooling

For high-concurrency deployments, use connection pooling:

```typescript
// src/agent/src/rag.ts
export const vector = new PgVector({
  connectionString: databaseUrl,
  dimensions: 1536,
  indexMethod: "hnsw",
  poolConfig: {
    min: 2,              // Minimum pool size
    max: 10,             // Maximum pool size
    idleTimeoutMillis: 30000,
  },
});
```

### Query Optimization

Tune search parameters for your use case:

```typescript
// In tools/rag-tools.ts
const results = await vector.query({
  indexName: "knowledgeBase",
  queryVector: embedding,
  topK: 8,              // Increase for better recall
  minScore: 0.7,        // Higher = more relevant results
  // HNSW search parameters
  efSearch: 100,        // Higher = more accurate, slower
});
```

## Monitoring and Observability

### Database Metrics

Monitor these PostgreSQL metrics:

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'knowledge_base_vectors';

-- Check table size
SELECT pg_size_pretty(pg_total_relation_size('knowledge_base_vectors'));

-- Monitor active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'mastra';
```

### Application Metrics

Add logging for RAG operations:

```typescript
// In rag-tools.ts
execute: async ({ queryText, topK }) => {
  const startTime = Date.now();
  
  const results = await vector.query({ ... });
  
  const duration = Date.now() - startTime;
  logger.info("RAG query executed", {
    queryText,
    topK,
    resultsCount: results.length,
    durationMs: duration,
  });
  
  return { results };
}
```

## Backup and Recovery

### Automated Backups

**AWS RDS:**
```bash
# Automated daily backups (enabled by default)
# Retention: 7-35 days
# Point-in-time recovery available
```

**Google Cloud SQL:**
```bash
# Automated daily backups
gcloud sql backups create --instance=mastra-db

# List backups
gcloud sql backups list --instance=mastra-db
```

**Self-Hosted:**
```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

pg_dump -h localhost -U postgres mastra | gzip > \
  $BACKUP_DIR/mastra_$DATE.sql.gz

# Keep last 30 days
find $BACKUP_DIR -name "mastra_*.sql.gz" -mtime +30 -delete
```

### Vector Index Rebuild

If you need to rebuild vector indexes:

```sql
-- Drop old index
DROP INDEX IF EXISTS knowledge_base_vectors_embedding_idx;

-- Recreate with optimized parameters
CREATE INDEX knowledge_base_vectors_embedding_idx 
ON knowledge_base_vectors 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 32, ef_construction = 128);
```

## Scaling

### Horizontal Scaling

The application is stateless and can be horizontally scaled:

```yaml
# docker-compose.yml
services:
  mastra-app-1:
    image: mastra-sample:latest
    environment:
      - DATABASE_URL=postgres://...
    ports:
      - "3001:3000"
      
  mastra-app-2:
    image: mastra-sample:latest
    environment:
      - DATABASE_URL=postgres://...
    ports:
      - "3002:3000"
      
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    # Load balance between instances
```

### Database Scaling

For large knowledge bases:

```sql
-- Partition large tables
CREATE TABLE knowledge_base_vectors_2024 
PARTITION OF knowledge_base_vectors 
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Use read replicas for queries
-- Configure read-only connection string
VECTOR_DATABASE_URL_READ=postgres://replica-host:5432/mastra
```

## Security Best Practices

### 1. Use SSL/TLS

```bash
DATABASE_URL=postgres://user:pass@host:5432/mastra?sslmode=require
```

### 2. Restrict Database Access

```sql
-- Create application-specific user
CREATE USER mastra_app WITH PASSWORD 'secure_password';

-- Grant minimal permissions
GRANT CONNECT ON DATABASE mastra TO mastra_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO mastra_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO mastra_app;

-- Revoke unnecessary permissions
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
```

### 3. Use Secrets Management

```bash
# Use environment-specific secrets
# Don't commit .env files!

# AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id mastra/database-url

# Google Secret Manager
gcloud secrets versions access latest --secret="database-url"
```

### 4. Network Security

```bash
# Use VPC for database
# Restrict database to application subnet
# Use security groups/firewall rules
```

## Cost Optimization

### Estimate Costs

**Storage:**
- 1M documents × 1KB = 1GB base data
- 1M vectors × 1536 dims × 4 bytes = 6GB vector data
- Total: ~7GB ≈ $0.70/month (AWS RDS gp2)

**Embeddings:**
- text-embedding-3-small: $0.02 / 1M tokens
- 1M docs × 100 tokens = 100M tokens = $2.00

**Compute:**
- db.t3.small: ~$30/month (AWS RDS)
- App server: ~$10/month (small instance)

**Total for 1M documents: ~$40-45/month**

### Cost Reduction Tips

1. **Use smaller embeddings:**
```typescript
model: "text-embedding-3-small" // 1536 dims
// vs
model: "text-embedding-ada-002" // 1536 dims, slightly cheaper
```

2. **Optimize chunk size:**
```typescript
chunking: {
  maxSize: 512, // Smaller = more chunks = higher cost
  // Increase to 1024-2048 for cost savings
}
```

3. **Cache frequently accessed queries:**
```typescript
const cache = new Map();
const results = cache.get(queryText) || 
                await vector.query({ ... });
```

## Migration Checklist

- [ ] PostgreSQL instance created
- [ ] pgvector extension enabled
- [ ] DATABASE_URL configured
- [ ] SSL/TLS enabled
- [ ] Backup strategy implemented
- [ ] Vector indexes created
- [ ] Connection pooling configured
- [ ] Monitoring set up
- [ ] Security hardened
- [ ] Performance tested

## Troubleshooting

### "Extension vector does not exist"

```sql
-- Check available extensions
SELECT * FROM pg_available_extensions WHERE name = 'vector';

-- Install if not available
CREATE EXTENSION vector;
```

### Slow Vector Queries

```sql
-- Check if index exists
SELECT indexname FROM pg_indexes WHERE tablename = 'knowledge_base_vectors';

-- Create index if missing
CREATE INDEX CONCURRENTLY ON knowledge_base_vectors 
USING hnsw (embedding vector_cosine_ops);
```

### Connection Pool Exhausted

```typescript
// Increase pool size
poolConfig: {
  max: 20, // Increase from 10
}
```

### High Memory Usage

```typescript
// Reduce batch size for embeddings
const BATCH_SIZE = 50; // Reduce from 100
```

## Next Steps

- **[Monitoring Guide](./monitoring.md)** - Set up observability
- **[Security Guide](./security.md)** - Harden your deployment
- **[Performance Tuning](./performance.md)** - Optimize for your workload
