# Creating Custom Agents

This guide shows you how to create custom agents in Mastra using the patterns established in this template.

## Agent Basics

An agent in Mastra is defined using Zod-validated configuration:

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const myAgent = new Agent({
  id: "my-agent",                    // Unique identifier
  name: "My Agent",                  // Display name
  instructions: "You are...",        // System prompt
  model: openai("gpt-4o-mini"),     // LLM model
  tools: { /* optional tools */ },   // Available tools
  memory: myMemory,                  // Optional memory
});
```

## Step-by-Step: Create a Code Review Agent

### 1. Define the Agent File

Create `src/agent/src/agents/code-reviewer.ts`:

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

/**
 * Code Review Agent - Analyzes code and provides feedback
 */
export const codeReviewerAgent = new Agent({
  id: "code-reviewer",
  name: "Code Reviewer",
  instructions: `You are an expert code reviewer with deep knowledge of:
- TypeScript and JavaScript best practices
- Clean code principles
- Security vulnerabilities
- Performance optimization
- Testing strategies

When reviewing code:
1. Identify potential bugs or issues
2. Suggest improvements
3. Highlight security concerns
4. Recommend best practices
5. Be constructive and specific

Format your response with clear sections for each category.`,
  model: openai("gpt-4o-mini"),
  // We'll add tools in step 3
});
```

### 2. Export the Agent

Update `src/agent/src/agents/index.ts`:

```typescript
export { generalAgent } from "./general.js";
export { weatherAgent } from "./weather.js";
export { routerAgent } from "./router.js";
export { codeReviewerAgent } from "./code-reviewer.js"; // Add this
```

### 3. Register with Mastra

Update `src/agent/src/mastra.ts`:

```typescript
import {
  routerAgent,
  generalAgent,
  weatherAgent,
  codeReviewerAgent, // Import
} from "./agents/index.js";

export const mastra = new Mastra({
  agents: {
    router: routerAgent,
    general: generalAgent,
    weather: weatherAgent,
    codeReviewer: codeReviewerAgent, // Register
  },
  storage,
  server: {
    port: Number(process.env.PORT) || 3000,
  },
});
```

### 4. Update Router Agent (Optional)

To make the router delegate to your new agent, update `src/agent/src/agents/router.ts`:

```typescript
instructions: `You are a routing agent that delegates to specialized agents.

Available agents:
- general: General conversation, knowledge queries
- weather: Weather information
- codeReviewer: Code review and analysis  // Add this
- memory: Context-aware conversations

Routing guidelines:
- Code review requests → codeReviewer
- ...
`
```

### 5. Test Your Agent

```bash
# Start server
pnpm run dev

# Test directly
pnpm run cli -- chat codeReviewer -m "Review this function: function add(a,b){return a+b}"

# Test via router
pnpm run cli -- chat router -m "Can you review my code?"
```

## Adding Tools to Agents

### Create a Tool

Create `src/agent/src/mastra/tools/code-analysis-tools.ts`:

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const analyzeComplexityTool = createTool({
  id: "analyze-complexity",
  description: "Analyze code complexity metrics (cyclomatic complexity, LOC, etc.)",
  
  // Input validation with Zod
  inputSchema: z.object({
    code: z.string().describe("The code to analyze"),
    language: z.enum(["javascript", "typescript", "python"])
      .default("typescript")
      .describe("Programming language"),
  }),
  
  // Output validation with Zod
  outputSchema: z.object({
    cyclomaticComplexity: z.number(),
    linesOfCode: z.number(),
    numberOfFunctions: z.number(),
    analysis: z.string(),
  }),
  
  // Execution logic
  execute: async ({ code, language }) => {
    // Simple implementation - you'd use a real complexity analyzer
    const lines = code.split("\n").filter(l => l.trim()).length;
    const functions = (code.match(/function\s+\w+/g) || []).length;
    
    // Estimate cyclomatic complexity (simplified)
    const branches = (code.match(/if|else|for|while|case|catch/g) || []).length;
    const complexity = branches + 1;
    
    return {
      cyclomaticComplexity: complexity,
      linesOfCode: lines,
      numberOfFunctions: functions,
      analysis: `The code has ${complexity} cyclomatic complexity, ` +
                `${lines} lines, and ${functions} functions.`,
    };
  },
});
```

### Add Tool to Agent

Update `src/agent/src/agents/code-reviewer.ts`:

```typescript
import { analyzeComplexityTool } from "../mastra/tools/code-analysis-tools.js";

export const codeReviewerAgent = new Agent({
  id: "code-reviewer",
  name: "Code Reviewer",
  instructions: `...`,
  model: openai("gpt-4o-mini"),
  tools: {
    "analyze-complexity": analyzeComplexityTool,
  },
});
```

Now the agent can call this tool during conversations!

## Adding Memory to Agents

```typescript
import { Memory } from "@mastra/memory";

const agentMemory = new Memory();

export const codeReviewerAgent = new Agent({
  id: "code-reviewer",
  name: "Code Reviewer",
  instructions: `...
  
You have access to conversation history. Reference previous reviews
when providing feedback on iterative improvements.`,
  model: openai("gpt-4o-mini"),
  memory: agentMemory, // Add memory
  tools: { /* ... */ },
});
```

## Agent Network Integration

To create a sub-network of specialists:

```typescript
const seniorReviewer = new Agent({
  id: "senior-reviewer",
  instructions: "You are a senior engineer focusing on architecture...",
  model: openai("gpt-4o"),
});

const securityReviewer = new Agent({
  id: "security-reviewer",
  instructions: "You specialize in security vulnerabilities...",
  model: openai("gpt-4o-mini"),
});

// Coordinator agent with network
const codeReviewCoordinator = new Agent({
  id: "code-review-coordinator",
  instructions: `Coordinate code reviews by delegating to specialists:
  - seniorReviewer: Architecture and design
  - securityReviewer: Security concerns`,
  model: openai("gpt-4o-mini"),
  // Network delegates to sub-agents
});
```

## Testing Your Agent

Create `src/agent/src/agents/code-reviewer.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { codeReviewerAgent } from "./code-reviewer.js";

describe("Code Reviewer Agent", () => {
  it("should be defined with correct properties", () => {
    expect(codeReviewerAgent).toBeDefined();
    expect(codeReviewerAgent.id).toBe("code-reviewer");
    expect(codeReviewerAgent.name).toBe("Code Reviewer");
  });

  it("should have tools configured", () => {
    expect(codeReviewerAgent).toHaveProperty("tools");
  });

  it("should have instructions mentioning code review", async () => {
    const instructions = await codeReviewerAgent.getInstructions({});
    expect(instructions.toLowerCase()).toContain("code");
  });
});
```

Run tests:
```bash
pnpm --filter @mastra-starter/agent run test
```

## Best Practices

### 1. Clear Instructions
```typescript
// ❌ Too vague
instructions: "You help users"

// ✅ Specific and actionable
instructions: `You are a helpful assistant specializing in X.

When helping users:
1. First, understand their goal
2. Break down complex tasks
3. Provide step-by-step guidance
4. Include code examples when relevant

Always be concise and actionable.`
```

### 2. Appropriate Model Selection
```typescript
// For simple tasks
model: openai("gpt-4o-mini")       // Faster, cheaper

// For complex reasoning
model: openai("gpt-4o")            // More capable

// For specific capabilities
model: openai("o1-preview")        // Advanced reasoning
```

### 3. Tool Organization
```typescript
// ✅ Group related tools
tools: {
  // Code analysis
  "analyze-complexity": complexityTool,
  "check-types": typeCheckTool,
  
  // Code formatting
  "format-code": formatTool,
  "lint-code": lintTool,
}
```

### 4. Memory Usage
```typescript
// Use memory when:
// - Agent needs to remember context
// - Building on previous conversations
// - Learning user preferences

// Don't use memory when:
// - Stateless operations
// - One-off queries
// - Performance is critical
```

## Common Patterns

### Pattern 1: Specialist Agent
Focused on one domain, deep expertise:
```typescript
const sqlExpertAgent = new Agent({
  id: "sql-expert",
  instructions: "Expert in SQL optimization and database design...",
  tools: { queryAnalyzer, indexSuggester },
});
```

### Pattern 2: Coordinator Agent
Delegates to specialists:
```typescript
const devOpsAgent = new Agent({
  id: "devops",
  instructions: "Coordinate deployments by delegating to specialists...",
  // Has network of deployment agents
});
```

### Pattern 3: Research Agent
Gathers information before answering:
```typescript
const researchAgent = new Agent({
  id: "researcher",
  instructions: "Research topics thoroughly using knowledge base...",
  tools: { queryKnowledge, searchWeb, analyzeDocuments },
  memory: new Memory(), // Remember research
});
```

## Next Steps

- **[Tool Development](./tools.md)** - Create custom tools
- **[Memory Guide](./memory.md)** - Deep dive into memory
- **[Testing Guide](./testing.md)** - Test your agents
